[**@wpkernel/test-utils v0.12.3-beta.1**](../README.md)

***

[@wpkernel/test-utils](../README.md) / MemoryReporter

# Interface: MemoryReporter

A test utility that captures reporter output in memory.

## Properties

### clear()

```ts
clear: () =&gt; void;
```

Clears all captured log entries.

#### Returns

`void`

***

### entries

```ts
readonly entries: MemoryReporterEntry[];
```

An array of captured log entries.

***

### namespace

```ts
readonly namespace: string;
```

The namespace of the reporter.

***

### reporter

```ts
readonly reporter: Reporter;
```

The reporter instance.
