[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / createSchemasFragment

# Function: createSchemasFragment()

```ts
function createSchemasFragment(): IrFragment;
```

Creates an IR fragment that loads configured JSON Schemas.

This fragment:
- Loads schemas declared in `config.schemas` from disk
- Hashes and normalises them
- Populates a shared SchemaAccumulator extension
- Exposes the accumulator entries on `ir.schemas`

It does NOT attach schemas to resources; that is done on demand by the
resources fragment via resolveResourceSchema, which may also add
auto/inline schemas to the same accumulator.

## Returns

[`IrFragment`](../type-aliases/IrFragment.md)
