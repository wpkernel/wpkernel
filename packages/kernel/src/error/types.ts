/**
 * Error Types for WP Kernel
 *
 * Type definitions for error codes and contexts used throughout the framework.
 *
 * @module
 */

/**
 * Standard error codes used in WP Kernel
 */
export type ErrorCode =
	| 'TransportError' // HTTP/network errors
	| 'ServerError' // WordPress REST API errors
	| 'PolicyDenied' // Permission/capability failures
	| 'ValidationError' // Input validation failures
	| 'TimeoutError' // Request/job timeouts
	| 'NotImplementedError' // Feature not yet implemented
	| 'DeveloperError' // Invalid API usage
	| 'DeprecatedError' // Deprecated API usage
	| 'UnknownError'; // Catch-all for unexpected errors

/**
 * Context data that can be attached to any error
 */
export type ErrorContext = {
	/** Resource or action name */
	resourceName?: string;
	actionName?: string;
	policyKey?: string;

	/** Request details */
	path?: string;
	method?: string;
	status?: number;

	/** User/environment context */
	userId?: number;
	siteId?: number;

	/** Correlation ID for tracing */
	requestId?: string;

	/** Additional arbitrary data */
	[key: string]: unknown;
};

/**
 * Data payload that can be attached to errors
 */
export type ErrorData = {
	/** Original error if wrapping */
	originalError?: Error;

	/** Validation errors */
	validationErrors?: Array<{
		field: string;
		message: string;
		code?: string;
	}>;

	/** Server error details */
	serverCode?: string;
	serverMessage?: string;
	serverData?: unknown;

	/** Additional arbitrary data */
	[key: string]: unknown;
};

/**
 * Serialized error format (JSON-safe)
 */
export type SerializedError = {
	code: ErrorCode;
	message: string;
	data?: ErrorData;
	context?: ErrorContext;
	name: string;
	stack?: string;
};
