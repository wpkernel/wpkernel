import {
	createActionMiddleware,
	createReporter,
	getNamespace,
	kernelEventsPlugin,
} from '@geekist/wp-kernel';
import type {
	KernelRegistry,
	KernelRegistryOptions,
} from '@geekist/wp-kernel/data';

/**
 * Register WP Kernel middleware within a WordPress data registry.
 *
 * Mirrors the historical `useKernel()` helper that lived inside
 * `@geekist/wp-kernel`, but is now part of the UI integration surface.
 *
 * @param registry - WordPress data registry instance
 * @param options  - Optional middleware configuration
 * @return Cleanup function to detach middleware
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
