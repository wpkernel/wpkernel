[**@wpkernel/wp-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / RestRouteRequestParameter

# Interface: RestRouteRequestParameter

## Extends

- `Omit`&lt;[`RequestParamAssignmentOptions`](RequestParamAssignmentOptions.md), `"requestVariable"`&gt;

## Properties

### param

```ts
readonly param: string;
```

The name of the parameter to retrieve.

#### Inherited from

[`RequestParamAssignmentOptions`](RequestParamAssignmentOptions.md).[`param`](RequestParamAssignmentOptions.md#param)

***

### cast?

```ts
readonly optional cast: ScalarCastKind;
```

An optional scalar cast to apply to the parameter value.

#### Inherited from

[`RequestParamAssignmentOptions`](RequestParamAssignmentOptions.md).[`cast`](RequestParamAssignmentOptions.md#cast)

***

### requestVariable?

```ts
readonly optional requestVariable: string;
```

***

### targetVariable?

```ts
readonly optional targetVariable: string;
```

The name of the variable to which the parameter value will be assigned. Defaults to the value of `param`.

#### Inherited from

[`RequestParamAssignmentOptions`](RequestParamAssignmentOptions.md).[`targetVariable`](RequestParamAssignmentOptions.md#targetvariable)
