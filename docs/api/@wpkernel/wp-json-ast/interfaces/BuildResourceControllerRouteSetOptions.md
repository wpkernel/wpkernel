[**@wpkernel/wp-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / BuildResourceControllerRouteSetOptions

# Interface: BuildResourceControllerRouteSetOptions

## Properties

### plan

```ts
readonly plan: Pick&lt;RestControllerRoutePlan, "definition" | "methodName" | "docblockSummary"&gt;;
```

***

### buildFallbackStatements?

```ts
readonly optional buildFallbackStatements: BuildRouteFallbackStatements;
```

***

### fallbackContext?

```ts
readonly optional fallbackContext: RestControllerRouteFallbackContext;
```

***

### handlers?

```ts
readonly optional handlers: RestControllerRouteHandlers;
```

***

### optionHandlers?

```ts
readonly optional optionHandlers: RestControllerRouteOptionHandlers;
```

***

### storageMode?

```ts
readonly optional storageMode: RestControllerRouteStorageMode;
```

***

### transientHandlers?

```ts
readonly optional transientHandlers: RestControllerRouteTransientHandlers;
```
