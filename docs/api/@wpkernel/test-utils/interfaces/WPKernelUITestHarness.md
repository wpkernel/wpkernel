[**@wpkernel/test-utils v0.12.5-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / WPKernelUITestHarness

# Interface: WPKernelUITestHarness

A harness for testing UI components that interact with the WPKernel UI runtime.

## Properties

### createRuntime()

```ts
createRuntime: (overrides?) => WPKernelUIRuntime;
```

Creates a new `WPKernelUIRuntime` instance.

#### Parameters

##### overrides?

`Partial`<`WPKernelUIRuntime`>

#### Returns

`WPKernelUIRuntime`

---

### createWrapper()

```ts
createWrapper: (runtime?) => (__namedParameters) => ReactElement<{
}>;
```

Creates a React wrapper component for the WPKernel UI runtime.

#### Parameters

##### runtime?

`WPKernelUIRuntime`

#### Returns

```ts
(__namedParameters): ReactElement<{
}>;
```

##### Parameters

###### \_\_namedParameters

###### children

`ReactNode`

##### Returns

`ReactElement`<\{
\}>

---

### resetActionStoreRegistration()

```ts
resetActionStoreRegistration: () => void;
```

Resets the action store registration.

#### Returns

`void`

---

### restoreConsoleError()

```ts
restoreConsoleError: () => void;
```

Restores the original console error function.

#### Returns

`void`

---

### suppressConsoleError()

```ts
suppressConsoleError: (predicate) => void;
```

Suppresses console errors that match a given predicate.

#### Parameters

##### predicate

(`args`) => `boolean`

#### Returns

`void`

---

### teardown()

```ts
teardown: () => void;
```

Tears down the harness, restoring original globals.

#### Returns

`void`

---

### wordpress

```ts
wordpress: WordPressTestHarness;
```

The WordPress test harness.
