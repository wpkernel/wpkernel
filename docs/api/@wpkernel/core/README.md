**@wpkernel/core v0.12.6-beta.0**

***

# @wpkernel/core v0.12.6-beta.0

WPKernel - Core Framework Package

Rails-like framework for building modern WordPress products where
JavaScript is the source of truth and PHP is a thin contract.

## Examples

```ts
import { fetch } from '@wpkernel/core/http';
import { defineResource } from '@wpkernel/core/resource';
import { WPKernelError } from '@wpkernel/core/error';
```

```ts
import { fetch, defineResource, WPKernelError } from '@wpkernel/core';
```

## Classes

### Events

- [WPKernelEventBus](classes/WPKernelEventBus.md)

### Reporter

- [ConsoleTransport](classes/ConsoleTransport.md)

### Other

- [EnvironmentalError](classes/EnvironmentalError.md)
- [ServerError](classes/ServerError.md)
- [TransportError](classes/TransportError.md)
- [WPKernelError](classes/WPKernelError.md)
- [WPKernelHooksTransport](classes/WPKernelHooksTransport.md)

## Interfaces

### Resource

- [ResourceDataViewsMenuConfig](interfaces/ResourceDataViewsMenuConfig.md)

### Other

- [ConfigureWPKernelOptions](interfaces/ConfigureWPKernelOptions.md)
- [DefinedInteraction](interfaces/DefinedInteraction.md)
- [DefineInteractionOptions](interfaces/DefineInteractionOptions.md)
- [HydrateServerStateInput](interfaces/HydrateServerStateInput.md)
- [InteractionActionBinding](interfaces/InteractionActionBinding.md)
- [InteractivityGlobal](interfaces/InteractivityGlobal.md)
- [InteractivityModule](interfaces/InteractivityModule.md)
- [ResourceAdminUIConfig](interfaces/ResourceAdminUIConfig.md)
- [ResourceUIConfig](interfaces/ResourceUIConfig.md)
- [UIIntegrationOptions](interfaces/UIIntegrationOptions.md)
- [WPKernelUIRuntime](interfaces/WPKernelUIRuntime.md)
- [WPKInstance](interfaces/WPKInstance.md)
- [WPKUICapabilityRuntime](interfaces/WPKUICapabilityRuntime.md)
- [WPKUIConfig](interfaces/WPKUIConfig.md)

## Type Aliases

### Resource

- [ResourceConfig](type-aliases/ResourceConfig.md)
- [ResourceQueryParams](type-aliases/ResourceQueryParams.md)
- [ResourceState](type-aliases/ResourceState.md)

### Other

