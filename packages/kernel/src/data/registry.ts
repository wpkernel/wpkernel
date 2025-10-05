import { createActionMiddleware } from '../actions/middleware';
import type { ReduxMiddleware } from '../actions/types';
import { getNamespace } from '../namespace/detect';
import { createReporter } from '../reporter';
import type { Reporter } from '../reporter';
import { kernelEventsPlugin } from './plugins/events';
import type { KernelRegistry } from './types';

export interface KernelRegistryOptions {
	middleware?: ReduxMiddleware[];
	reporter?: Reporter;
	namespace?: string;
}

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
