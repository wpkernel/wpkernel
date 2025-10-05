[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [http](../README.md) / fetch

# Function: fetch()

```ts
function fetch<T>(request): Promise<TransportResponse<T>>;
```

Defined in: [http/fetch.ts:179](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/http/fetch.ts#L179)

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

[`TransportRequest`](../interfaces/TransportRequest.md)

Request configuration

## Returns

`Promise`\<[`TransportResponse`](../interfaces/TransportResponse.md)\<`T`\>\>

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
