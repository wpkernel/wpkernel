import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { resolveRuntime } from '../resource-data-view/runtime-resolution';
import { useResolvedController } from '../resource-data-view/use-resolved-controller';
import { useStableView } from '../resource-data-view/use-stable-view';
import { useListResult } from '../resource-data-view/use-list-result';
import { createDataViewsRuntime } from '../runtime';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewController,
} from '../types';
import type { ListResponse } from '@wpkernel/core/resource';
import {
	createConfig,
	createWPKernelRuntime,
	createResource,
	createReporter,
	flushDataViews,
} from '../../../tests/ResourceDataView.test-support';

type TestItem = { id: number };
type TestQuery = { search?: string };
type TestResource = ReturnType<typeof createResource<TestItem, TestQuery>>;
type TestConfig = ReturnType<typeof createConfig<TestItem, TestQuery>>;
type MinimalListController = {
	resource?: { useList?: jest.Mock };
	fetchList?: (query: TestQuery) => Promise<ListResponse<TestItem>>;
};

function createStandaloneRuntime(): DataViewsRuntimeContext {
	const preferences = new Map<string, unknown>();
	return createDataViewsRuntime({
		namespace: 'standalone-hooks',
		reporter: createWPKernelRuntime().reporter,
		preferences: {
			get: async (key: string) => preferences.get(key),
			set: async (key: string, value: unknown) => {
				preferences.set(key, value);
			},
			getScopeOrder: () => ['user'],
		},
		emit: jest.fn(),
		invalidate: jest.fn(),
	});
}

describe('resource-data-view runtime resolution', () => {
	it('returns context when provided a DataViews runtime', () => {
		const standalone = createStandaloneRuntime();
		const result = resolveRuntime(standalone, null);
		expect(result.context).toBe(standalone);
		expect(result.wpkernelRuntime).toBeUndefined();
	});

	it('throws when wpk runtime is missing DataViews support', () => {
		const wpk = createWPKernelRuntime();
		delete (wpk as { dataviews?: unknown }).dataviews;
		expect(() => resolveRuntime(wpk, null)).toThrow(
			/missing DataViews support/
		);
	});

	it('uses hook runtime when runtime prop is absent', () => {
		const wpk = createWPKernelRuntime();
		const result = resolveRuntime(undefined, wpk);
		expect(result.wpkernelRuntime).toBe(wpk);
		expect(result.context.namespace).toBe('tests');
	});

	it('throws when no runtime is available', () => {
		expect(() => resolveRuntime(undefined, null)).toThrow(
			/WPKernel UI runtime unavailable/
		);
	});

	it('throws when hook runtime lacks DataViews support', () => {
		const wpk = createWPKernelRuntime();
		delete (wpk as { dataviews?: unknown }).dataviews;
		expect(() => resolveRuntime(undefined, wpk)).toThrow(
			/missing DataViews support/
		);
	});
});

