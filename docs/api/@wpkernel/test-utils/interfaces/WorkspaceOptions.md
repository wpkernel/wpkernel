[**@wpkernel/test-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/test-utils](../README.md) / WorkspaceOptions

# Interface: WorkspaceOptions

Options for configuring a temporary workspace.

## Properties

### chdir?

```ts
optional chdir: boolean;
```

Whether to change the current working directory to the workspace.

---

### files?

```ts
optional files: Record<string, string | Buffer<ArrayBufferLike>>;
```

A map of relative file paths to their content (string or Buffer).

---

### prefix?

```ts
optional prefix: string;
```

A prefix for the temporary directory name.

---

### setup()?

```ts
optional setup: (workspace) => void | Promise<void>;
```

A setup function to run before the test.

#### Parameters

##### workspace

`string`

#### Returns

`void` \| `Promise`<`void`>

---

### teardown()?

```ts
optional teardown: (workspace) => void | Promise<void>;
```

A teardown function to run after the test.

#### Parameters

##### workspace

`string`

#### Returns

`void` \| `Promise`<`void`>
