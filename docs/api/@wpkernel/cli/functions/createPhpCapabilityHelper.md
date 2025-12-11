[**@wpkernel/cli v0.12.3-beta.1**](../README.md)

***

[@wpkernel/cli](../README.md) / createPhpCapabilityHelper

# Function: createPhpCapabilityHelper()

```ts
function createPhpCapabilityHelper(): BuilderHelper;
```

Creates a PHP builder helper for generating capability-related code.

This helper processes the `capabilityMap` from the IR and generates PHP
classes and functions that define and manage WordPress capabilities,
ensuring proper access control for REST routes.

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)

A `BuilderHelper` instance for generating capability code.
