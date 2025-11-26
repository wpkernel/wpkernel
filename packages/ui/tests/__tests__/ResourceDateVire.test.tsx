import { render } from '@testing-library/react';
import {
	DataViewsMock,
	createWPKernelRuntime,
	renderWithProvider,
	getLastDataViewsProps,
	renderActionScenario,
	buildActionConfig,
	flushDataViews,
	createAction,
	renderResourceDataView,
	createDataViewsTestController,
	buildListResource,
} from '../ResourceDataView.test-support';
import { act } from 'react';
import { WPKernelUIProvider } from '../../src/runtime';

describe('ResourceDataView test support helpers', () => {
	it('persists preferences through adapter helpers', async () => {
		const runtime = createWPKernelRuntime();
		await runtime.dataviews.preferences.adapter.set('key', 'value');
		expect(await runtime.dataviews.preferences.adapter.get('key')).toBe(
			'value'
		);
		expect(await runtime.dataviews.preferences.get('key')).toBe('value');
		expect(runtime.dataviews.preferences.getScopeOrder()).toEqual([
			'user',
			'role',
			'site',
		]);
	});

	it('renders UI within WPKernelUIProvider', () => {
		const runtime = createWPKernelRuntime();
		const result = renderWithProvider(<div>hello </div>, runtime);
		expect(result.getByText('hello')).toBeTruthy();

		result.rerenderWithProvider(<div>world </div>);
		expect(result.getByText('world')).toBeTruthy();
	});

	it('throws when DataViews was never rendered', () => {
		DataViewsMock.mockClear();
		expect(() => getLastDataViewsProps()).toThrow(
			'DataViews was not rendered'
		);
	});

	it('captures DataViews props from mock calls', () => {
		DataViewsMock.mockClear();
		render(
			<WPKernelUIProvider runtime={createWPKernelRuntime()}>
				{DataViewsMock({
					data: [],
				})}
			</WPKernelUIProvider>
		);
		expect(getLastDataViewsProps()).toEqual({ data: [] });
	});

	it('exposes action entries via the renderActionScenario helper', async () => {
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });

		const { getActionEntries } = renderActionScenario({
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
		});

		await flushDataViews();

		const [entry] = getActionEntries();
		expect(entry).toBeDefined();

		await act(async () => {
			await entry!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(actionImpl).toHaveBeenCalledWith({ selection: ['1'] });
	});

	it('allows multiple actions to be provided', async () => {
		const first = buildActionConfig({ id: 'first' });
		const second = buildActionConfig({ id: 'second' });

		const { getActionEntries } = renderActionScenario({
			actions: [first, second],
		});

		await flushDataViews();

		const entries = getActionEntries();
		expect(entries).toHaveLength(2);
		expect(entries[0]).toBeDefined();
		expect(entries[1]).toBeDefined();
	});

	it('drives DataViews state via the interaction controller', () => {
		const view = renderResourceDataView({
			resource: buildListResource([{ id: 1 }, { id: 2 }]),
		});

		const controller = createDataViewsTestController(view);

		controller.setSelectionFromItems([{ id: 2 }]);
		expect(controller.getProps().selection).toEqual(['2']);

		controller.setSelection([3, '4']);
		expect(controller.getProps().selection).toEqual(['3', '4']);

		controller.clearSelection();
		expect(controller.getProps().selection).toEqual([]);

		controller.updateView({ page: 2 });
		expect(controller.getProps().view).toEqual(
			expect.objectContaining({ page: 2 })
		);

		controller.updateView((current) => ({
			...current,
			perPage: 25,
		}));

		expect(controller.getProps().view).toEqual(
			expect.objectContaining({
				page: 2,
				perPage: 25,
			})
		);
	});
});
