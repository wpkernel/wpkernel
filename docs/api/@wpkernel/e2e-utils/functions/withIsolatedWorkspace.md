[**@wpkernel/e2e-utils v0.12.5-beta.0**](../README.md)

---

[@wpkernel/e2e-utils](../README.md) / withIsolatedWorkspace

# Function: withIsolatedWorkspace()

Creates a temporary, isolated workspace for E2E tests.

This utility sets up a clean directory for each test, ensuring that tests
do not interfere with each other's file system state.

## Call Signature

```ts
function withIsolatedWorkspace<TResult>(options, callback): Promise<TResult>;
```

Run a callback against a disposable workspace rooted on disk.

### Type Parameters

#### TResult

`TResult`

### Parameters

#### options

[`WithIsolatedWorkspaceOptions`](../interfaces/WithIsolatedWorkspaceOptions.md)

#### callback

[`WithWorkspaceCallback`](../type-aliases/WithWorkspaceCallback.md)<`TResult`>

### Returns

`Promise`<`TResult`>

## Call Signature

```ts
function withIsolatedWorkspace<TResult>(callback): Promise<TResult>;
```

Run a callback against a disposable workspace rooted on disk.

### Type Parameters

#### TResult

`TResult`

### Parameters

#### callback

[`WithWorkspaceCallback`](../type-aliases/WithWorkspaceCallback.md)<`TResult`>

### Returns

`Promise`<`TResult`>
