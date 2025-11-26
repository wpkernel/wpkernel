import type { ReactNode } from 'react';
import type { Action, Field, View } from '@wordpress/dataviews';
import type { DefinedAction } from '@wpkernel/core/actions';
import type {
	CacheKeyPattern,
	InvalidateOptions,
	ResourceObject,
	ListResponse,
	ResourceDataViewsMenuConfig,
} from '@wpkernel/core/resource';
import type { WPKUICapabilityRuntime } from '@wpkernel/core/data';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	DataViewChangedPayload,
	DataViewsEventEmitter,
	DataViewPermissionDeniedPayload,
	DataViewFetchFailedPayload,
	DataViewBoundaryTransitionPayload,
} from '../runtime/dataviews/events';
import type {
	DataViewPreferencesRuntime,
	DataViewPreferencesAdapter,
} from '../runtime/dataviews/preferences';
import type {
	WPKernelDataViewsRuntime,
	NormalizedDataViewsRuntimeOptions,
} from '../runtime/dataviews/runtime';

/**
 * Mapping function transforming DataViews state into resource queries.
 */
export type QueryMapping<TQuery> = (
	state: DataViewChangedPayload['viewState']
) => TQuery;

/**
 * Context passed to DataViews controllers for logging and event emission.
 * @public
 */
export interface DataViewsControllerRuntime {
	readonly registry: Map<string, unknown>;
	readonly controllers: Map<string, unknown>;
	readonly preferences: DataViewPreferencesRuntime;
	readonly events: DataViewsEventEmitter;
	readonly reporter: Reporter;
	readonly options: NormalizedDataViewsRuntimeOptions;
	readonly getResourceReporter: (resource: string) => Reporter;
}

/**
 * Runtime shape exposed to UI consumers (kernel or standalone).
 */
export interface DataViewsRuntimeContext {
	readonly namespace: string;
	readonly dataviews: DataViewsControllerRuntime;
	readonly capabilities?: WPKUICapabilityRuntime;
	readonly invalidate?: (
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: InvalidateOptions
	) => void;
	readonly registry?: unknown;
	readonly reporter: Reporter;
	readonly wpk?: unknown;
}

/**
 * Action configuration for ResourceDataView.
 */
export interface ResourceDataViewActionConfig<
	TItem,
	TInput,
	TResult = unknown,
> {
	/** Unique identifier, mirrored in events. */
	id: string;
	/** Action implementation to invoke. */
	action: DefinedAction<TInput, TResult>;
	/** Label shown in DataViews UI. */
	label: Action<TItem>['label'];
	/** Whether bulk selection is supported. */
	supportsBulk?: boolean;
	/** Flag destructive styling. */
	isDestructive?: boolean;
	/** Flag primary styling. */
	isPrimary?: boolean;
	/** Capability key to gate rendering and execution. */
	capability?: string;
	/** When true, render disabled instead of hiding on capability denial. */
	disabledWhenDenied?: boolean;
	/**
	 * Build action input payload from the current selection and items.
	 */
	getActionArgs: (context: {
		selection: Array<string | number>;
		items: TItem[];
	}) => TInput;
	/**
	 * Optional meta object included in action triggered events.
	 */
	buildMeta?: (context: {
		selection: Array<string | number>;
		items: TItem[];
	}) => Record<string, unknown> | undefined;
	/**
	 * Optional invalidate hook overriding the default behaviour.
	 */
	invalidateOnSuccess?: (
		result: TResult,
		context: {
			selection: Array<string | number>;
			items: TItem[];
			input: TInput;
		}
	) => CacheKeyPattern[] | false;
}

/**
 * Represents a saved view configuration.
 *
 * @category DataViews Integration
 */
export interface ResourceDataViewSavedView {
	/** The unique identifier for the saved view. */
	id: string;
	/** The label for the saved view. */
	label: string;
	/** The view configuration object. */
	view: View;
	/** An optional description for the saved view. */
	description?: string;
	/** Whether this is the default view. */
	isDefault?: boolean;
	/** Additional properties for the saved view. */
	[key: string]: unknown;
}

/**
 * Configuration for the menu in a ResourceDataView.
 *
 * @category DataViews Integration
 */
export type ResourceDataViewMenuConfig = ResourceDataViewsMenuConfig;

/**
 * Resource DataView configuration.
 */
export interface ResourceDataViewConfig<TItem, TQuery> {
	fields: Field<TItem>[];
	defaultView: View;
	mapQuery: QueryMapping<TQuery>;
	preferencesKey?: string;
	capability?: string;
	actions?: Array<ResourceDataViewActionConfig<TItem, unknown, unknown>>;
	search?: boolean;
	searchLabel?: string;
	getItemId?: (item: TItem) => string;
	empty?: ReactNode;
	perPageSizes?: number[];
	defaultLayouts?: Record<string, unknown>;
	views?: ResourceDataViewSavedView[];
	screen?: ResourceDataViewScreenConfig;
}

export type ResourceDataViewScreenConfig = {
	component?: string;
	route?: string;
	resourceImport?: string;
	resourceSymbol?: string;
	wpkernelImport?: string;
	wpkernelSymbol?: string;
	menu?: ResourceDataViewMenuConfig;
	[key: string]: unknown;
};

