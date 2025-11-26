import { act, type ComponentProps, type ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { DataViews } from '@wordpress/dataviews';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';
import type { DefinedAction } from '@wpkernel/core/actions';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ListResponse, ResourceObject } from '@wpkernel/core/resource';
import type {
	DataViewsRuntimeContext,
	ResourceDataViewConfig,
	ResourceDataViewController,
	ResourceDataViewActionConfig,
} from '../src/dataviews/types';
import { WPKernelError } from '@wpkernel/core/contracts';
import { WPKernelUIProvider } from '../src/runtime';
import { ResourceDataView } from '../src/dataviews';

jest.mock('@wordpress/dataviews', () => {
	const mockComponent = jest.fn(() => null);
	return {
		__esModule: true,
		DataViews: mockComponent,
	};
});

export const DataViewsMock = DataViews as unknown as jest.Mock;

setReactActEnvironment();

function setReactActEnvironment() {
	(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
}

export function createReporter(): Reporter {
	const reporter = {
		debug: jest.fn(),
		error: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		child: jest.fn(),
	} as unknown as jest.Mocked<Reporter>;
	reporter.child.mockReturnValue(reporter);
	return reporter;
}

type RuntimeWithDataViews = WPKernelUIRuntime & {
	dataviews: NonNullable<WPKernelUIRuntime['dataviews']>;
};

export type { RuntimeWithDataViews };

interface CreateKernelRuntimeOptions {
	registry?: unknown;
}

export function createWPKernelRuntime(
	options: CreateKernelRuntimeOptions = {}
): RuntimeWithDataViews {
	const reporter = createReporter();
	const preferences = new Map<string, unknown>();
	const runtime: RuntimeWithDataViews = {
		kernel: undefined,
		namespace: 'tests',
		reporter,
		registry: options.registry,
		events: {} as never,
		capabilities: undefined,
		invalidate: jest.fn(),
		options: {},
		dataviews: {
			registry: new Map(),
			controllers: new Map(),
			preferences: {
				adapter: {
					get: async (key: string) => preferences.get(key),
					set: async (key: string, value: unknown) => {
						preferences.set(key, value);
					},
				},
				get: async (key: string) => preferences.get(key),
				set: async (key: string, value: unknown) => {
					preferences.set(key, value);
				},
				getScopeOrder: () => ['user', 'role', 'site'],
			},
			events: {
				registered: jest.fn(),
				unregistered: jest.fn(),
				viewChanged: jest.fn(),
				actionTriggered: jest.fn(),
				permissionDenied: jest.fn(),
				fetchFailed: jest.fn(),
				boundaryChanged: jest.fn(),
			},
			reporter,
			options: { enable: true, autoRegisterResources: true },
			getResourceReporter: jest.fn(() => reporter),
		},
	} as unknown as RuntimeWithDataViews;
	return runtime;
}

export function createNoticeRegistry() {
	const createNotice = jest.fn();
	const registry = {
		dispatch: jest.fn((key: string) => {
			if (key === 'core/notices') {
				return { createNotice };
			}
			return {};
		}),
		select: jest.fn(),
		subscribe: jest.fn(),
		registerStore: jest.fn(),
		unregisterStore: jest.fn(),
		use: jest.fn(),
	} as {
		dispatch: jest.Mock;
		[key: string]: unknown;
	};

	return { registry, createNotice };
}

export function renderWithProvider(
	ui: React.ReactElement,
	runtime: WPKernelUIRuntime
): RenderResult & {
	rerenderWithProvider: (
		next: React.ReactElement,
		nextRuntime?: WPKernelUIRuntime
	) => void;
} {
	let result: RenderResult | undefined;
	let providerRuntime = runtime;
	act(() => {
		result = render(
			<WPKernelUIProvider runtime={providerRuntime}>
				{ui}
			</WPKernelUIProvider>
		);
	});

	if (!result) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to render with WPKernelUIProvider',
		});
	}

	const rerenderWithProvider = (
		next: React.ReactElement,
		nextRuntime?: WPKernelUIRuntime
	) => {
		if (nextRuntime) {
			providerRuntime = nextRuntime;
		}
		act(() => {
			result!.rerender(
				<WPKernelUIProvider runtime={providerRuntime}>
					{next}
				</WPKernelUIProvider>
			);
		});
	};

	return Object.assign(result, { rerenderWithProvider });
}

