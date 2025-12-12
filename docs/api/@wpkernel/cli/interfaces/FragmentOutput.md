[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / FragmentOutput

# Interface: FragmentOutput

Output for a fragment helper.

## Properties

### assign()

```ts
assign: (partial) =&gt; void;
```

Assigns a partial `MutableIr` to the current draft.

#### Parameters

##### partial

`Partial`&lt;[`MutableIr`](MutableIr.md)&gt;

The partial IR to assign.

#### Returns

`void`

***

### draft

```ts
readonly draft: MutableIr;
```

The mutable Intermediate Representation draft.
