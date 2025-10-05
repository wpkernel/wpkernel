/**
 * Policy Denied Error for WP Kernel
 *
 * Thrown when a policy check fails via `policy.assert()` or action context.
 * Includes i18n-friendly messageKey for user-facing error messages.
 *
 * @module
 */

import { KernelError } from './KernelError';
import type { ErrorContext, ErrorData } from './types';

/**
 * Error thrown when a policy assertion fails
 *
 * @example
 * ```typescript
 * throw new PolicyDeniedError({
 *   namespace: 'my-plugin',
 *   policyKey: 'posts.edit',
 *   params: { postId: 123 },
 *   message: 'You do not have permission to edit this post'
 * });
 * ```
 */
export class PolicyDeniedError extends KernelError {
	/**
	 * I18n message key for user-facing error messages
	 * Format: `policy.denied.{namespace}.{policyKey}`
	 */
	public readonly messageKey: string;

	/**
	 * Policy key that was denied
	 */
	public readonly policyKey: string;

	/**
	 * Plugin namespace
	 */
	public readonly namespace: string;

	/**
	 * Create a new PolicyDeniedError
	 *
	 * @param options           - Policy denied error options
	 * @param options.namespace - Plugin namespace
	 * @param options.policyKey - Policy key that was denied
	 * @param options.params    - Parameters passed to policy check
	 * @param options.message   - Optional custom error message
	 * @param options.data      - Additional error data
	 * @param options.context   - Additional error context
	 */
	constructor(options: {
		namespace: string;
		policyKey: string;
		params?: unknown;
		message?: string;
		data?: ErrorData;
		context?: ErrorContext;
	}) {
		const message =
			options.message || `Policy "${options.policyKey}" denied.`;
		const messageKey = `policy.denied.${options.namespace}.${options.policyKey}`;

		// Build context with policyKey and params
		const context: ErrorContext = {
			...options.context,
			policyKey: options.policyKey,
		};

		// Merge params into context
		if (options.params && typeof options.params === 'object') {
			Object.assign(context, options.params as Record<string, unknown>);
		} else if (options.params !== undefined) {
			context.value = options.params;
		}

		super('PolicyDenied', {
			message,
			data: options.data,
			context,
		});

		this.name = 'PolicyDeniedError';
		this.messageKey = messageKey;
		this.policyKey = options.policyKey;
		this.namespace = options.namespace;

		// Set prototype explicitly for proper instanceof checks
		Object.setPrototypeOf(this, PolicyDeniedError.prototype);
	}
}
