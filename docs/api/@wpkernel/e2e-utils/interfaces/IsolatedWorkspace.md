[**@wpkernel/e2e-utils v0.12.6-beta.0**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / IsolatedWorkspace

# Interface: IsolatedWorkspace

## Extends

- `Disposable`

## Properties

### dispose()

```ts
dispose: () =&gt; void | Promise&lt;void&gt;;
```

#### Returns

`void` \| `Promise`&lt;`void`&gt;

#### Inherited from

```ts
Disposable.dispose
```

***

### env

```ts
readonly env: ProcessEnv;
```

Normalised environment variables applied to spawned processes

***

### root

```ts
readonly root: string;
```

Absolute path to the workspace root

***

### run()

```ts
run: (command, args?, options?) =&gt; Promise&lt;CliTranscript&gt;;
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

`Promise`&lt;[`CliTranscript`](CliTranscript.md)&gt;

***

### tools

```ts
readonly tools: WorkspaceTools;
```

Convenience accessor for pinned tooling
