[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / createTransports

# Function: createTransports()

```ts
function createTransports(channel, level): LogLayerTransport&lt;any&gt; | LogLayerTransport&lt;any&gt;[];
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

`LogLayerTransport`&lt;`any`&gt; \| `LogLayerTransport`&lt;`any`&gt;[]

Transport or array of transports
