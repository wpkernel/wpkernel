import type { WPKInstance } from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import {
	__TESTING__ as eventsTestUtils,
	createDataViewsEventEmitter,
	DATA_VIEWS_EVENT_ACTION_TRIGGERED,
	DATA_VIEWS_EVENT_REGISTERED,
	DATA_VIEWS_EVENT_UNREGISTERED,
	DATA_VIEWS_EVENT_VIEW_CHANGED,
	type DataViewRegisteredPayload,
} from '../events';

describe('dataviews event emitter', () => {
	it('emits events via wpk and logs debug info', () => {
		const emit = jest.fn();
		const wpk = { emit } as unknown as WPKInstance;
		const reporter: Reporter = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
		} as unknown as Reporter;

		const emitter = createDataViewsEventEmitter(wpk, reporter);
		const payload = { resource: 'jobs' };
		emitter.registered(payload);
		expect(emit).toHaveBeenCalledWith(DATA_VIEWS_EVENT_REGISTERED, payload);
		expect(reporter.debug).toHaveBeenCalledWith('Emitted DataViews event', {
			event: DATA_VIEWS_EVENT_REGISTERED,
			resource: 'jobs',
		});

		const viewPayload = {
			resource: 'jobs',
			viewState: { fields: [], page: 1, perPage: 20 },
		};
		emitter.viewChanged(viewPayload);
		expect(emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_VIEW_CHANGED,
			viewPayload
		);
	});

	it('guards against wpk emit failures', () => {
		const error = new Error('emit failed');
		const wpk = {
			emit: jest.fn(() => {
				throw error;
			}),
		} as unknown as WPKInstance;
		const reporter: Reporter = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
		} as unknown as Reporter;

		const emitter = createDataViewsEventEmitter(wpk, reporter);
		const payload = {
			resource: 'jobs',
			actionId: 'delete',
			selection: [1],
			permitted: true,
		};

		emitter.actionTriggered(payload);
		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to emit DataViews event',
			expect.objectContaining({
				event: DATA_VIEWS_EVENT_ACTION_TRIGGERED,
				error,
			})
		);
	});

	it('exposes raw emit helper for focused tests', () => {
		const { emitEvent } = eventsTestUtils;
		const wpk = {
			emit: jest.fn(() => {
				throw new Error('fail');
			}),
		} as unknown as WPKInstance;
		const reporter: Reporter = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
		} as unknown as Reporter;

		emitEvent(wpk, reporter, DATA_VIEWS_EVENT_UNREGISTERED, {
			resource: 'jobs',
		});
		expect(reporter.error).toHaveBeenCalledWith(
			'Failed to emit DataViews event',
			expect.objectContaining({ event: DATA_VIEWS_EVENT_UNREGISTERED })
		);
	});

	it('omits resource metadata when payload does not include it', () => {
		const { emitEvent } = eventsTestUtils;
		const emit = jest.fn();
		const wpk = { emit } as unknown as WPKInstance;
		const reporter: Reporter = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
		} as unknown as Reporter;

		emitEvent(wpk, reporter, DATA_VIEWS_EVENT_REGISTERED, {
			resource: 'jobs',
		} as DataViewRegisteredPayload);

		expect(emit).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_REGISTERED,
			expect.objectContaining({ resource: 'jobs' })
		);
		expect(reporter.debug).toHaveBeenCalledWith('Emitted DataViews event', {
			event: DATA_VIEWS_EVENT_REGISTERED,
			resource: 'jobs',
		});
	});
});