- [ActionCompleteEvent](type-aliases/ActionCompleteEvent.md)
- [ActionConfig](type-aliases/ActionConfig.md)
- [ActionContext](type-aliases/ActionContext.md)
- [ActionDefinedEvent](type-aliases/ActionDefinedEvent.md)
- [ActionDomainEvent](type-aliases/ActionDomainEvent.md)
- [ActionEnvelope](type-aliases/ActionEnvelope.md)
- [ActionErrorEvent](type-aliases/ActionErrorEvent.md)
- [ActionFn](type-aliases/ActionFn.md)
- [ActionJobs](type-aliases/ActionJobs.md)
- [ActionLifecycleEvent](type-aliases/ActionLifecycleEvent.md)
- [ActionLifecycleEventBase](type-aliases/ActionLifecycleEventBase.md)
- [ActionLifecyclePhase](type-aliases/ActionLifecyclePhase.md)
- [ActionOptions](type-aliases/ActionOptions.md)
- [ActionStartEvent](type-aliases/ActionStartEvent.md)
- [AnyFn](type-aliases/AnyFn.md)
- [CacheInvalidatedEvent](type-aliases/CacheInvalidatedEvent.md)
- [CacheKeyFn](type-aliases/CacheKeyFn.md)
- [CacheKeyPattern](type-aliases/CacheKeyPattern.md)
- [CacheKeys](type-aliases/CacheKeys.md)
- [CapabilityAdapters](type-aliases/CapabilityAdapters.md)
- [CapabilityCache](type-aliases/CapabilityCache.md)
- [CapabilityCacheOptions](type-aliases/CapabilityCacheOptions.md)
- [CapabilityContext](type-aliases/CapabilityContext.md)
- [CapabilityDefinitionConfig](type-aliases/CapabilityDefinitionConfig.md)
- [CapabilityDeniedEvent](type-aliases/CapabilityDeniedEvent.md)
- [CapabilityHelpers](type-aliases/CapabilityHelpers.md)
- [CapabilityMap](type-aliases/CapabilityMap.md)
- [CapabilityOptions](type-aliases/CapabilityOptions.md)
- [CapabilityProxyOptions](type-aliases/CapabilityProxyOptions.md)
- [CapabilityReporter](type-aliases/CapabilityReporter.md)
- [CapabilityRule](type-aliases/CapabilityRule.md)
- [CustomKernelEvent](type-aliases/CustomKernelEvent.md)
- [DeepReadonly](type-aliases/DeepReadonly.md)
- [DefinedAction](type-aliases/DefinedAction.md)
- [ErrorCode](type-aliases/ErrorCode.md)
- [ErrorContext](type-aliases/ErrorContext.md)
- [ErrorData](type-aliases/ErrorData.md)
- [GenericResourceDefinedEvent](type-aliases/GenericResourceDefinedEvent.md)
- [HttpMethod](type-aliases/HttpMethod.md)
- [InteractionActionInput](type-aliases/InteractionActionInput.md)
- [InteractionActionMetaResolver](type-aliases/InteractionActionMetaResolver.md)
- [InteractionActionsRecord](type-aliases/InteractionActionsRecord.md)
- [InteractionActionsRuntime](type-aliases/InteractionActionsRuntime.md)
- [InteractivityServerState](type-aliases/InteractivityServerState.md)
- [InteractivityServerStateResolver](type-aliases/InteractivityServerStateResolver.md)
- [InteractivityStoreResult](type-aliases/InteractivityStoreResult.md)
- [InvalidateOptions](type-aliases/InvalidateOptions.md)
- [Listener](type-aliases/Listener.md)
- [ListResponse](type-aliases/ListResponse.md)
- [NamespaceDetectionMode](type-aliases/NamespaceDetectionMode.md)
- [NamespaceDetectionOptions](type-aliases/NamespaceDetectionOptions.md)
- [NamespaceDetectionResult](type-aliases/NamespaceDetectionResult.md)
- [NamespaceRuntimeContext](type-aliases/NamespaceRuntimeContext.md)
- [NoticeStatus](type-aliases/NoticeStatus.md)
- [ParamsOf](type-aliases/ParamsOf.md)
- [PathParams](type-aliases/PathParams.md)
- [ReduxDispatch](type-aliases/ReduxDispatch.md)
- [ReduxMiddleware](type-aliases/ReduxMiddleware.md)
- [ReduxMiddlewareAPI](type-aliases/ReduxMiddlewareAPI.md)
- [Reporter](type-aliases/Reporter.md)
- [ReporterChannel](type-aliases/ReporterChannel.md)
- [ReporterLevel](type-aliases/ReporterLevel.md)
- [ReporterOptions](type-aliases/ReporterOptions.md)
- [ResourceActions](type-aliases/ResourceActions.md)
- [ResourceCacheSync](type-aliases/ResourceCacheSync.md)
- [ResourceCapabilityDescriptor](type-aliases/ResourceCapabilityDescriptor.md)
- [ResourceCapabilityMap](type-aliases/ResourceCapabilityMap.md)
- [ResourceClient](type-aliases/ResourceClient.md)
- [ResourceDefinedEvent](type-aliases/ResourceDefinedEvent.md)
- [ResourceErrorEvent](type-aliases/ResourceErrorEvent.md)
- [ResourceIdentityConfig](type-aliases/ResourceIdentityConfig.md)
- [ResourceListStatus](type-aliases/ResourceListStatus.md)
- [ResourceObject](type-aliases/ResourceObject.md)
- [ResourcePostMetaDescriptor](type-aliases/ResourcePostMetaDescriptor.md)
- [ResourceQueryParamDescriptor](type-aliases/ResourceQueryParamDescriptor.md)
- [ResourceRequestEvent](type-aliases/ResourceRequestEvent.md)
- [ResourceResolvers](type-aliases/ResourceResolvers.md)
- [ResourceResponseEvent](type-aliases/ResourceResponseEvent.md)
- [ResourceRoute](type-aliases/ResourceRoute.md)
- [ResourceRoutes](type-aliases/ResourceRoutes.md)
- [ResourceSelectors](type-aliases/ResourceSelectors.md)
- [ResourceStorageConfig](type-aliases/ResourceStorageConfig.md)
- [ResourceStore](type-aliases/ResourceStore.md)
- [ResourceStoreConfig](type-aliases/ResourceStoreConfig.md)
- [ResourceStoreOptions](type-aliases/ResourceStoreOptions.md)
- [RouteCapabilityKeys](type-aliases/RouteCapabilityKeys.md)
- [SerializedError](type-aliases/SerializedError.md)
- [TransportMeta](type-aliases/TransportMeta.md)
- [TransportRequest](type-aliases/TransportRequest.md)
- [TransportResponse](type-aliases/TransportResponse.md)
- [WaitOptions](type-aliases/WaitOptions.md)
- [WordPressRESTError](type-aliases/WordPressRESTError.md)
- [WPKernelEventMap](type-aliases/WPKernelEventMap.md)
- [WPKernelEventsPluginOptions](type-aliases/WPKernelEventsPluginOptions.md)
- [WPKernelReduxMiddleware](type-aliases/WPKernelReduxMiddleware.md)
- [WPKernelRegistry](type-aliases/WPKernelRegistry.md)
- [WPKernelUIAttach](type-aliases/WPKernelUIAttach.md)
- [WPKExitCode](type-aliases/WPKExitCode.md)

