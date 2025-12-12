[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / ResourceStorageHelperState

# Interface: ResourceStorageHelperState

Represents the state managed by the resource storage helpers.

This state stores the generated artifacts for different storage modes
(transient, wp-option, wp-taxonomy) keyed by resource name.

## Properties

### transient

```ts
readonly transient: Map<string, TransientStorageArtifacts>;
```

A map of resource names to their transient storage artifacts.

---

### wpOption

```ts
readonly wpOption: Map<string, WpOptionStorageHelperArtifacts>;
```

A map of resource names to their WP Option storage artifacts.

---

### wpTaxonomy

```ts
readonly wpTaxonomy: Map<string, WpTaxonomyStorageHelperArtifacts>;
```

A map of resource names to their WP Taxonomy storage artifacts.
