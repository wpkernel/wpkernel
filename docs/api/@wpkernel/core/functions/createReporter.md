[**@wpkernel/core v0.12.4-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / createReporter

# Function: createReporter()

```ts
function createReporter(options): Reporter;
```

Create a WPKernel reporter backed by LogLayer transports.

This is the standard reporter for browser/WordPress environments.
For CLI environments, use `createReporterCLI()` for pretty terminal output.

## Parameters

### options

[`ReporterOptions`](../type-aliases/ReporterOptions.md) = `{}`

Reporter configuration

## Returns

[`Reporter`](../type-aliases/Reporter.md)

Reporter instance with child helpers