## Variables

- [ACTION\_LIFECYCLE\_PHASES](variables/ACTION_LIFECYCLE_PHASES.md)
- [getWPData](variables/getWPData.md)
- [VERSION](variables/VERSION.md)
- [WPK\_CONFIG\_SOURCES](variables/WPK_CONFIG_SOURCES.md)
- [WPK\_EVENTS](variables/WPK_EVENTS.md)
- [WPK\_EXIT\_CODES](variables/WPK_EXIT_CODES.md)
- [WPK\_INFRASTRUCTURE](variables/WPK_INFRASTRUCTURE.md)
- [WPK\_NAMESPACE](variables/WPK_NAMESPACE.md)
- [WPK\_SUBSYSTEM\_NAMESPACES](variables/WPK_SUBSYSTEM_NAMESPACES.md)

## Functions

### HTTP

- [fetch](functions/fetch.md)

### Resource

- [createStore](functions/createStore.md)
- [defineResource](functions/defineResource.md)
- [interpolatePath](functions/interpolatePath.md)
- [invalidate](functions/invalidate.md)
- [normalizeCacheKey](functions/normalizeCacheKey.md)

### Actions

- [createActionMiddleware](functions/createActionMiddleware.md)
- [defineAction](functions/defineAction.md)
- [invokeAction](functions/invokeAction.md)

### Capability

- [createCapabilityProxy](functions/createCapabilityProxy.md)
- [defineCapability](functions/defineCapability.md)

### Data

- [configureWPKernel](functions/configureWPKernel.md)
- [registerWPKernelStore](functions/registerWPKernelStore.md)
- [wpkEventsPlugin](functions/wpkEventsPlugin.md)

### Interactivity

- [defineInteraction](functions/defineInteraction.md)

### Events

- [clearRegisteredActions](functions/clearRegisteredActions.md)
- [clearRegisteredResources](functions/clearRegisteredResources.md)
- [getRegisteredActions](functions/getRegisteredActions.md)
- [getRegisteredResources](functions/getRegisteredResources.md)
- [getWPKernelEventBus](functions/getWPKernelEventBus.md)
- [setWPKernelEventBus](functions/setWPKernelEventBus.md)

### Reporter

- [clearWPKReporter](functions/clearWPKReporter.md)
- [createNoopReporter](functions/createNoopReporter.md)
- [createReporter](functions/createReporter.md)
- [createTransports](functions/createTransports.md)
- [getWPKernelReporter](functions/getWPKernelReporter.md)
- [setWPKernelReporter](functions/setWPKernelReporter.md)

### Namespace

- [detectNamespace](functions/detectNamespace.md)
- [getNamespace](functions/getNamespace.md)
- [isValidNamespace](functions/isValidNamespace.md)
- [sanitizeNamespace](functions/sanitizeNamespace.md)

### Other

- [serializeWPKernelError](functions/serializeWPKernelError.md)
