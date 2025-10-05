import { KernelError } from '../../error/KernelError';
import type { ActionErrorEvent, ReduxMiddleware } from '../../actions/types';
import type { Reporter } from '../../reporter';
import type { KernelRegistry } from '../types';

export type NoticeStatus = 'success' | 'info' | 'warning' | 'error';

export interface KernelEventsPluginOptions {
	reporter?: Reporter;
	registry?: KernelRegistry;
}

interface NoticesDispatch {
	createNotice: (
		status: NoticeStatus,
		content: string,
		options?: Record<string, unknown>
	) => void;
}

type WordPressHooks = {
	addAction?: (
		hookName: string,
		namespace: string,
		callback: (payload: ActionErrorEvent) => void,
		priority?: number
	) => void;
	removeAction?: (hookName: string, namespace: string) => void;
};

interface KernelReduxMiddleware<TState = unknown>
	extends ReduxMiddleware<TState> {
	destroy?: () => void;
}

function getHooks(): WordPressHooks | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const wp = (window as Window & { wp?: { hooks?: WordPressHooks } }).wp;
	return wp?.hooks ?? null;
}

function getNoticesDispatch(
	registry: KernelRegistry | undefined
): NoticesDispatch | null {
	if (!registry || typeof registry.dispatch !== 'function') {
		return null;
	}

	try {
		const dispatch = registry.dispatch('core/notices') as unknown;
		if (
			!dispatch ||
			typeof (dispatch as NoticesDispatch).createNotice !== 'function'
		) {
			return null;
		}
		return dispatch as NoticesDispatch;
	} catch (_error) {
		return null;
	}
}

function mapErrorToStatus(error: unknown): NoticeStatus {
	if (KernelError.isKernelError(error)) {
		switch (error.code) {
			case 'PolicyDenied':
				return 'warning';
			case 'ValidationError':
				return 'info';
			default:
				return 'error';
		}
	}

	return 'error';
}

function resolveErrorMessage(error: unknown): string {
	if (KernelError.isKernelError(error)) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === 'string') {
		return error;
	}

	return 'An unexpected error occurred';
}

export function kernelEventsPlugin({
	reporter,
	registry,
}: KernelEventsPluginOptions): KernelReduxMiddleware {
	const hooks = getHooks();
	const notices = getNoticesDispatch(registry);
	const pluginNamespace = 'kernel/notices';

	let detach: (() => void) | undefined;

	const middleware: KernelReduxMiddleware = () => {
		if (hooks?.addAction) {
			const handler = (event: ActionErrorEvent) => {
				const message = resolveErrorMessage(event.error);
				const status = mapErrorToStatus(event.error);

				notices?.createNotice(status, message, {
					id: event.requestId,
					isDismissible: true,
				});

				reporter?.error(message, {
					action: event.actionName,
					requestId: event.requestId,
					namespace: event.namespace,
					status,
				});
			};

			hooks.addAction('wpk.action.error', pluginNamespace, handler);
			detach = () =>
				hooks.removeAction?.('wpk.action.error', pluginNamespace);
		}

		return (next) => (action) => next(action);
	};

	middleware.destroy = () => {
		detach?.();
		detach = undefined;
	};

	return middleware;
}
