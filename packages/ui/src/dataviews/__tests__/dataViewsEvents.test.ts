import {
	subscribeToDataViewsEvent,
	__TESTING__,
} from '../hooks/dataViewsEvents';
import {
	DATA_VIEWS_EVENT_VIEW_CHANGED,
	type DataViewChangedPayload,
} from '../../runtime/dataviews/events';
import { createWPKernelRuntime } from '../../../tests/ResourceDataView.test-support';

describe('subscribeToDataViewsEvent', () => {
	it('invokes listeners when events fire', () => {
		const runtime = createWPKernelRuntime();
		const listener = jest.fn();
		const unsubscribe = subscribeToDataViewsEvent(
			runtime.dataviews,
			DATA_VIEWS_EVENT_VIEW_CHANGED,
			listener
		);

		const payload: DataViewChangedPayload = {
			resource: 'jobs',
			viewState: {
				fields: [],
				filters: undefined,
				page: 1,
				perPage: 20,
			},
		};

		runtime.dataviews.events.viewChanged(payload);

		expect(listener).toHaveBeenCalledWith(payload);

		unsubscribe();

		listener.mockClear();
		runtime.dataviews.events.viewChanged(payload);
		expect(listener).not.toHaveBeenCalled();
	});

	it('bridges events to WordPress hooks when available', () => {
		const runtime = createWPKernelRuntime();
		const listener = jest.fn();
		const addAction = jest.fn();
		const removeAction = jest.fn();
		const doAction = jest.fn((_: string, payload: unknown) => {
			const callback = addAction.mock.calls.at(-1)?.[2];
			if (typeof callback === 'function') {
				callback(payload);
			}
		});
		__TESTING__.resetWordPressHooksCache();
		const previous = (globalThis as { wp?: unknown }).wp;
		(globalThis as { wp?: { hooks?: unknown } }).wp = {
			hooks: {
				addAction,
				removeAction,
				doAction,
			},
		};

		const unsubscribe = subscribeToDataViewsEvent(
			runtime.dataviews,
			DATA_VIEWS_EVENT_VIEW_CHANGED,
			listener,
			{
				wordpress: {
					namespace: 'tests/dataviews',
					priority: 12,
				},
			}
		);

		expect(addAction).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_VIEW_CHANGED,
			'tests/dataviews',
			expect.any(Function),
			12
		);

		const payload: DataViewChangedPayload = {
			resource: 'jobs',
			viewState: {
				fields: ['name'],
				filters: {},
				page: 1,
				perPage: 20,
			},
		};

		runtime.dataviews.events.viewChanged(payload);

		expect(listener).toHaveBeenCalledWith(payload);
		expect(doAction).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_VIEW_CHANGED,
			payload
		);

		const hookCallback = addAction.mock.calls[0][2];

		unsubscribe();

		expect(removeAction).toHaveBeenCalledWith(
			DATA_VIEWS_EVENT_VIEW_CHANGED,
			'tests/dataviews',
			hookCallback
		);

		(globalThis as { wp?: unknown }).wp = previous;
	});
});
