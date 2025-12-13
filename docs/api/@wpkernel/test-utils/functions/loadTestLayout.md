[**@wpkernel/test-utils v0.12.6-beta.0**](../README.md)

***

[@wpkernel/test-utils](../README.md) / loadTestLayout

# Function: loadTestLayout()

```ts
function loadTestLayout(options): Promise&lt;TestLayout&gt;;
```

Backwards-compatible async loader that resolves the default layout manifest
using the production resolver. Mirrors the CLI test helper API.

## Parameters

### options

#### cwd?

`string`

#### overrides?

`Record`&lt;`string`, `string`&gt;

#### strict?

`boolean`

## Returns

`Promise`&lt;[`TestLayout`](../interfaces/TestLayout.md)&gt;
