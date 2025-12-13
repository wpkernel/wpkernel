[**@wpkernel/cli v0.12.6-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / ApplyCommandInstance

# Type Alias: ApplyCommandInstance

```ts
type ApplyCommandInstance = Command & object;
```

Represents an instance of the Apply command.

## Type Declaration

### allowDirty

```ts
allowDirty: boolean;
```

### backup

```ts
backup: boolean;
```

### force

```ts
force: boolean;
```

### manifest

```ts
manifest: PatchManifest | null;
```

### records

```ts
records: PatchRecord[];
```

### summary

```ts
summary: PatchManifestSummary | null;
```

### yes

```ts
yes: boolean;
```

### cleanup?

```ts
optional cleanup: string[];
```