describe('useResolvedController', () => {
	function ControllerHarness({
		controller: controllerProp,
		resource,
		config,
		context,
		fetchList,
		onResolve,
	}: {
		controller?: ResourceDataViewController<TestItem, TestQuery>;
		resource?: TestResource;
		config?: TestConfig;
		context: DataViewsRuntimeContext;
		fetchList?: (query: TestQuery) => Promise<ListResponse<TestItem>>;
		onResolve: (
			controller: ResourceDataViewController<TestItem, TestQuery>
		) => void;
	}) {
		const controller = useResolvedController<TestItem, TestQuery>(
			controllerProp,
			resource,
			config,
			context,
			fetchList
		);

		useEffect(() => {
			onResolve(controller);
		}, [controller, onResolve]);

		return null;
	}

	it('returns the provided controller when supplied', () => {
		const runtime = createWPKernelRuntime();
		const { context } = resolveRuntime(undefined, runtime);
		const resource = createResource<TestItem, TestQuery>({});
		const config = createConfig<TestItem, TestQuery>({});

		const controller: ResourceDataViewController<TestItem, TestQuery> = {
			resource,
			resourceName: 'jobs',
			config,
			queryMapping: config.mapQuery,
			runtime: context.dataviews,
			namespace: context.namespace,
			preferencesKey: 'jobs::tests',
			invalidate: jest.fn(),
			capabilities: undefined,
			fetchList: undefined,
			prefetchList: undefined,
			mapViewToQuery: jest.fn(),
			deriveViewState: jest.fn(() => ({ perPage: 10 }) as never),
			loadStoredView: jest.fn(async () => undefined),
			saveView: jest.fn(async () => undefined),
			emitViewChange: jest.fn(),
			emitRegistered: jest.fn(),
			emitUnregistered: jest.fn(),
			emitAction: jest.fn(),
			emitPermissionDenied: jest.fn(),
			emitFetchFailed: jest.fn(),
			emitBoundaryTransition: jest.fn(),
			getReporter: () => runtime.reporter,
		};

		const onResolve = jest.fn();
		render(
			<ControllerHarness
				controller={controller}
				resource={resource}
				config={config}
				context={context}
				onResolve={onResolve}
			/>
		);

		expect(onResolve).toHaveBeenCalledWith(controller);
	});

	it('creates a controller when resource and config are provided', () => {
		const runtime = createWPKernelRuntime();
		const { context } = resolveRuntime(undefined, runtime);
		const resource = createResource<TestItem, TestQuery>({});
		const config = createConfig<TestItem, TestQuery>({});

		const onResolve = jest.fn();
		render(
			<ControllerHarness
				resource={resource}
				config={config}
				context={context}
				onResolve={onResolve}
			/>
		);

		const resolved = onResolve.mock.calls[0][0];
		expect(resolved.resourceName).toBe('jobs');
		expect(resolved.config).toBe(config);
	});

	it('throws when resource or config are missing', () => {
		const runtime = createWPKernelRuntime();
		const { context } = resolveRuntime(undefined, runtime);
		const errorSpy = jest
			.spyOn(console, 'error')
			.mockImplementation(() => {});

		expect(() =>
			render(
				<ControllerHarness
					resource={undefined}
					config={undefined}
					context={context}
					onResolve={() => {}}
				/>
			)
		).toThrow(/requires a resource and config/);
		expect(errorSpy).toHaveBeenCalled();
		expect(String(errorSpy.mock.calls[0]?.[0])).toContain(
			'ResourceDataView requires a resource and config when controller is not provided.'
		);

		errorSpy.mockRestore();
	});
});

describe('useStableView', () => {
	type Controller = ResourceDataViewController<
		{ id: number },
		{ search?: string }
	>;

	function createController(
		overrides: Partial<Controller> & {
			loadStoredView?: Controller['loadStoredView'];
			saveView?: Controller['saveView'];
			getReporter?: () => ReturnType<Controller['getReporter']>;
		} = {}
	): Controller {
		const reporter = createReporter();
		const config = createConfig<{ id: number }, { search?: string }>({
			defaultView: {
				type: 'table',
				fields: ['title'],
				perPage: 10,
				page: 1,
				layout: { columns: 1 } as Record<string, unknown>,
			},
		});
		return {
			resource: undefined,
			resourceName: 'jobs',
			config: config as Controller['config'],
			queryMapping: config.mapQuery,
			runtime: {} as never,
			namespace: 'tests',
			preferencesKey: 'tests::jobs',
			invalidate: jest.fn(),
			capabilities: undefined,
			fetchList: undefined,
			prefetchList: undefined,
			mapViewToQuery: jest.fn(),
			deriveViewState: jest.fn(() => ({ perPage: 10 }) as never),
			loadStoredView: overrides.loadStoredView ?? (async () => undefined),
			saveView: overrides.saveView ?? (async () => undefined),
			emitViewChange: overrides.emitViewChange ?? jest.fn(),
			emitRegistered: overrides.emitRegistered ?? jest.fn(),
			emitUnregistered: overrides.emitUnregistered ?? jest.fn(),
			emitAction: overrides.emitAction ?? jest.fn(),
			emitPermissionDenied: overrides.emitPermissionDenied ?? jest.fn(),
			emitFetchFailed: overrides.emitFetchFailed ?? jest.fn(),
			emitBoundaryTransition:
				overrides.emitBoundaryTransition ?? jest.fn(),
			getReporter: overrides.getReporter ?? (() => reporter),
		} as Controller;
	}

	function StableViewHarness({
		controller,
		initial,
		onChange,
	}: {
		controller: Controller;
		initial: Controller['config']['defaultView'];
		onChange: (args: {
			view: typeof initial;
			setView: (next: typeof initial) => void;
		}) => void;
	}) {
		const [view, setView] = useStableView(
			controller as unknown as ResourceDataViewController<
				unknown,
				unknown
			>,
			initial
		);

		useEffect(() => {
			onChange({ view: view as typeof initial, setView });
		}, [view, setView, onChange]);

		return null;
	}

	it('restores stored view values when available', async () => {
		const controller = createController({
			loadStoredView: async () => ({
				type: 'table',
				fields: ['title'],
				perPage: 25,
				page: 2,
				layout: { columns: 3 } as Record<string, unknown>,
			}),
		});

		const onChange = jest.fn();
		render(
			<StableViewHarness
				controller={controller}
				initial={controller.config.defaultView}
				onChange={onChange}
			/>
		);

		await flushDataViews();

		const latest = onChange.mock.calls.at(-1)?.[0]?.view;
		expect(latest?.perPage).toBe(25);
		expect(latest?.layout).toEqual({ columns: 3 });
		expect(controller.emitRegistered).toHaveBeenCalledWith(
			controller.preferencesKey
		);
	});

	it('logs when stored view cannot be restored', async () => {
		const reporter = createReporter();
		const controller = createController({
			loadStoredView: async () => {
				throw new Error('boom');
			},
			getReporter: () => reporter,
		});

		const onChange = jest.fn();
		render(
			<StableViewHarness
				controller={controller}
				initial={controller.config.defaultView}
				onChange={onChange}
			/>
		);

		await flushDataViews();

		expect(reporter.debug).toHaveBeenCalledWith(
			'Failed to restore DataViews view state',
			expect.objectContaining({ error: expect.any(Error) })
		);
	});

	it('warns when saving the view fails', async () => {
		const reporter = createReporter();
		const saveView = jest.fn(async () => {
			throw new Error('persist failed');
		});
		const emitViewChange = jest.fn();
		const controller = createController({
			saveView,
			emitViewChange,
			getReporter: () => reporter,
		});

		const onChange = jest.fn();
		render(
			<StableViewHarness
				controller={controller}
				initial={controller.config.defaultView}
				onChange={onChange}
			/>
		);

		await flushDataViews();

		const latest = onChange.mock.calls.at(-1)?.[0];
		expect(latest?.setView).toBeInstanceOf(Function);
		const { setView } = latest!;

		act(() => {
			setView({
				...controller.config.defaultView,
				perPage: 50,
			});
		});
		await flushDataViews();

		expect(reporter.warn).toHaveBeenCalledWith(
			'Failed to persist DataViews view state',
			expect.objectContaining({ error: expect.any(Error) })
		);
		expect(emitViewChange).toHaveBeenCalled();
	});
});

