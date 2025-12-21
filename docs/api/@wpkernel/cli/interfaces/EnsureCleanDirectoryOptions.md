[**@wpkernel/cli v0.12.6-beta.2**](../README.md)

***

[@wpkernel/cli](../README.md) / EnsureCleanDirectoryOptions

# Interface: EnsureCleanDirectoryOptions

Options for the `ensureCleanDirectory` function.

## Properties

### directory

```ts
readonly directory: string;
```

The directory to ensure is clean.

***

### workspace

```ts
readonly workspace: Workspace;
```

The workspace instance.

***

### create?

```ts
readonly optional create: boolean;
```

Whether to create the directory if it doesn't exist.

***

### force?

```ts
readonly optional force: boolean;
```

Whether to force the cleanup, even if the directory is not empty.

***

### reporter?

```ts
readonly optional reporter: Reporter;
```

Optional: The reporter instance for logging.
