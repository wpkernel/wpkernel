import type { WPKernelUIRuntime } from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceObject } from '@wpkernel/core/resource';
import {
	WPKernelEventBus,
	type ResourceDefinedEvent,
	getRegisteredResources,
} from '@wpkernel/core/events';

import { attachUIBindings } from '../attachUIBindings';
import { attachResourceHooks } from '../../hooks/resource-hooks';
import type { DataViewPreferencesAdapter } from '../dataviews/preferences';
import { defaultPreferencesKey } from '../dataviews/preferences';
import {
	DATA_VIEWS_EVENT_ACTION_TRIGGERED,
	DATA_VIEWS_EVENT_UNREGISTERED,
	DATA_VIEWS_EVENT_VIEW_CHANGED,
} from '../dataviews/events';
import { DataViewsConfigurationError } from '../dataviews/errors';
import {
	createWPKernel,
	createPreferencesRegistry,
	createReporter,
	createReporterWithThrowingChild,
	createReporterWithUndefinedChild,
	type PreferencesRegistry,
	setPreferenceValue,
} from '../test-support/attachUIBindings.test-support';

jest.mock('../../hooks/resource-hooks', () => ({
	attachResourceHooks: jest.fn((resource) => resource),
}));

jest.mock('@wpkernel/core/events', () => {
	const actual = jest.requireActual('@wpkernel/core/events');
	return {
		...actual,
		getRegisteredResources: jest.fn(),
	};
});

const mockAttachResourceHooks = attachResourceHooks as jest.MockedFunction<
	typeof attachResourceHooks
>;
const mockGetRegisteredResources =
	getRegisteredResources as jest.MockedFunction<
		typeof getRegisteredResources
	>;

