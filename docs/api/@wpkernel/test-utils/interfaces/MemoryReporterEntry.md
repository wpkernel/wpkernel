[**@wpkernel/test-utils v0.12.3-beta.2**](../README.md)

***

[@wpkernel/test-utils](../README.md) / MemoryReporterEntry

# Interface: MemoryReporterEntry

Represents a single log entry in the `MemoryReporter`.

## Properties

### level

```ts
readonly level: ReporterLevel;
```

The logging level of the entry.

***

### message

```ts
readonly message: string;
```

The log message.

***

### namespace

```ts
readonly namespace: string;
```

The namespace of the reporter that created the entry.

***

### context?

```ts
readonly optional context: unknown;
```

Optional context associated with the log entry.