/**
 * Source for the WPKUICapabilityRuntime.
 *
 * @category DataViews Integration
 * @public
 */
export type WPKUICapabilityRuntimeSource =
	| WPKUICapabilityRuntime
	| (() => WPKUICapabilityRuntime | undefined);

/**
 * Options for creating a `ResourceDataViewController`.
 *
 * @category DataViews Integration
 */
export interface ResourceDataViewControllerOptions<TItem, TQuery> {
	/** The resource object. */
	resource?: ResourceObject<TItem, TQuery>;
	/** The name of the resource. */
	resourceName?: string;
	/** The configuration for the DataView. */
	config: ResourceDataViewConfig<TItem, TQuery>;
	/** A function to map the view state to a query. */
	queryMapping?: QueryMapping<TQuery>;
	/** The runtime for the DataView controller. */
	runtime: DataViewsControllerRuntime;
	/** The namespace of the project. */
	namespace: string;
	/** A function to invalidate cache entries. */
	invalidate?: (patterns: CacheKeyPattern | CacheKeyPattern[]) => void;
	/** The capability runtime source. */
	capabilities?: WPKUICapabilityRuntimeSource;
	/** The key for storing preferences. */
	preferencesKey?: string;
	/** A function to fetch a list of items. */
	fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	/** A function to prefetch a list of items. */
	prefetchList?: (query: TQuery) => Promise<void>;
}

/**
 * Controller for a ResourceDataView.
 *
 * @category DataViews Integration
 */
export interface ResourceDataViewController<TItem, TQuery> {
	/** The resource object. */
	readonly resource?: ResourceObject<TItem, TQuery>;
	/** The name of the resource. */
	readonly resourceName: string;
	/** The configuration for the DataView. */
	readonly config: ResourceDataViewConfig<TItem, TQuery>;
	/** A function to map the view state to a query. */
	readonly queryMapping: QueryMapping<TQuery>;
	/** The runtime for the DataView controller. */
	readonly runtime: DataViewsControllerRuntime;
	/** The namespace of the project. */
	readonly namespace: string;
	/** The key for storing preferences. */
	readonly preferencesKey: string;
	/** A function to invalidate cache entries. */
	readonly invalidate?: (
		patterns: CacheKeyPattern | CacheKeyPattern[]
	) => void;
	/** The capability runtime. */
	readonly capabilities?: WPKUICapabilityRuntime;
	/** A function to fetch a list of items. */
	readonly fetchList?: (query: TQuery) => Promise<ListResponse<TItem>>;
	/** A function to prefetch a list of items. */
	readonly prefetchList?: (query: TQuery) => Promise<void>;
	/** Maps the view state to a query. */
	mapViewToQuery: (view: View) => TQuery;
	/** Derives the view state from a view. */
	deriveViewState: (view: View) => DataViewChangedPayload['viewState'];
	/** Loads the stored view from preferences. */
	loadStoredView: () => Promise<View | undefined>;
	/** Saves the view to preferences. */
	saveView: (view: View) => Promise<void>;
	/** Emits a view change event. */
	emitViewChange: (view: View) => void;
	/** Emits a registered event. */
	emitRegistered: (preferencesKey: string) => void;
	/** Emits an unregistered event. */
	emitUnregistered: (preferencesKey: string) => void;
	/** Emits an action event. */
	emitAction: (payload: {
		actionId: string;
		selection: Array<string | number>;
		permitted: boolean;
		reason?: string;
		meta?: Record<string, unknown>;
	}) => void;
	/** Emits a permission denied event. */
	emitPermissionDenied: (
		payload: Omit<DataViewPermissionDeniedPayload, 'resource'>
	) => void;
	/** Emits a fetch failed event. */
	emitFetchFailed: (
		payload: Omit<DataViewFetchFailedPayload, 'resource'>
	) => void;
	/** Emits a boundary transition event. */
	emitBoundaryTransition: (
		payload: Omit<DataViewBoundaryTransitionPayload, 'resource'>
	) => void;
	/** Gets the reporter for the controller. */
	getReporter: () => Reporter;
}

/**
 * Options for creating a `DataViewsStandaloneRuntime`.
 *
 * @category DataViews Integration
 * @public
 */
export interface DataViewsRuntimeOptions {
	/** The namespace of the project. */
	namespace: string;
	/** The reporter for logging. */
	reporter: Reporter;
	/** The preferences runtime or adapter. */
	preferences: DataViewPreferencesRuntime | DataViewPreferencesAdapter;
	/** The capability runtime. */
	capabilities?: WPKUICapabilityRuntime;
	/** A function to invalidate cache entries. */
	invalidate?: (patterns: CacheKeyPattern | CacheKeyPattern[]) => void;
	/** A function to emit events. */
	emit?: (eventName: string, payload: unknown) => void;
}

/**
 * A standalone runtime for DataViews.
 *
 * @category DataViews Integration
 */
export interface DataViewsStandaloneRuntime extends DataViewsRuntimeContext {
	/** The DataViews runtime. */
	readonly dataviews: WPKernelDataViewsRuntime;
	/** The capability runtime. */
	readonly capabilities?: WPKUICapabilityRuntime;
}
