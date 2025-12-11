[**@wpkernel/core v0.12.3-beta.2**](../README.md)

---

[@wpkernel/core](../README.md) / createTransports

# Function: createTransports()

```ts
function createTransports(channel, level): LogLayerTransport<any> | LogLayerTransport<any>[];
```

Create transports for browser/WordPress environments.
CLI packages should construct their own transports using SimplePrettyTerminalTransport.

## Parameters

### channel

[`ReporterChannel`](../type-aliases/ReporterChannel.md)

Reporter channel ('console', 'hooks', 'all')

### level

`LogLevelType`

Log level

## Returns

`LogLayerTransport`<`any`> \| `LogLayerTransport`<`any`>[]

Transport or array of transports