export function createAction(
	impl: jest.Mock,
	options: DefinedAction<unknown, unknown>['options']
): DefinedAction<unknown, unknown> {
	return Object.assign(impl, {
		actionName: 'jobs.action',
		options,
	}) as DefinedAction<unknown, unknown>;
}

export function createResource<TItem, TQuery>(
	overrides: Partial<ResourceObject<TItem, TQuery>> & {
		name?: string;
	}
): ResourceObject<TItem, TQuery> {
	const resource = {
		name: 'jobs',
		useList: jest.fn(),
		prefetchList: jest.fn(),
		invalidate: jest.fn(),
		key: jest.fn(() => ['jobs', 'list']),
		...overrides,
	} as unknown as ResourceObject<TItem, TQuery>;
	return resource;
}

type IdentifiableItem = { id: string | number };

export type DefaultActionInput = { selection: Array<string | number> };

export function buildListResource<
	TItem extends IdentifiableItem,
	TQuery = Record<string, unknown>,
>(
	items: TItem[] = [{ id: 1 } as unknown as TItem],
	overrides: Partial<ResourceObject<TItem, TQuery>> = {}
): ResourceObject<TItem, TQuery> {
	const { useList, ...rest } = overrides;
	const listResolver =
		useList ??
		jest.fn(() => ({
			data: { items, total: items.length },
			isLoading: false,
			error: undefined,
		}));

	return createResource<TItem, TQuery>({
		...rest,
		useList: listResolver as ResourceObject<TItem, TQuery>['useList'],
	});
}

export function buildActionConfig<
	TItem extends IdentifiableItem,
	TInput extends DefaultActionInput = DefaultActionInput,
	TResult = unknown,
>(
	overrides: Partial<
		ResourceDataViewActionConfig<TItem, TInput, TResult>
	> = {}
): ResourceDataViewActionConfig<TItem, TInput, TResult> {
	const baseConfig: ResourceDataViewActionConfig<TItem, TInput, TResult> = {
		id: 'delete',
		action: createAction(jest.fn(), {
			scope: 'crossTab',
			bridged: true,
		}) as ResourceDataViewActionConfig<TItem, TInput, TResult>['action'],
		label: 'Delete',
		supportsBulk: true,
		getActionArgs: (({ selection }) =>
			({ selection }) as TInput) as ResourceDataViewActionConfig<
			TItem,
			TInput,
			TResult
		>['getActionArgs'],
	};

	return {
		...baseConfig,
		...overrides,
	};
}

export function createConfig<TItem, TQuery>(
	overrides: Partial<ResourceDataViewConfig<TItem, TQuery>>
): ResourceDataViewConfig<TItem, TQuery> {
	return {
		fields: [{ id: 'title', label: 'Title' }],
		defaultView: {
			type: 'table',
			fields: ['title'],
			perPage: 10,
			page: 1,
		},
		mapQuery: (state) => ({
			search: (state as { search?: string }).search,
		}),
		...overrides,
	} as ResourceDataViewConfig<TItem, TQuery>;
}

export function getLastDataViewsProps(): ComponentProps<typeof DataViews> {
	const lastCall = DataViewsMock.mock.calls.at(-1);
	if (!lastCall) {
		throw new WPKernelError('DeveloperError', {
			message: 'DataViews was not rendered',
		});
	}
	return lastCall[0] as ComponentProps<typeof DataViews>;
}

export type ResourceDataViewTestProps<TItem, TQuery> = {
	resource?: ResourceObject<TItem, TQuery>;
	config?: ResourceDataViewConfig<TItem, TQuery>;
	controller?: ResourceDataViewController<TItem, TQuery>;
	runtime?: WPKernelUIRuntime | DataViewsRuntimeContext;
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	emptyState?: ReactNode;
};

interface RenderResourceDataViewOptions<TItem, TQuery> {
	runtime?: RuntimeWithDataViews;
	resource?: ResourceObject<TItem, TQuery>;
	config?: ResourceDataViewConfig<TItem, TQuery>;
	props?: Partial<ResourceDataViewTestProps<TItem, TQuery>>;
}

