[**@wpkernel/wp-json-ast v0.12.5-beta.0**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / BuildWpTermQueryInstantiationOptions

# Interface: BuildWpTermQueryInstantiationOptions

Options for building a `WP_Term_Query` instantiation.

## Example

```ts
const options: BuildWpTermQueryInstantiationOptions = {
	target: '$query',
	argsVariable: '$args',
};
```

## Properties

### target

```ts
readonly target: string;
```

The name of the variable to which the `WP_Term_Query` instance will be assigned.

***

### argsVariable?

```ts
readonly optional argsVariable: string;
```

The name of the variable containing the query arguments.
