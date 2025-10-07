/**
 * Transport layer types
 *
 * Provides type definitions for REST requests/responses
 * used by the resource client.
 */

/**
 * HTTP methods supported by the transport layer
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request options for transport.fetch()
 */
export type TransportRequest = {
	/**
	 * REST API path (e.g., '/my-plugin/v1/things' or '/my-plugin/v1/things/123')
	 */
	path: string;

	/**
	 * HTTP method
	 */
	method: HttpMethod;

	/**
	 * Request body (for POST/PUT/PATCH)
	 */
	data?: unknown;

	/**
	 * Query parameters (automatically appended to path)
	 */
	query?: Record<string, unknown>;

	/**
	 * Fields to request (_fields query parameter)
	 * If provided, will be added as ?_fields=field1,field2
	 */
	fields?: string[];

	/**
	 * Custom request ID for correlation (generated if not provided)
	 */
	requestId?: string;
};

/**
 * Response from transport.fetch()
 */
export type TransportResponse<T = unknown> = {
	/**
	 * Response data
	 */
	data: T;

	/**
	 * HTTP status code
	 */
	status: number;

	/**
	 * Response headers
	 */
	headers: Record<string, string>;

	/**
	 * Request ID used for this request (for correlation)
	 */
	requestId: string;
};

/**
 * Event payload for wpk.resource.request
 */
export type ResourceRequestEvent = {
	/**
	 * Request ID for correlation
	 */
	requestId: string;

	/**
	 * HTTP method
	 */
	method: HttpMethod;

	/**
	 * Request path
	 */
	path: string;

	/**
	 * Query parameters (if any)
	 */
	query?: Record<string, unknown>;

	/**
	 * Timestamp when request started
	 */
	timestamp: number;
};

/**
 * Event payload for wpk.resource.response
 */
export type ResourceResponseEvent<T = unknown> = {
	/**
	 * Request ID for correlation
	 */
	requestId: string;

	/**
	 * HTTP method
	 */
	method: HttpMethod;

	/**
	 * Request path
	 */
	path: string;

	/**
	 * Response status code
	 */
	status: number;

	/**
	 * Response data
	 */
	data: T;

	/**
	 * Duration in milliseconds
	 */
	duration: number;

	/**
	 * Timestamp when response received
	 */
	timestamp: number;
};

/**
 * Event payload for wpk.resource.error
 */
export type ResourceErrorEvent = {
	/**
	 * Request ID for correlation
	 */
	requestId: string;

	/**
	 * HTTP method
	 */
	method: HttpMethod;

	/**
	 * Request path
	 */
	path: string;

	/**
	 * Error code
	 */
	code: string;

	/**
	 * Error message
	 */
	message: string;

	/**
	 * HTTP status code (if available)
	 */
	status?: number;

	/**
	 * Duration in milliseconds
	 */
	duration: number;

	/**
	 * Timestamp when error occurred
	 */
	timestamp: number;
};
