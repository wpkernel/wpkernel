[**@wpkernel/wp-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / RequestParamAssignmentOptions

# Interface: RequestParamAssignmentOptions

Options for building a request parameter assignment statement.

## Properties

### param

```ts
readonly param: string;
```

The name of the parameter to retrieve.

***

### requestVariable

```ts
readonly requestVariable: string;
```

The name of the variable holding the `WP_REST_Request` object.

***

### cast?

```ts
readonly optional cast: ScalarCastKind;
```

An optional scalar cast to apply to the parameter value.

***

### targetVariable?

```ts
readonly optional targetVariable: string;
```

The name of the variable to which the parameter value will be assigned. Defaults to the value of `param`.
