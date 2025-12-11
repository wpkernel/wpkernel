[**@wpkernel/wp-json-ast v0.12.3-beta.2**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / RestControllerModuleControllerConfig

# Interface: RestControllerModuleControllerConfig

## Extends

- [`RestControllerClassConfig`](RestControllerClassConfig.md)

## Properties

### className

```ts
readonly className: string;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`className`](RestControllerClassConfig.md#classname)

***

### fileName

```ts
readonly fileName: string;
```

***

### identity

```ts
readonly identity: RestControllerIdentity;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`identity`](RestControllerClassConfig.md#identity)

***

### resourceName

```ts
readonly resourceName: string;
```

#### Overrides

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`resourceName`](RestControllerClassConfig.md#resourcename)

***

### restArgsExpression

```ts
readonly restArgsExpression: PhpExpr;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`restArgsExpression`](RestControllerClassConfig.md#restargsexpression)

***

### routes

```ts
readonly routes: readonly RestRouteConfig[];
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`routes`](RestControllerClassConfig.md#routes)

***

### schemaKey

```ts
readonly schemaKey: string;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`schemaKey`](RestControllerClassConfig.md#schemakey)

***

### schemaProvenance

```ts
readonly schemaProvenance: string;
```

***

### capabilityClass?

```ts
readonly optional capabilityClass: string;
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`capabilityClass`](RestControllerClassConfig.md#capabilityclass)

***

### helperMethods?

```ts
readonly optional helperMethods: readonly PhpStmtClassMethod[];
```

#### Inherited from

[`RestControllerClassConfig`](RestControllerClassConfig.md).[`helperMethods`](RestControllerClassConfig.md#helpermethods)

***

### metadata?

```ts
readonly optional metadata: ResourceControllerMetadata;
```
