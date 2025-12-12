[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / fetch

# Function: fetch()

```ts
function fetch&lt;T&gt;(request): Promise&lt;TransportResponse&lt;T&gt;&gt;;
```

Fetch data from WordPress REST API

Wraps @wordpress/api-fetch with:
- Automatic request ID generation
- Event emission for observability
- Error normalization
- _fields parameter support

## Type Parameters

### T

`T` = `unknown`

Expected response data type

## Parameters

### request

[`TransportRequest`](../type-aliases/TransportRequest.md)

Request configuration

## Returns

`Promise`&lt;[`TransportResponse`](../type-aliases/TransportResponse.md)&lt;`T`&gt;&gt;

Promise resolving to response with data and metadata

## Throws

WPKernelError on request failure

## Example

```typescript
import { fetch } from '@wpkernel/core/http';

const response = await fetch&lt;Thing&gt;({
  path: '/my-plugin/v1/things/123',
  method: 'GET'
});

console.log(response.data); // Thing object
console.log(response.requestId); // 'req_1234567890_abc123'
```
