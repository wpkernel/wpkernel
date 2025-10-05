/**
 * Error Module for WP Kernel
 *
 * Exports all error types and utilities for consistent error handling throughout the framework.
 *
 * @module
 */

export { KernelError } from './KernelError';
export { TransportError } from './TransportError';
export { ServerError } from './ServerError';
export { PolicyDeniedError } from './PolicyDeniedError';
export type { WordPressRESTError } from './ServerError';
export type {
	ErrorCode,
	ErrorContext,
	ErrorData,
	SerializedError,
} from './types';