export type RenderResourceDataViewResult<TItem, TQuery> = {
	runtime: RuntimeWithDataViews;
	resource: ResourceObject<TItem, TQuery>;
	config: ResourceDataViewConfig<TItem, TQuery>;
	props: ResourceDataViewTestProps<TItem, TQuery>;
	rerender: (
		nextProps?: Partial<ResourceDataViewTestProps<TItem, TQuery>>,
		options?: { runtime?: RuntimeWithDataViews }
	) => void;
	renderResult: ReturnType<typeof renderWithProvider>;
	getDataViewProps: () => ComponentProps<typeof DataViews>;
};

export async function flushDataViews(iterations = 1) {
	await act(async () => {
		for (let index = 0; index < iterations; index += 1) {
			await Promise.resolve();
		}
	});
}

export function renderResourceDataView<TItem, TQuery>(
	options: RenderResourceDataViewOptions<TItem, TQuery> = {}
): RenderResourceDataViewResult<TItem, TQuery> {
	let runtime = options.runtime ?? createWPKernelRuntime();
	const resource = (options.resource ??
		createResource<TItem, TQuery>({})) as ResourceObject<TItem, TQuery>;
	const config = (options.config ??
		createConfig<TItem, TQuery>({})) as ResourceDataViewConfig<
		TItem,
		TQuery
	>;

	const baseProps: ResourceDataViewTestProps<TItem, TQuery> = {
		resource,
		config,
		...(options.props as
			| ResourceDataViewTestProps<TItem, TQuery>
			| undefined),
	};

	const renderResult = renderWithProvider(
		<ResourceDataView {...baseProps} />,
		runtime
	);

	const viewResult: RenderResourceDataViewResult<TItem, TQuery> = {
		runtime,
		resource,
		config,
		props: baseProps,
		rerender: () => undefined,
		renderResult,
		getDataViewProps: () => getLastDataViewsProps(),
	};

	viewResult.rerender = (
		nextProps?: Partial<ResourceDataViewTestProps<TItem, TQuery>>,
		rerenderOptions?: { runtime?: RuntimeWithDataViews }
	) => {
		if (nextProps) {
			Object.assign(baseProps, nextProps);
		}
		const nextRuntime = rerenderOptions?.runtime ?? runtime;
		if (rerenderOptions?.runtime) {
			runtime = rerenderOptions.runtime;
		}
		renderResult.rerenderWithProvider(
			<ResourceDataView {...baseProps} />,
			nextRuntime
		);
		viewResult.runtime = runtime;
	};

	return viewResult;
}

export type RenderActionScenarioOptions<
	TItem extends IdentifiableItem,
	TQuery,
	TInput extends DefaultActionInput = DefaultActionInput,
	TResult = unknown,
> = {
	runtime?: RuntimeWithDataViews;
	items?: TItem[];
	resource?: ResourceObject<TItem, TQuery>;
	resourceOverrides?: Partial<ResourceObject<TItem, TQuery>>;
	action?: Partial<ResourceDataViewActionConfig<TItem, TInput, TResult>>;
	actions?: Array<ResourceDataViewActionConfig<TItem, TInput, TResult>>;
	configOverrides?: Partial<ResourceDataViewConfig<TItem, TQuery>>;
	props?: Partial<ResourceDataViewTestProps<TItem, TQuery>>;
};

export type DataViewActionEntry<TItem> = {
	callback: (
		items: TItem[],
		context: { onActionPerformed?: jest.Mock }
	) => Promise<unknown>;
	disabled?: boolean;
};

function getActionEntries<TItem>(
	getDataViewProps: () => { actions?: unknown }
): DataViewActionEntry<TItem>[] {
	const props = getDataViewProps();
	return (props.actions ?? []) as unknown as DataViewActionEntry<TItem>[];
}

export type RenderActionScenarioResult<
	TItem extends IdentifiableItem,
	TQuery,
	TInput extends DefaultActionInput = DefaultActionInput,
	TResult = unknown,
