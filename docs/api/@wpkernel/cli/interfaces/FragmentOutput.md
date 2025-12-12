[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / FragmentOutput

# Interface: FragmentOutput

Output for a fragment helper.

## Properties

### assign()

```ts
assign: (partial) => void;
```

Assigns a partial `MutableIr` to the current draft.

#### Parameters

##### partial

`Partial`<[`MutableIr`](MutableIr.md)>

The partial IR to assign.

#### Returns

`void`

---

### draft

```ts
readonly draft: MutableIr;
```

The mutable Intermediate Representation draft.
