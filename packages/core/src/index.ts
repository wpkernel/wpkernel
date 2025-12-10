/**
 * WPKernel - Core Framework Package
 *
 * Rails-like framework for building modern WordPress products where
 * JavaScript is the source of truth and PHP is a thin contract.
 *
 * @example Submodule imports (recommended - best for tree-shaking)
 * ```ts
 * import { fetch } from '@wpkernel/core/http';
 * import { defineResource } from '@wpkernel/core/resource';
 * import { WPKernelError } from '@wpkernel/core/error';
 * ```
 *
 * @example Flat imports from main index (convenience)
 * ```ts
 * import { fetch, defineResource, WPKernelError } from '@wpkernel/core';
 * ```
 *
 * @module
 */

// ============================================================================
// Global Function Implementations
// ============================================================================

/**
 * Implement global getWPData function
 * Available globally without imports via global.d.ts declaration
 */
(globalThis as { getWPData?: () => unknown }).getWPData = () => {
	if (typeof window === 'undefined') {
		return undefined;
	}
	return (window as WPGlobal).wp?.data;
};

export const VERSION = '0.11.0';

// ============================================================================
// Flat Exports (Convenience aliases)
// ============================================================================

// Contracts
export {
	ACTION_LIFECYCLE_PHASES,
	WPK_CONFIG_SOURCES,
	WPK_EVENTS,
	WPK_EXIT_CODES,
	WPK_INFRASTRUCTURE,
	WPK_NAMESPACE,
	WPK_SUBSYSTEM_NAMESPACES,
	serializeWPKernelError,
} from './contracts/index.js';
export type { ActionLifecyclePhase, WPKExitCode } from './contracts/index.js';

// Error classes
export {
	WPKernelError,
	TransportError,
	ServerError,
	EnvironmentalError,
} from './error/index.js';
export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
	WordPressRESTError,
} from './error/index.js';

// HTTP transport
export { fetch } from './http/fetch.js';
export type {
	HttpMethod,
	TransportRequest,
	TransportResponse,
	TransportMeta,
	ResourceRequestEvent,
	ResourceResponseEvent,
	ResourceErrorEvent,
} from './http/types.js';

// Resource system
export { defineResource } from './resource/define.js';
export {
	interpolatePath,
	extractPathParams,
	invalidate,
	invalidateAll,
	normalizeCacheKey,
	matchesCacheKey,
	findMatchingKeys,
	findMatchingKeysMultiple,
} from './resource/cache.js';
export { createStore } from './resource/store.js';

// Global functions (re-export for convenience)
export const getWPData = globalThis.getWPData;
export type {
	AnyFn,
	ResourceRoute,
	ResourceRoutes,
	ResourceIdentityConfig,
	ResourcePostMetaDescriptor,
	ResourceStorageConfig,
	ResourceStoreOptions,
	CacheKeyFn,
	CacheKeys,
	ResourceQueryParamDescriptor,
	ResourceQueryParams,
	ResourceConfig,
	ResourceCapabilityMap,
	ResourceCapabilityDescriptor,
	RouteCapabilityKeys,
	ListResponse,
	ResourceClient,
	ResourceObject,
	ResourceUIConfig,
	ResourceAdminUIConfig,
	ResourceDataViewsMenuConfig,
	ResourceState,
	ResourceActions,
	ResourceSelectors,
	ResourceResolvers,
	ResourceStoreConfig,
	ResourceStore,
	ResourceListStatus,
} from './resource/types';
export type {
	PathParams,
	CacheKeyPattern,
	InvalidateOptions,
} from './resource/cache';

// Actions system
export { defineAction } from './actions/define.js';
export {
	createActionMiddleware,
	invokeAction,
	EXECUTE_ACTION_TYPE,
} from './actions/middleware.js';
export type { ActionEnvelope } from './actions/middleware.js';
export type {
	ActionConfig,
	ActionContext,
	ActionFn,
	ActionOptions,
	ActionLifecycleEvent,
	ActionLifecycleEventBase,
	ActionStartEvent,
	ActionCompleteEvent,
	ActionErrorEvent,
	DefinedAction,
	ResolvedActionOptions,
	ActionJobs,
	WaitOptions,
	ReduxMiddleware,
	ReduxMiddlewareAPI,
	ReduxDispatch,
} from './actions/types';

// Capability system
export { defineCapability, createCapabilityProxy } from './capability/index.js';
export type {
	CapabilityRule,
	CapabilityMap,
	CapabilityHelpers,
	CapabilityOptions,
	CapabilityDefinitionConfig,
	CapabilityContext,
	CapabilityCache,
	CapabilityCacheOptions,
	CapabilityDeniedEvent,
	CapabilityReporter,
	CapabilityAdapters,
	CapabilityProxyOptions,
	ParamsOf,
} from './capability/index.js';

// Data integration
export { configureWPKernel, registerWPKernelStore } from './data/index.js';
export { wpkEventsPlugin } from './data/plugins/events';
export type { WPKernelEventsPluginOptions } from './data/plugins/events';
export type {
	WPKernelRegistry,
	ConfigureWPKernelOptions,
	WPKInstance,
	WPKUIConfig,
	WPKernelUIRuntime,
	WPKernelUIAttach,
	UIIntegrationOptions,
	WPKUICapabilityRuntime,
	NoticeStatus,
	WPKernelReduxMiddleware,
} from './data/index.js';

// Interactivity
export { defineInteraction } from './interactivity/defineInteraction.js';
export type {
	DefineInteractionOptions,
	DefinedInteraction,
	InteractionActionBinding,
	InteractionActionInput,
	InteractionActionsRecord,
	InteractionActionMetaResolver,
	InteractionActionsRuntime,
	InteractivityGlobal,
	InteractivityModule,
	InteractivityStoreResult,
	InteractivityServerState,
	InteractivityServerStateResolver,
	HydrateServerStateInput,
	DeepReadonly,
	ResourceCacheSync,
} from './interactivity/index.js';

// Event bus
export {
	WPKernelEventBus,
	getWPKernelEventBus,
	setWPKernelEventBus,
	getRegisteredResources,
	getRegisteredActions,
	clearRegisteredResources,
	clearRegisteredActions,
} from './events/index.js';
export type {
	WPKernelEventMap,
	ResourceDefinedEvent,
	ActionDefinedEvent,
	ActionDomainEvent,
	CacheInvalidatedEvent,
	CustomKernelEvent,
	GenericResourceDefinedEvent,
	Listener,
} from './events/index.js';

// Reporter
export {
	createReporter,
	createNoopReporter,
	getWPKernelReporter,
	setWPKernelReporter,
	clearWPKReporter,
} from './reporter/index.js';
export type {
	Reporter,
	ReporterOptions,
	ReporterLevel,
	ReporterChannel,
} from './reporter/index.js';
export {
	WPKernelHooksTransport,
	ConsoleTransport,
	createTransports,
} from './reporter/transports.js';

// Namespace detection
export {
	detectNamespace,
	getNamespace,
	isValidNamespace,
	sanitizeNamespace,
	resetNamespaceCache,
} from './namespace/detect.js';
export type {
	NamespaceDetectionOptions,
	NamespaceDetectionResult,
	NamespaceDetectionMode,
	NamespaceRuntimeContext,
} from './namespace/detect.js';
