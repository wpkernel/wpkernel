import type { Reporter } from '@wpkernel/core/reporter';
import {
	createDataViewsRuntime,
	ensureControllerRuntime,
	isDataViewsRuntime,
} from '../runtime';
import { DataViewsConfigurationError } from '../../runtime/dataviews/errors';
import {
	DATA_VIEWS_EVENT_ACTION_TRIGGERED,
	DATA_VIEWS_EVENT_REGISTERED,
} from '../../runtime/dataviews/events';
import { createPreferencesRuntime } from '../../runtime/dataviews/preferences';

jest.mock('../../runtime/dataviews/preferences', () => {
	const actual = jest.requireActual('../../runtime/dataviews/preferences');
	return {
		...actual,
		createPreferencesRuntime: jest.fn(actual.createPreferencesRuntime),
	};
});

const mockedCreatePreferencesRuntime =
	createPreferencesRuntime as jest.MockedFunction<
		typeof createPreferencesRuntime
	>;

describe('createDataViewsRuntime', () => {
	function createReporter(overrides: Partial<Reporter> = {}): Reporter {
		const base: Reporter = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn((_namespace: string) => ({
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

	beforeEach(() => {
		mockedCreatePreferencesRuntime.mockClear();
	});

	it('creates a standalone runtime from preferences adapter and emits events', () => {
		const childReporter = createReporter();
		const reporter = createReporter({
			child: jest.fn(() => childReporter),
		});
		const emit = jest.fn();
		const runtime = createDataViewsRuntime({
			namespace: 'tests',
			reporter,
			preferences: {
				get: async () => undefined,
				set: async () => undefined,
				getScopeOrder: () => ['user', 'role', 'site'],
			},
			emit,
		});

		expect(runtime.namespace).toBe('tests');
		expect(isDataViewsRuntime(runtime)).toBe(true);
		expect(mockedCreatePreferencesRuntime).toHaveBeenCalledTimes(1);

		const payload = { resource: 'jobs' };
		runtime.dataviews.events.registered(payload);

		expect(emit).toHaveBeenCalledWith(DATA_VIEWS_EVENT_REGISTERED, payload);
		expect(childReporter.debug).toHaveBeenCalledWith(
			'Standalone DataViews event emitted',
			expect.objectContaining({ eventName: DATA_VIEWS_EVENT_REGISTERED })
		);

		const controllerRuntime = ensureControllerRuntime(runtime.dataviews);
		expect(controllerRuntime.preferences).toBeDefined();
	});

	it('logs and falls back when reporter child creation fails', () => {
		const reporter = createReporter({
			child: jest.fn(() => {
				throw new Error('boom');
			}),
		});
		const emit = jest.fn(() => {
			throw new Error('emit failed');
		});

		const runtime = createDataViewsRuntime({
			namespace: 'tests',
			reporter,
			preferences: createPreferencesRuntime({
				get: async () => undefined,
				set: async () => undefined,
				getScopeOrder: () => ['user'],
			}),
			emit,
		});

		expect(runtime.dataviews.reporter).toBe(reporter);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Failed to create reporter child',
			expect.objectContaining({ namespace: 'ui.dataviews' })
		);

		runtime.dataviews.events.actionTriggered({
			resource: 'jobs',
			actionId: 'delete',
			selection: [],
			permitted: true,
		});

		expect(emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_ACTION_TRIGGERED,
			expect.objectContaining({ actionId: 'delete' })
		);
		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to emit standalone DataViews event',
			expect.objectContaining({
				eventName: DATA_VIEWS_EVENT_ACTION_TRIGGERED,
			})
		);
	});

	it('throws configuration error when namespace is missing', () => {
		const reporter = createReporter();
		expect(() =>
			createDataViewsRuntime({
				namespace: '',
				reporter,
				preferences: createPreferencesRuntime({
					get: async () => undefined,
					set: async () => undefined,
					getScopeOrder: () => ['user'],
				}),
			})
		).toThrow(DataViewsConfigurationError);
	});

	it('validates DataViews runtime candidates', () => {
		const reporter = createReporter();
		const runtime = createDataViewsRuntime({
			namespace: 'tests',
			reporter,
			preferences: createPreferencesRuntime({
				get: async () => undefined,
				set: async () => undefined,
				getScopeOrder: () => ['user'],
			}),
		});

		expect(isDataViewsRuntime(runtime)).toBe(true);
		expect(isDataViewsRuntime({})).toBe(false);
		expect(isDataViewsRuntime(null)).toBe(false);
		expect(() => ensureControllerRuntime({} as never)).toThrow(
			DataViewsConfigurationError
		);
	});
});
