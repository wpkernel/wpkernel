[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceAdminUIConfig

# Interface: ResourceAdminUIConfig

Shallow admin UI configuration.

Public config does _not_ describe DataViews internals or menu wiring.
Those are inferred from schema/storage/capabilities + layout manifest.

## Indexable

```ts
[key: string]: unknown
```

Reserved for future extensions / internal tagging.

## Properties

### view?

```ts
optional view: string;
```

Selected admin view implementation.
'dataviews' is the canonical value; others reserved for future.
