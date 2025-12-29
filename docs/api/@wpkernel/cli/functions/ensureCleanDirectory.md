[**@wpkernel/cli v0.12.6-beta.3**](../README.md)

---

[@wpkernel/cli](../README.md) / ensureCleanDirectory

# Function: ensureCleanDirectory()

```ts
function ensureCleanDirectory(options): Promise<void>;
```

Ensures that a given directory is clean (empty) or creates it if it doesn't exist.

If the directory exists and is not empty, it will throw a `WPKernelError`
unless `force` is true, in which case it will clear the directory contents.

## Parameters

### options

[`EnsureCleanDirectoryOptions`](../interfaces/EnsureCleanDirectoryOptions.md)

Options for ensuring the directory is clean.

## Returns

`Promise`<`void`>

## Throws

`WPKernelError` if the directory is not empty and `force` is false, or if it's not a directory.
