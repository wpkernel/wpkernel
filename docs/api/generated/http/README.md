[**WP Kernel API v0.3.0**](../README.md)

---

[WP Kernel API](../README.md) / http

# http

Transport Module for WP Kernel

Provides HTTP transport layer wrapping @wordpress/api-fetch with:

- Request correlation via unique IDs
- Event emission for observability
- Error normalization to KernelError
- Query parameter and field filtering support

## Type Aliases

- [HttpMethod](type-aliases/HttpMethod.md)
- [TransportRequest](type-aliases/TransportRequest.md)
- [TransportResponse](type-aliases/TransportResponse.md)
- [ResourceRequestEvent](type-aliases/ResourceRequestEvent.md)
- [ResourceResponseEvent](type-aliases/ResourceResponseEvent.md)
- [ResourceErrorEvent](type-aliases/ResourceErrorEvent.md)

## Functions

- [fetch](functions/fetch.md)
