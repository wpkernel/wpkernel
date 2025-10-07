[**WP Kernel API v0.3.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / fetch

# Function: fetch()

```ts
function fetch<T>(request): Promise<TransportResponse<T>>;
```

Fetch data from WordPress REST API

Wraps @wordpress/api-fetch with:

- Automatic request ID generation
- Event emission for observability
- Error normalization
- \_fields parameter support

## Type Parameters

### T

`T` = `unknown`

Expected response data type

## Parameters

### request

[`TransportRequest`](../type-aliases/TransportRequest.md)

Request configuration

## Returns

`Promise`\<[`TransportResponse`](../type-aliases/TransportResponse.md)\<`T`\>\>

Promise resolving to response with data and metadata

## Throws

KernelError on request failure

## Example

```typescript
import { fetch } from '@geekist/wp-kernel/http';

const response = await fetch<Thing>({
	path: '/my-plugin/v1/things/123',
	method: 'GET',
});

console.log(response.data); // Thing object
console.log(response.requestId); // 'req_1234567890_abc123'
```
