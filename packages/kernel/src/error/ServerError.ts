/**
 * Server Error for WP Kernel
 *
 * Represents errors returned by WordPress REST API endpoints.
 * Parses WordPress REST error responses into structured format.
 *
 * @module
 */

import { KernelError } from './KernelError';
import type { ErrorContext } from './types';

/**
 * WordPress REST API error response shape
 *
 * This interface represents the standard error format returned by WordPress REST API.
 *
 * @public
 */
export type WordPressRESTError = {
	/** Error code from WordPress (e.g., 'rest_forbidden', 'invalid_param') */
	code: string;
	/** Human-readable error message */
	message: string;
	/** Additional error data */
	data?: {
		/** HTTP status code */
		status?: number;
		/** Invalid parameters that caused the error */
		params?: Record<string, string>;
		/** Detailed validation or error information */
		details?: Record<string, unknown>;
		[key: string]: unknown;
	};
};

/**
 * Error thrown when WordPress REST API returns an error
 *
 * @example
 * ```typescript
 * throw new ServerError({
 *   serverCode: 'rest_forbidden',
 *   serverMessage: 'Sorry, you are not allowed to do that.',
 *   status: 403,
 *   path: '/wpk/v1/things',
 *   method: 'POST'
 * });
 * ```
 */
export class ServerError extends KernelError {
	/**
	 * WordPress error code (e.g., 'rest_forbidden', 'rest_invalid_param')
	 */
	public readonly serverCode: string;

	/**
	 * WordPress error message
	 */
	public readonly serverMessage: string;

	/**
	 * HTTP status code
	 */
	public readonly status: number;

	/**
	 * Request path
	 */
	public readonly path: string;

	/**
	 * HTTP method
	 */
	public readonly method: string;

	/**
	 * Additional server data
	 */
	public readonly serverData?: Record<string, unknown>;

	/**
	 * Create a new ServerError
	 *
	 * @param options               - Server error options
	 * @param options.serverCode
	 * @param options.serverMessage
	 * @param options.status
	 * @param options.path
	 * @param options.method
	 * @param options.serverData
	 * @param options.context
	 */
	constructor(options: {
		serverCode: string;
		serverMessage: string;
		status: number;
		path: string;
		method: string;
		serverData?: Record<string, unknown>;
		context?: ErrorContext;
	}) {
		super('ServerError', {
			message: options.serverMessage,
			data: {
				serverCode: options.serverCode,
				serverMessage: options.serverMessage,
				serverData: options.serverData,
			},
			context: {
				...options.context,
				status: options.status,
				path: options.path,
				method: options.method,
			},
		});

		this.name = 'ServerError';
		this.serverCode = options.serverCode;
		this.serverMessage = options.serverMessage;
		this.status = options.status;
		this.path = options.path;
		this.method = options.method;
		this.serverData = options.serverData;

		// Set prototype explicitly
		Object.setPrototypeOf(this, ServerError.prototype);
	}

	/**
	 * Parse WordPress REST API error response into ServerError
	 *
	 * @param response - WordPress REST error response
	 * @param path     - Request path
	 * @param method   - HTTP method
	 * @param context  - Additional context
	 * @return New ServerError instance
	 */
	public static fromWordPressResponse(
		response: WordPressRESTError,
		path: string,
		method: string,
		context?: ErrorContext
	): ServerError {
		const status = response.data?.status || 500;

		return new ServerError({
			serverCode: response.code,
			serverMessage: response.message,
			status,
			path,
			method,
			serverData: response.data,
			context,
		});
	}

	/**
	 * Check if this is a permission/capability error
	 *
	 * @return True if this is a permission error
	 */
	public isPermissionError(): boolean {
		return (
			this.serverCode === 'rest_forbidden' ||
			this.serverCode === 'rest_cannot_create' ||
			this.serverCode === 'rest_cannot_edit' ||
			this.serverCode === 'rest_cannot_delete' ||
			this.serverCode === 'rest_cannot_read' ||
			this.status === 403
		);
	}

	/**
	 * Check if this is a validation error
	 *
	 * @return True if this is a validation error
	 */
	public isValidationError(): boolean {
		return (
			this.serverCode === 'rest_invalid_param' ||
			this.serverCode === 'rest_missing_callback_param' ||
			this.status === 400
		);
	}

	/**
	 * Check if this is a "not found" error
	 *
	 * @return True if resource was not found
	 */
	public isNotFoundError(): boolean {
		return (
			this.serverCode === 'rest_post_invalid_id' ||
			this.serverCode === 'rest_not_found' ||
			this.status === 404
		);
	}

	/**
	 * Extract validation errors from server response
	 *
	 * @return Array of validation errors if available
	 */
	public getValidationErrors(): Array<{
		field: string;
		message: string;
		code?: string;
	}> {
		if (!this.serverData?.params) {
			return [];
		}

		return Object.entries(
			this.serverData.params as Record<string, string>
		).map(([field, message]) => ({
			field,
			message,
			code: this.serverCode,
		}));
	}
}
