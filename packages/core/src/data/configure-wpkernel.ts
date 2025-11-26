import type {
	WPKernelRegistry,
	ConfigureWPKernelOptions,
	WPKInstance,
	WPKUIConfig,
	WPKernelUIAttach,
	WPKernelUIRuntime,
} from './types';
import { getNamespace as detectNamespace } from '../namespace/detect';
import { createReporter, setWPKernelReporter } from '../reporter';
import { resolveReporter as resolveKernelReporter } from '../reporter/resolve';
import { invalidate as invalidateCache } from '../resource/cache';
import type { CacheKeyPattern, InvalidateOptions } from '../resource/cache';
import { WPKernelError } from '../error/WPKernelError';
import { WPK_SUBSYSTEM_NAMESPACES } from '../contracts/index.js';
import {
	getWPKernelEventBus,
	type WPKernelEventBus,
	setWPKernelEventBus,
} from '../events/bus';
import { createActionMiddleware } from '../actions/middleware';
import { wpkEventsPlugin } from './plugins/events';
import { defineResource as baseDefineResource } from '../resource/define';
import type { ResourceConfig, ResourceObject } from '../resource/types';

type CleanupTask = () => void;

function resolveRegistry(
	registry?: WPKernelRegistry
): WPKernelRegistry | undefined {
	if (registry) {
		return registry;
	}

	if (typeof getWPData === 'function') {
		return getWPData() as unknown as WPKernelRegistry | undefined;
	}

	return undefined;
}

function resolveNamespace(explicit?: string): string {
	return explicit ?? detectNamespace();
}

function normalizeUIConfig(config?: WPKUIConfig): {
	enable: boolean;
	options?: WPKUIConfig['options'];
	attach?: WPKernelUIAttach;
} {
	return {
		enable: Boolean(config?.enable ?? config?.attach),
		options: config?.options,
		attach: config?.attach,
	};
}

function emitEvent(
	bus: WPKernelEventBus,
	eventName: string,
	payload: unknown
): void {
	if (!eventName || typeof eventName !== 'string') {
		throw new WPKernelError('DeveloperError', {
			message: 'WPKernel emit requires a non-empty string event name.',
		});
	}

	bus.emit('custom:event', { eventName, payload });
}

function extractResourceName(name: string): string {
	if (!name.includes(':')) {
		return name;
	}

	const [, resourceName] = name.split(':', 2);
	return resourceName || name;
}

/**
 * Configure and bootstrap the WPKernel runtime for the current namespace.
 *
 * The helper wires middleware, reporters, the shared event bus, and optional UI
 * bindings. It returns a `WPKInstance` that exposes integration hooks for
 * invalidation, telemetry, and teardown.
 *
 * @param    options - Runtime configuration including registry, middleware, and UI hooks
 * @return Configured WPKernel instance with lifecycle helpers
 *
 * @example
 * ```ts
 * import { configureWPKernel } from '@wpkernel/core/data';
 * import { registerWPKernelStore } from '@wpkernel/core/data';
 *
 * const wpk = configureWPKernel({
 *   namespace: 'acme',
 *   registry: registerWPKernelStore('acme/store', storeConfig),
 * });
 *
 * wpk.invalidate(['post', 'list']);
 * wpk.emit('acme.post.published', { id: 101 });
 * ```
 * @category Data
 */
export function configureWPKernel(
	options: ConfigureWPKernelOptions = {}
): WPKInstance {
	const registry = resolveRegistry(options.registry);
	const namespace = resolveNamespace(options.namespace);
	const reporter = resolveKernelReporter({
		override: options.reporter,
		fallback: () =>
			createReporter({
				namespace,
				channel: 'all',
				level: 'debug',
			}),
		cache: true,
		cacheKey: `${WPK_SUBSYSTEM_NAMESPACES.ACTIONS}.configure.${namespace}`,
	});
	const ui = normalizeUIConfig(options.ui);

	const events = getWPKernelEventBus();
	setWPKernelEventBus(events);
	setWPKernelReporter(reporter);
	const cleanupTasks: CleanupTask[] = [() => setWPKernelReporter(undefined)];
	let uiRuntime: WPKernelUIRuntime | undefined;

	if (
		registry &&
		typeof registry.__experimentalUseMiddleware === 'function'
	) {
		const actionMiddleware = createActionMiddleware();

		const detachActions = registry.__experimentalUseMiddleware(() => [
			actionMiddleware,
			...(options.middleware ?? []),
		]);
		if (typeof detachActions === 'function') {
			cleanupTasks.push(detachActions);
		}

		const eventsMiddleware = wpkEventsPlugin({
			reporter,
			registry,
			events,
		});

		const detachEvents = registry.__experimentalUseMiddleware(() => [
			eventsMiddleware,
		]);

		cleanupTasks.push(() => {
			if (typeof detachEvents === 'function') {
				detachEvents();
			}
			eventsMiddleware.destroy?.();
		});
	}

	const wpk: WPKInstance = {
		getNamespace() {
			return namespace;
		},
		getReporter() {
			return reporter;
		},
		invalidate(
			patterns: CacheKeyPattern | CacheKeyPattern[],
			opts?: InvalidateOptions
		) {
			invalidateCache(patterns, {
				...(opts ?? {}),
				registry,
				reporter: opts?.reporter ?? reporter.child('cache'),
				namespace,
			});
		},
		emit(eventName: string, payload: unknown) {
			emitEvent(events, eventName, payload);
		},
		teardown() {
			while (cleanupTasks.length > 0) {
				const task = cleanupTasks.pop();
				try {
					task?.();
				} catch (error) {
					if (process.env.NODE_ENV === 'development') {
						reporter.error(
							'WPKernel teardown failed',
							error instanceof Error
								? error
								: new Error(String(error))
						);
					}
				}
			}
		},
		getRegistry() {
			return registry;
		},
		hasUIRuntime() {
			return Boolean(uiRuntime);
		},
		getUIRuntime() {
			return uiRuntime;
		},
		attachUIBindings(attach: WPKernelUIAttach, attachOptions) {
			uiRuntime = attach(wpk, attachOptions ?? ui.options);
			return uiRuntime;
		},
		ui: {
			isEnabled() {
				return Boolean(uiRuntime);
			},
			options: ui.options,
		},
		events,
		defineResource<T = unknown, TQuery = unknown>(
			resourceConfig: ResourceConfig<T, TQuery>
		): ResourceObject<T, TQuery> {
			const resourceName = extractResourceName(resourceConfig.name);
			const resourceReporter =
				resourceConfig.reporter ??
				reporter.child(`resource.${resourceName}`);

			const shouldApplyWpkNamespace =
				resourceConfig.namespace === undefined &&
				!resourceConfig.name.includes(':');

			return baseDefineResource<T, TQuery>({
				...resourceConfig,
				reporter: resourceReporter,
				...(shouldApplyWpkNamespace ? { namespace } : {}),
			});
		},
	};

	if (ui.attach && ui.enable) {
		wpk.attachUIBindings(ui.attach, ui.options);
	}

	return wpk;
}