> = RenderResourceDataViewResult<TItem, TQuery> & {
	runtime: RuntimeWithDataViews;
	resource: ResourceObject<TItem, TQuery>;
	config: ResourceDataViewConfig<TItem, TQuery>;
	actions: Array<ResourceDataViewActionConfig<TItem, TInput, TResult>>;
	getActionEntries: () => DataViewActionEntry<TItem>[];
};

export function renderActionScenario<
	TItem extends IdentifiableItem,
	TQuery = Record<string, unknown>,
	TInput extends DefaultActionInput = DefaultActionInput,
	TResult = unknown,
>(
	options: RenderActionScenarioOptions<TItem, TQuery, TInput, TResult> = {}
): RenderActionScenarioResult<TItem, TQuery, TInput, TResult> {
	const runtime = options.runtime ?? createWPKernelRuntime();
	const resource =
		options.resource ??
		buildListResource<TItem, TQuery>(
			options.items,
			options.resourceOverrides ?? {}
		);
	const scenarioActions = options.actions ?? [
		buildActionConfig<TItem, TInput, TResult>({
			...(options.action as Partial<
				ResourceDataViewActionConfig<TItem, TInput, TResult>
			>),
		}),
	];
	const config = createConfig<TItem, TQuery>({
		actions: scenarioActions as Array<
			ResourceDataViewActionConfig<TItem, unknown, unknown>
		>,
		...(options.configOverrides as Partial<
			ResourceDataViewConfig<TItem, TQuery>
		>),
	});
	const view = renderResourceDataView<TItem, TQuery>({
		runtime,
		resource,
		config,
		props: options.props,
	});

	return {
		...view,
		runtime,
		resource,
		config,
		actions: scenarioActions,
		getActionEntries: () => getActionEntries<TItem>(view.getDataViewProps),
	};
}

type ExtractDataViewView = ComponentProps<typeof DataViews>['view'];

type ViewUpdater =
	| Partial<ExtractDataViewView>
	| ((current: ExtractDataViewView) => ExtractDataViewView);

export type DataViewsTestController<TItem> = {
	getProps: () => ComponentProps<typeof DataViews>;
	setSelection: (ids: Array<string | number>) => void;
	setSelectionFromItems: (items: TItem[]) => void;
	clearSelection: () => void;
	updateView: (updater: ViewUpdater) => void;
};

function ensureHandler<T>(handler: T | undefined, name: string): T {
	if (!handler) {
		throw new WPKernelError('DeveloperError', {
			message: `Expected ${name} to be provided by DataViews mock`,
		});
	}
	return handler;
}

function resolveNextView(
	current: ExtractDataViewView,
	updater: ViewUpdater
): ExtractDataViewView {
	if (typeof updater === 'function') {
		return updater(current);
	}
	return { ...current, ...updater } as ExtractDataViewView;
}

export function createDataViewsTestController<TItem, TQuery>(
	result: RenderResourceDataViewResult<TItem, TQuery>
): DataViewsTestController<TItem> {
	const getProps = result.getDataViewProps;

	const updateView = (updater: ViewUpdater) => {
		const { view, onChangeView } = getProps();
		const handler = ensureHandler(onChangeView, 'onChangeView');
		const nextView = resolveNextView(view, updater);
		act(() => {
			handler(nextView);
		});
	};

	const applySelection = (selection: string[]) => {
		const { onChangeSelection } = getProps();
		const handler = ensureHandler(onChangeSelection, 'onChangeSelection');
		act(() => {
			handler(selection);
		});
	};

	const setSelection = (ids: Array<string | number>) => {
		applySelection(ids.map((id) => String(id)));
	};

	const setSelectionFromItems = (items: TItem[]) => {
		const { getItemId } = getProps();
		const toId = (item: TItem) => {
			if (getItemId) {
				const value = getItemId(item);
				return typeof value === 'undefined' ? '' : String(value);
			}
			const fallback = (item as unknown as { id?: string | number }).id;
			return typeof fallback === 'undefined' ? '' : String(fallback);
		};
		setSelection(items.map(toId));
	};

	const clearSelection = () => {
		applySelection([]);
	};

	return {
		getProps,
		setSelection,
		setSelectionFromItems,
		clearSelection,
		updateView,
	};
}
