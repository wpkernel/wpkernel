[**@wpkernel/test-utils v0.12.6-beta.3**](../README.md)

---

[@wpkernel/test-utils](../README.md) / MemoryReporter

# Interface: MemoryReporter

A test utility that captures reporter output in memory.

## Properties

### clear()

```ts
clear: () => void;
```

Clears all captured log entries.

#### Returns

`void`

---

### entries

```ts
readonly entries: MemoryReporterEntry[];
```

An array of captured log entries.

---

### namespace

```ts
readonly namespace: string;
```

The namespace of the reporter.

---

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance.
