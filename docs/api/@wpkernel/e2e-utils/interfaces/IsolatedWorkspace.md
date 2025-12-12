[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / IsolatedWorkspace

# Interface: IsolatedWorkspace

## Extends

- `Disposable`

## Properties

### dispose()

```ts
dispose: () => void | Promise<void>;
```

#### Returns

`void` \| `Promise`<`void`>

#### Inherited from

```ts
Disposable.dispose;
```

---

### env

```ts
readonly env: ProcessEnv;
```

Normalised environment variables applied to spawned processes

---

### root

```ts
readonly root: string;
```

Absolute path to the workspace root

---

### run()

```ts
run: (command, args?, options?) => Promise<CliTranscript>;
```

Run a command within the workspace root.

#### Parameters

##### command

`string`

binary to execute

##### args?

`string`[]

optional command arguments

##### options?

[`WorkspaceRunOptions`](WorkspaceRunOptions.md)

spawn overrides

#### Returns

`Promise`<[`CliTranscript`](CliTranscript.md)>

---

### tools

```ts
readonly tools: WorkspaceTools;
```

Convenience accessor for pinned tooling
