import { KernelError } from '@geekist/wp-kernel';
import type { ErrorCode, ErrorContext, ErrorData } from '@geekist/wp-kernel';

type ShowcaseActionErrorOptions = {
	message?: string;
	data?: ErrorData;
	context?: ErrorContext;
};

/**
 * ShowcaseActionError standardizes failures raised from showcase actions.
 */
export class ShowcaseActionError extends KernelError {
	constructor(code: ErrorCode, options: ShowcaseActionErrorOptions = {}) {
		super(code, options);
		this.name = 'ShowcaseActionError';
	}

	/**
	 * Wrap arbitrary errors so callers can depend on a consistent type.
	 *
	 * @param error           - Unknown error thrown by lower-level utilities
	 * @param options         - Mapping data and default code/context
	 * @param options.code
	 * @param options.context
	 */
	static fromUnknown(
		error: unknown,
		options: { code?: ErrorCode; context?: ErrorContext } = {}
	): ShowcaseActionError {
		if (error instanceof ShowcaseActionError) {
			return error;
		}

		if (error instanceof KernelError) {
			return new ShowcaseActionError(error.code, {
				message: error.message,
				data: error.data,
				context: {
					...error.context,
					...options.context,
				},
			});
		}

		const fallbackMessage =
			error instanceof Error
				? error.message
				: 'Unexpected error occurred';

		return new ShowcaseActionError(options.code ?? 'UnknownError', {
			message: fallbackMessage,
			data: error instanceof Error ? { originalError: error } : undefined,
			context: options.context,
		});
	}
}