describe('attachUIBindings runtime behaviour', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockGetRegisteredResources.mockReturnValue([]);
		delete (
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: {
					capability?: WPKernelUIRuntime['capabilities'];
				};
			}
		).__WP_KERNEL_ACTION_RUNTIME__;
	});

	const waitForDataViews = async (
		runtime: ReturnType<typeof attachUIBindings>
	) => {
		for (let attempts = 0; attempts < 5; attempts += 1) {
			if (runtime.dataviews) {
				return runtime.dataviews;
			}
			await Promise.resolve();
		}
		throw new Error('Dataviews runtime was not initialized in time');
	};

	it.skip('attaches hooks for existing and future resources', () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);

		const resourceA = {
			name: 'posts',
			routes: { get: { path: '/posts/:id', method: 'GET' } },
		} as unknown as ResourceObject<unknown, unknown>;
		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource: resourceA, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(wpk);

		expect(runtime.wpk).toBe(wpk);
		expect(runtime.namespace).toBe('tests');
		expect(mockAttachResourceHooks).toHaveBeenCalledWith(
			resourceA,
			runtime
		);

		const resourceB = {
			name: 'users',
			routes: { list: { path: '/users', method: 'GET' } },
		} as unknown as ResourceObject<unknown, unknown>;

		events.emit('resource:defined', {
			resource: resourceB,
			namespace: 'tests',
		});

		expect(mockAttachResourceHooks).toHaveBeenLastCalledWith(
			resourceB,
			runtime
		);
	});

	it.skip('proxies runtime helpers to the kernel', () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, { suspense: true }, registry);

		const runtime = attachUIBindings(wpk, { notices: true });

		expect(runtime.options).toEqual({ notices: true });
		expect(runtime.reporter).toBe(wpk.getReporter());
		expect(runtime.registry).toBe(registry);

		runtime.invalidate?.(['posts']);
		expect(wpk.invalidate).toHaveBeenCalledWith(['posts'], undefined);
	});

	it.skip('lazily resolves capability runtime from global overrides', () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);
		const runtime = attachUIBindings(wpk);

		expect(runtime.capabilities).toBeUndefined();

		const capability = { can: jest.fn() };
		(
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: { capability?: unknown };
			}
		).__WP_KERNEL_ACTION_RUNTIME__ = { capability };

		expect(runtime.capabilities).toEqual({ capability });
	});

	it('handles missing registry without initializing dataviews', async () => {
		const events = new WPKernelEventBus();
		const wpk = createWPKernel(events);

		const originalWp = (window as unknown as { wp?: typeof window.wp }).wp;
		delete (window as unknown as { wp?: typeof window.wp }).wp;

		const runtime = attachUIBindings(wpk);

		try {
			await Promise.resolve();
			expect(runtime.dataviews).toBeUndefined();
		} finally {
			(window as unknown as { wp?: typeof window.wp }).wp = originalWp;
		}
	});

	it('resolves preferences registry from global wp.data when runtime registry missing', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const reporter = createReporter();
		const originalWp = (
			globalThis as { wp?: { data?: PreferencesRegistry } }
		).wp;
		(globalThis as { wp?: { data?: PreferencesRegistry } }).wp = {
			data: registry,
		};

		try {
			const wpk = createWPKernel(events, undefined, undefined, reporter);
			const runtime = attachUIBindings(wpk);
			const dataviews = await waitForDataViews(runtime);
			const key = defaultPreferencesKey('tests', 'global-fallback');

			await dataviews.preferences.set(key, { columns: ['name'] });

			expect(
				registry.__store.get('tests/dataviews/user')?.get(key)
			).toEqual({ columns: ['name'] });
			expect(reporter.debug).toHaveBeenCalledWith(
				'Resolved preferences registry from global wp.data'
			);
		} finally {
			(globalThis as { wp?: { data?: PreferencesRegistry } }).wp =
				originalWp;
		}
	});

	it('skips dataviews initialization when core/preferences store is incomplete', async () => {
		const events = new WPKernelEventBus();
		const registry = {
			select: () => ({}),
			dispatch: () => ({ set: jest.fn() }),
		} as unknown as PreferencesRegistry;
		const wpk = createWPKernel(events, undefined, registry);

		const runtime = attachUIBindings(wpk);

		await Promise.resolve();
		expect(runtime.dataviews).toBeUndefined();
	});

	it('skips dataviews initialization when core/preferences store lacks set action', async () => {
		const events = new WPKernelEventBus();
		const registry = {
			select: () => ({
				get: jest.fn().mockReturnValue(undefined),
			}),
			dispatch: () => ({}),
		} as unknown as PreferencesRegistry;
		const wpk = createWPKernel(events, undefined, registry);

		const runtime = attachUIBindings(wpk);

		await Promise.resolve();
		expect(runtime.dataviews).toBeUndefined();
	});

	it('initializes DataViews runtime with default preferences adapter', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);
		const key = defaultPreferencesKey('tests', 'jobs');

		expect(dataviews.preferences.getScopeOrder()).toEqual([
			'user',
			'role',
			'site',
		]);
		expect(await dataviews.preferences.get(key)).toBeUndefined();

		const preferenceValue = { columns: ['title'] };
		await dataviews.preferences.set(key, preferenceValue);

		expect(registry.__store.get('tests/dataviews/user')?.get(key)).toEqual(
			preferenceValue
		);
	});

	it('resolves preferences using scope precedence', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);
		const key = defaultPreferencesKey('tests', 'reports');

		setPreferenceValue(registry, 'tests/dataviews/role', key, 'role-value');
		setPreferenceValue(registry, 'tests/dataviews/site', key, 'site-value');

		expect(await dataviews.preferences.get(key)).toBe('role-value');

		await dataviews.preferences.set(key, 'user-value');
		expect(await dataviews.preferences.get(key)).toBe('user-value');

		setPreferenceValue(registry, 'tests/dataviews/user', key, undefined);
		expect(await dataviews.preferences.get(key)).toBe('role-value');

		setPreferenceValue(registry, 'tests/dataviews/role', key, undefined);
		expect(await dataviews.preferences.get(key)).toBe('site-value');
	});

	it('respects dataviews enable false option', () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);

		const runtime = attachUIBindings(wpk, {
			dataviews: { enable: false },
		});

		expect(runtime.dataviews).toBeUndefined();
	});

	it('throws when custom preferences adapter is invalid', () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);

		expect(() =>
			attachUIBindings(wpk, {
				dataviews: {
					preferences: {
						// Intentionally invalid adapter to assert validation behaviour
					} as unknown as DataViewPreferencesAdapter,
				},
			})
		).toThrow(DataViewsConfigurationError);
	});

	it('warns and falls back when reporter child throws', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const reporter =
			createReporterWithThrowingChild() as jest.Mocked<Reporter>;
		const wpk = createWPKernel(events, undefined, registry, reporter);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);
		const key = defaultPreferencesKey('tests', 'faulty-reporter');

		await dataviews.preferences.set(key, { columns: ['status'] });

		expect(reporter.warn).toHaveBeenCalledWith(
			'Failed to create reporter child',
			expect.objectContaining({
				namespace: 'ui.dataviews',
				error: expect.any(Error),
			})
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Failed to create reporter child',
			expect.objectContaining({
				namespace: 'preferences',
				error: expect.any(Error),
			})
		);
	});

	it('reuses base reporter when child reporter is unavailable', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const reporter =
			createReporterWithUndefinedChild() as jest.Mocked<Reporter>;
		const wpk = createWPKernel(events, undefined, registry, reporter);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);

		const resourceReporter = dataviews.getResourceReporter('jobs');
		resourceReporter.debug('resource reporter fallback');

		expect(reporter.child).toHaveBeenCalled();
		expect(dataviews.reporter).toBe(reporter);
		expect(reporter.debug).toHaveBeenCalledWith(
			'resource reporter fallback'
		);
	});

	it('reports when DataViews event emission fails', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);
		const reporter = wpk.getReporter() as jest.Mocked<Reporter>;

		(wpk.emit as jest.Mock).mockImplementation(() => {
			throw new Error('emit failure');
		});

		dataviews.events.actionTriggered({
			resource: 'jobs',
			actionId: 'jobs.delete',
			selection: [],
			permitted: true,
		});

		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to emit DataViews event',
			expect.objectContaining({
				event: DATA_VIEWS_EVENT_ACTION_TRIGGERED,
				error: expect.any(Error),
			})
		);
	});

	it('emits DataViews view change and unregistered events', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);
		const reporter = wpk.getReporter() as jest.Mocked<Reporter>;

		dataviews.events.viewChanged({
			resource: 'jobs',
			viewState: {
				fields: ['title'],
				page: 1,
				perPage: 20,
			},
		});

		dataviews.events.unregistered({
			resource: 'jobs',
			preferencesKey: defaultPreferencesKey('tests', 'jobs'),
		});

		expect(wpk.emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_VIEW_CHANGED,
			expect.objectContaining({ resource: 'jobs' })
		);
		expect(wpk.emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_UNREGISTERED,
			expect.objectContaining({ resource: 'jobs' })
		);
		expect(reporter.debug).toHaveBeenCalledWith(
			'Emitted DataViews event',
			expect.objectContaining({ event: DATA_VIEWS_EVENT_VIEW_CHANGED })
		);
	});
});
