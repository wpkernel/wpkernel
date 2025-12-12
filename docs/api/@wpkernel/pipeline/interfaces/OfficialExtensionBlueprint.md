[**@wpkernel/pipeline v0.12.5-beta.0**](../README.md)

---

[@wpkernel/pipeline](../README.md) / OfficialExtensionBlueprint

# Interface: OfficialExtensionBlueprint

Documentation-first blueprint for an extension incubated in this package.

## Properties

### behaviours

```ts
readonly behaviours: readonly ExtensionBehaviour[];
```

---

### id

```ts
readonly id: string;
```

---

### pipelineTouchPoints

```ts
readonly pipelineTouchPoints: readonly string[];
```

---

### rolloutNotes

```ts
readonly rolloutNotes: readonly string[];
```

---

### status

```ts
readonly status: "planned" | "in-development";
```

---

### summary

```ts
readonly summary: string;
```

---

### factory?

```ts
readonly optional factory: ExtensionFactorySignature<unknown>;
```
