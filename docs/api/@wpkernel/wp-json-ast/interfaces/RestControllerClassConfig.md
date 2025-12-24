[**@wpkernel/wp-json-ast v0.12.6-beta.3**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / RestControllerClassConfig

# Interface: RestControllerClassConfig

## Extended by

- [`RestControllerModuleControllerConfig`](RestControllerModuleControllerConfig.md)

## Properties

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

### resourceName

```ts
readonly resourceName: string;
```

***

### restArgsExpression

```ts
readonly restArgsExpression: PhpExpr;
```

***

### routes

```ts
readonly routes: readonly RestRouteConfig[];
```

***

### schemaKey

```ts
readonly schemaKey: string;
```

***

### capabilityClass?

```ts
readonly optional capabilityClass: string;
```

***

### helperMethods?

```ts
readonly optional helperMethods: readonly PhpStmtClassMethod[];
```
