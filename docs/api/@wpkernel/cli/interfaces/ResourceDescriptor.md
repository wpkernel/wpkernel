[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / ResourceDescriptor

# Interface: ResourceDescriptor

Describes a resource with its associated configuration and dataviews.

## Properties

### key

```ts
readonly key: string;
```

The unique key of the resource.

***

### name

```ts
readonly name: string;
```

The name of the resource.

***

### resource

```ts
readonly resource: IRResource;
```

The configuration object for the resource.

***

### adminView?

```ts
readonly optional adminView: string;
```

Selected admin view implementation (e.g., 'dataviews').

***

### dataviews?

```ts
readonly optional dataviews: unknown;
```

The admin dataviews configuration for the resource.
