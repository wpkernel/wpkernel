import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceObject } from '@wpkernel/core/resource';
import {
	WPKernelEventBus,
	type ResourceDefinedEvent,
	getRegisteredResources,
} from '@wpkernel/core/events';
import type {
	ResourceDataViewMenuConfig,
	ResourceDataViewSavedView,
} from '../../dataviews/types';
import type { View } from '@wordpress/dataviews';

import { attachUIBindings } from '../attachUIBindings';
import { DATA_VIEWS_EVENT_REGISTERED } from '../dataviews/events';
import { DATA_VIEWS_METADATA_INVALID } from '../dataviews/metadata';
import {
	createWPKernel,
	createPreferencesRegistry,
	createResourceWithDataView,
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

const mockGetRegisteredResources =
	getRegisteredResources as jest.MockedFunction<
		typeof getRegisteredResources
	>;

describe('attachUIBindings DataViews auto-registration', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		mockGetRegisteredResources.mockReturnValue([]);
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

	it('auto-registers DataViews controllers for existing resources and persists metadata', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);
		const resource = createResourceWithDataView();

		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);
		const controller = dataviews.controllers.get('jobs') as
			| { resourceName: string }
			| undefined;

		expect(controller).toBeDefined();
		expect(controller?.resourceName).toBe('jobs');
		expect(dataviews.registry.get('jobs')).toEqual(
			expect.objectContaining({
				resource: 'jobs',
				metadata: expect.any(Object),
			})
		);

		expect(wpk.emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_REGISTERED,
			expect.objectContaining({
				resource: 'jobs',
			})
		);
	});

	it('updates auto-registered controllers when capability runtime becomes available', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);
		const resource = createResourceWithDataView();

		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);
		const controller = dataviews.controllers.get('jobs') as {
			capabilities?: unknown;
		};

		expect(controller).toBeDefined();
		expect(controller?.capabilities).toBeUndefined();

		const capability = { can: jest.fn() };
		(
			globalThis as {
				__WP_KERNEL_ACTION_RUNTIME__?: { capability?: unknown };
			}
		).__WP_KERNEL_ACTION_RUNTIME__ = { capability };

		expect(controller?.capabilities).toEqual({ capability });
	});

	it('auto-registers DataViews controllers for future resources', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);
		const runtime = attachUIBindings(wpk);
		const resource = createResourceWithDataView();

		events.emit('resource:defined', {
			resource: resource as ResourceObject<unknown, unknown>,
			namespace: 'tests',
		});

		const dataviews = await waitForDataViews(runtime);
		const controller = dataviews.controllers.get('jobs') as
			| { resourceName: string }
			| undefined;

		expect(controller).toBeDefined();
		expect(wpk.emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_REGISTERED,
			expect.objectContaining({
				resource: 'jobs',
			})
		);
	});

	it('skips auto-registration when saved views metadata is malformed', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);
		const reporter = wpk.getReporter() as jest.Mocked<Reporter>;
		const resource = createResourceWithDataView({
			dataviews: {
				views: [
					{
						id: 'all',
						label: 'All jobs',
						view: { type: 'table', fields: ['title'] } as View,
					},
					{
						id: 123,
						label: 'Broken',
						view: { type: 'table', fields: ['title'] } as View,
					} as unknown as ResourceDataViewSavedView,
				],
			},
		});

		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);

		expect(dataviews.controllers.has('jobs')).toBe(false);
		expect(dataviews.registry.has('jobs')).toBe(false);
		expect(reporter.error).toHaveBeenCalledWith(
			'Invalid DataViews metadata',
			expect.objectContaining({
				code: DATA_VIEWS_METADATA_INVALID,
				resource: 'jobs',
				issues: expect.arrayContaining([
					expect.objectContaining({
						path: expect.arrayContaining([
							'ui',
							'admin',
							'view',
							'views',
							1,
							'id',
						]),
					}),
				]),
			})
		);
	});

	it('logs issues when menu metadata is invalid but continues registration', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(events, undefined, registry);
		const reporter = wpk.getReporter() as jest.Mocked<Reporter>;
		const resource = createResourceWithDataView({
			dataviews: {
				screen: {
					component: 'JobsAdminScreen',
					route: '/admin/jobs',
					menu: {
						slug: 123,
						title: 'Jobs',
					} as unknown as ResourceDataViewMenuConfig,
				},
			},
		});

		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(wpk);
		const dataviews = await waitForDataViews(runtime);

		expect(dataviews.controllers.has('jobs')).toBe(true);
		expect(dataviews.registry.has('jobs')).toBe(true);
		expect(reporter.error).not.toHaveBeenCalledWith(
			'Invalid DataViews metadata',
			expect.anything()
		);
	});

	it('skips auto-registration when disabled via options', async () => {
		const events = new WPKernelEventBus();
		const registry = createPreferencesRegistry();
		const wpk = createWPKernel(
			events,
			{ dataviews: { enable: true, autoRegisterResources: false } },
			registry
		);
		const resource = createResourceWithDataView();

		mockGetRegisteredResources.mockReturnValueOnce([
			{ resource, namespace: 'tests' } as ResourceDefinedEvent,
		]);

		const runtime = attachUIBindings(wpk, {
			dataviews: { enable: true, autoRegisterResources: false },
		});
		const dataviews = await waitForDataViews(runtime);

		expect(dataviews.controllers.has('jobs')).toBe(false);
	});
});
