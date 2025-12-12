[**@wpkernel/test-utils v0.12.4-beta.0**](../README.md)

***

[@wpkernel/test-utils](../README.md) / WordPressTestHarness

# Interface: WordPressTestHarness

Represents a WordPress test harness, providing mocked WordPress globals and utility functions.

## Properties

### data

```ts
data: WordPressData;
```

Convenience access to the shared data package to avoid calling
`ensureWpData()` repeatedly in suites.

***

### reset()

```ts
reset: () =&gt; void;
```

Reset namespace state and clear all jest mocks.

#### Returns

`void`

***

### teardown()

```ts
teardown: () =&gt; void;
```

Restore the previous global and perform a reset.

#### Returns

`void`

***

### wp

```ts
wp: any;
```

The mock WordPress global that has been installed.
