import type { Reporter } from '@wpkernel/core/reporter';
import {
	__TESTING__ as runtimeTestUtils,
	createDataViewsRuntime,
	ensureControllerRuntime,
	isDataViewsRuntime,
} from '../runtime';
import { DataViewsConfigurationError } from '../../runtime/dataviews/errors';
import type { DataViewPreferencesRuntime } from '../../runtime/dataviews/preferences';

describe('dataviews runtime helpers', () => {
	const {
		childReporter,
		toPreferencesRuntime,
		createStandaloneEventEmitter,
		createRuntimeSkeleton,
		cloneRuntime,
		DEFAULT_OPTIONS,
	} = runtimeTestUtils;

	function createReporter(overrides: Partial<Reporter> = {}): Reporter {
		const base: Reporter = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn(() => ({
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				child: jest.fn(),
			})),
		} as unknown as Reporter;
		Object.assign(base, overrides);
		return base;
	}

	it('creates reporter children and falls back gracefully', () => {
		const reporter = createReporter();
		const child = childReporter(reporter, 'ns');
		expect(child).not.toBeUndefined();
		expect(reporter.child).toHaveBeenCalledWith('ns');

		const failing = createReporter({
			child: jest.fn(() => {
				throw new Error('boom');
			}),
		});
		const fallback = childReporter(failing, 'ns');
		expect(fallback).toBe(failing);
		expect(failing.warn).toHaveBeenCalledWith(
			'Failed to create reporter child',
			expect.objectContaining({ namespace: 'ns' })
		);
	});

	it('normalizes preferences input to runtime shape', () => {
		const adapter = {
			get: async () => undefined,
			set: async () => undefined,
			getScopeOrder: () => ['user'],
		};
		const runtime = toPreferencesRuntime({
			adapter,
			get: adapter.get,
			set: adapter.set,
			getScopeOrder: adapter.getScopeOrder,
		} as DataViewPreferencesRuntime);
		expect(runtime.adapter).toBe(adapter);

		const delegating = toPreferencesRuntime({
			get: async () => undefined,
			set: async () => undefined,
			getScopeOrder: () => ['user'],
		} as DataViewPreferencesRuntime['adapter']);
		expect(delegating.adapter).toBeDefined();
	});

	it('emits standalone events with safety nets', () => {
		const reporter = createReporter();
		const emit = jest.fn();
		const events = createStandaloneEventEmitter(reporter, emit);
		events.registered({ resource: 'jobs' });
		expect(emit).toHaveBeenCalledWith('ui:dataviews:registered', {
			resource: 'jobs',
		});
		expect(reporter.debug).toHaveBeenCalled();

		const failingReporter = createReporter();
		const failingEmit = jest.fn(() => {
			throw new Error('emit failed');
		});
		const guarded = createStandaloneEventEmitter(
			failingReporter,
			failingEmit
		);
		guarded.viewChanged({
			resource: 'jobs',
			viewState: { fields: [], page: 1, perPage: 20 },
		});
		expect(failingReporter.error).toHaveBeenCalledWith(
			'Failed to emit standalone DataViews event',
			expect.objectContaining({ eventName: 'ui:dataviews:view-changed' })
		);
	});

	it('creates runtime skeletons and clones runtimes with new events', () => {
		const reporter = createReporter();
		const adapterRuntime = {
			adapter: {
				get: async () => undefined,
				set: async () => undefined,
				getScopeOrder: () => ['user'],
			},
			get: async () => undefined,
			set: async () => undefined,
			getScopeOrder: () => ['user'],
		} as unknown as DataViewPreferencesRuntime;
		const skeleton = createRuntimeSkeleton(
			reporter,
			adapterRuntime,
			DEFAULT_OPTIONS
		);
		expect(skeleton.preferences).toBe(adapterRuntime);
		expect(skeleton.registry.size).toBe(0);

		const customEvents = createStandaloneEventEmitter(reporter, jest.fn());
		const cloned = cloneRuntime(skeleton, customEvents);
		expect(cloned.events).toBe(customEvents);
		expect(cloned.registry).toBe(skeleton.registry);
	});

	it('provides access to default runtime options', () => {
		expect(DEFAULT_OPTIONS).toEqual({
			enable: true,
			autoRegisterResources: false,
		});
	});
});

describe('dataviews runtime public factories', () => {
	it('validates runtime inputs and emits events', () => {
		const reporter = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn(() => ({
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				child: jest.fn(),
			})),
		} as unknown as Reporter;

		const runtime = createDataViewsRuntime({
			namespace: 'tests',
			reporter,
			preferences: {
				get: async () => undefined,
				set: async () => undefined,
				getScopeOrder: () => ['user'],
			},
		});

		expect(isDataViewsRuntime(runtime)).toBe(true);
		expect(() => ensureControllerRuntime(runtime.dataviews)).not.toThrow();
		expect(() => ensureControllerRuntime({} as never)).toThrow(
			DataViewsConfigurationError
		);
	});
});
