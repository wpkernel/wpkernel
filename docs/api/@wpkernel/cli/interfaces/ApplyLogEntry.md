[**@wpkernel/cli v0.12.3-beta.2**](../README.md)

---

[@wpkernel/cli](../README.md) / ApplyLogEntry

# Interface: ApplyLogEntry

Represents an entry in the apply log.

## Properties

### actions

```ts
readonly actions: readonly string[];
```

---

### exitCode

```ts
readonly exitCode: WPKExitCode;
```

---

### flags

```ts
readonly flags: ApplyFlags;
```

---

### records

```ts
readonly records: readonly PatchRecord[];
```

---

### status

```ts
readonly status: ApplyLogStatus;
```

---

### summary

```ts
readonly summary: PatchManifestSummary | null;
```

---

### timestamp

```ts
readonly timestamp: string;
```

---

### version

```ts
readonly version: 1;
```

---

### error?

```ts
readonly optional error: SerializedError;
```