describe('useListResult', () => {
	function ListResultHarness({
		controller,
		fetchList,
		query,
		reporter,
		onChange,
	}: {
		controller: MinimalListController;
		fetchList?: (query: TestQuery) => Promise<ListResponse<TestItem>>;
		query: TestQuery;
		reporter: DataViewsRuntimeContext['reporter'];
		onChange: (value: unknown) => void;
	}) {
		const result = useListResult(
			controller as unknown as ResourceDataViewController<
				TestItem,
				TestQuery
			>,
			fetchList as
				| ((query: TestQuery) => Promise<ListResponse<TestItem>>)
				| undefined,
			query,
			reporter
		);

		useEffect(() => {
			onChange(result);
		}, [result, onChange]);

		return null;
	}

	it('returns resource list data when no fetch is provided', () => {
		const controller: MinimalListController = {
			resource: {
				useList: jest.fn(() => ({
					data: { items: [{ id: 1 }], total: 1 },
					isLoading: false,
				})),
			},
		};
		const reporter = createWPKernelRuntime().reporter;
		const onChange = jest.fn();

		render(
			<ListResultHarness
				controller={controller}
				query={{} as TestQuery}
				reporter={reporter}
				onChange={onChange}
			/>
		);

		expect(onChange.mock.calls.at(-1)?.[0]).toEqual({
			data: { items: [{ id: 1 }], total: 1 },
			isLoading: false,
			status: 'success',
			error: undefined,
		});
	});

	it('falls back to async list state when resource has no list hook', () => {
		const controller: MinimalListController = {
			resource: {
				useList: undefined,
			},
		};
		const reporter = createWPKernelRuntime().reporter;
		const onChange = jest.fn();

		render(
			<ListResultHarness
				controller={controller}
				query={{} as TestQuery}
				reporter={reporter}
				onChange={onChange}
			/>
		);

		expect(onChange.mock.calls.at(-1)?.[0]).toEqual({
			data: undefined,
			isLoading: false,
			status: 'idle',
			error: undefined,
		});
	});
});
