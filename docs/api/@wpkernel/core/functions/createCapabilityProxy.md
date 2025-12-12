[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / createCapabilityProxy

# Function: createCapabilityProxy()

```ts
function createCapabilityProxy(options): Pick<CapabilityHelpers<Record<string, unknown>>, "assert" | "can">;
```

Create an action-scoped capability proxy for `ctx.capability`.

The proxy forwards `assert()` and `can()` calls to the configured capability
runtime while enriching denial events with the current action context.
It falls back gracefully when the runtime is not initialised, surfacing a
`DeveloperError` so actions can fail fast during setup.

## Parameters

### options

[`CapabilityProxyOptions`](../type-aliases/CapabilityProxyOptions.md)

Action metadata captured during middleware execution

## Returns

`Pick`<[`CapabilityHelpers`](../type-aliases/CapabilityHelpers.md)<`Record`<`string`, `unknown`>>, `"assert"` \| `"can"`>

Capability helpers restricted to `assert` and `can`

## Example

```ts
const proxy = createCapabilityProxy({
	actionName: 'Post.Publish',
	requestId: 'req-123',
	namespace: 'acme',
	scope: 'crossTab',
	bridged: false,
});

await proxy.assert('posts.publish');
const allowed = await proxy.can('posts.edit');
```
