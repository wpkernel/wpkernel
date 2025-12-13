[**@wpkernel/wp-json-ast v0.12.6-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / RestControllerResourcePlan

# Interface: RestControllerResourcePlan

## Properties

### cacheKeys

```ts
readonly cacheKeys: ResourceCacheKeysPlan;
```

***

### className

```ts
readonly className: string;
```

***

### identity

```ts
readonly identity: RestControllerIdentity;
```

***

### name

```ts
readonly name: string;
```

***

### restArgsExpression

```ts
readonly restArgsExpression: PhpExpr;
```

***

### routes

```ts
readonly routes: readonly RestControllerRoutePlan[];
```

***

### schemaKey

```ts
readonly schemaKey: string;
```

***

### schemaProvenance

```ts
readonly schemaProvenance: string;
```

***

### helperMethods?

```ts
readonly optional helperMethods: readonly PhpStmtClassMethod[];
```

***

### helperSignatures?

```ts
readonly optional helperSignatures: readonly string[];
```

***

### mutationMetadata?

```ts
readonly optional mutationMetadata: RouteMutationMetadataPlan;
```
