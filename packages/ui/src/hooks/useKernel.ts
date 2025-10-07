import { createActionMiddleware } from '@geekist/wp-kernel/actions';
import { kernelEventsPlugin } from '@geekist/wp-kernel/data';
import type {
	KernelRegistry,
	KernelRegistryOptions,
} from '@geekist/wp-kernel/data';
import { getNamespace } from '@geekist/wp-kernel/namespace';
import { createReporter } from '@geekist/wp-kernel/reporter';

/**
 * Wire the WP Kernel runtime into a given `@wordpress/data` registry.
 *
 * This is the public bootstrapping API that plugin and theme authors call to
 * "turn on" kernel behaviours for a registry. It installs the action
 * middleware, bridges lifecycle events into `wp.hooks`, forwards errors to the
 * notices store when available, and appends any user-provided middleware.
 *
 * Planned roadmap features such as background job orchestration (Sprint 6) and
 * the PHP bridge (Sprint 9) will piggy-back on the same integration point.
 *
 * @param registry - WordPress data registry instance
 * @param options  - Optional middleware configuration (namespace, reporter, custom middleware)
 * @return Cleanup function to detach middleware and remove listeners
 */
export function useKernel(
	registry: KernelRegistry,
	options: KernelRegistryOptions = {}
): () => void {
	const applyMiddleware = registry.__experimentalUseMiddleware;
	if (typeof applyMiddleware !== 'function') {
		return () => undefined;
	}

	const namespace = options.namespace ?? getNamespace();
	const reporter =
		options.reporter ??
		createReporter({ namespace, channel: 'all', level: 'debug' });

	const cleanupTasks: Array<() => void> = [];

	const actionMiddleware = createActionMiddleware();
	const detachAction = applyMiddleware(() => [
		actionMiddleware,
		...(options.middleware ?? []),
	]);
	if (typeof detachAction === 'function') {
		cleanupTasks.push(detachAction);
	}

	const eventsMiddleware = kernelEventsPlugin({
		reporter,
		registry,
	});
	const detachEvents = applyMiddleware(() => [eventsMiddleware]);
	cleanupTasks.push(() => {
		if (typeof detachEvents === 'function') {
			detachEvents();
		}
		eventsMiddleware.destroy?.();
	});

	return () => {
		while (cleanupTasks.length > 0) {
			const task = cleanupTasks.pop();
			task?.();
		}
	};
}

export type {
	KernelRegistry,
	KernelRegistryOptions,
} from '@geekist/wp-kernel/data';
