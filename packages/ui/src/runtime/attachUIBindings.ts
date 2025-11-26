import type {
	WPKInstance,
	WPKernelUIRuntime,
	WPKernelUIAttach,
	UIIntegrationOptions,
} from '@wpkernel/core/data';
import { getRegisteredResources } from '@wpkernel/core/events';
import type { ResourceObject } from '@wpkernel/core/resource';
import { attachResourceHooks } from '../hooks/resource-hooks';
import type {
	NormalizedDataViewsRuntimeOptions,
	WPKernelDataViewsRuntime,
} from './dataviews/runtime';
import type { ResourceDataViewConfig } from '../dataviews/types';
import { DataViewsConfigurationError } from './dataviews/errors';

type RuntimeCapability = NonNullable<
	WPKernelUIRuntime['capabilities']
>['capability'];

// Allow dynamic import types for lazy-loading dataviews without tripping lint.

type DataViewsRuntimeModule = typeof import('./dataviews/runtime');

type DataViewsControllerModule =
	typeof import('../dataviews/resource-controller');

type DataViewsMetadataModule = typeof import('./dataviews/metadata');

type DataViewsModules = {
	runtime: DataViewsRuntimeModule;
	controller: DataViewsControllerModule;
	metadata: DataViewsMetadataModule;
};

function resolveCapabilityRuntime(): WPKernelUIRuntime['capabilities'] {
	const runtime = (
		globalThis as {
			__WP_KERNEL_ACTION_RUNTIME__?: { capability?: RuntimeCapability };
		}
	).__WP_KERNEL_ACTION_RUNTIME__;

	if (!runtime?.capability) {
		return undefined;
	}

	// Return the stored runtime object directly to keep a stable reference.
	return runtime as WPKernelUIRuntime['capabilities'];
}

/**
 * Attaches the UI bindings to the WPKernel instance.
 *
 * @param    wpk     - The WPKernel instance.
 * @param    kernel
 * @param    options - The UI integration options.
 * @returns The UI runtime.
 * @category Provider
 */
export const attachUIBindings: WPKernelUIAttach = (
	wpk: WPKInstance,
	options?: UIIntegrationOptions
): WPKernelUIRuntime => {
	const pendingResourceDefinitions = new Map<
		string,
		ResourceObject<unknown, unknown>
	>();
	let dataViewsModules: DataViewsModules | undefined;

	const runtime: WPKernelUIRuntime = {
		wpk,
		namespace: wpk.getNamespace(),
		reporter: wpk.getReporter(),
		registry: wpk.getRegistry(),
		events: wpk.events,
		// Use a getter to resolve capability runtime dynamically, allowing late registrations
		// via defineCapability() after attachUIBindings() has been called (e.g., lazy-loaded plugins)
		get capabilities() {
			return resolveCapabilityRuntime();
		},
		invalidate: (patterns, invalidateOptions) =>
			wpk.invalidate(patterns, invalidateOptions),
		options,
	};

	getRegisteredResources().forEach(({ resource }) => {
		const definedResource = resource as ResourceObject<unknown, unknown>;
		attachResourceHooks(definedResource, runtime);

		if (runtime.dataviews) {
			registerResourceWithDataViews(runtime, definedResource, {
				controller: dataViewsModules?.controller,
				metadata: dataViewsModules?.metadata,
			});
		} else {
			pendingResourceDefinitions.set(
				definedResource.name,
				definedResource
			);
		}
	});

	runtime.events.on('resource:defined', ({ resource }) => {
		const definedResource = resource as ResourceObject<unknown, unknown>;
		attachResourceHooks(definedResource, runtime);

		// If dataviews aren’t ready yet, keep track and register later.
		if (!runtime.dataviews) {
			pendingResourceDefinitions.set(
				definedResource.name,
				definedResource
			);
			return;
		}

		registerResourceWithDataViews(runtime, definedResource, {
			controller: dataViewsModules?.controller,
			metadata: dataViewsModules?.metadata,
		});
	});

	const dataviewsOptions = normalizeDataViewsOptions(options?.dataviews);

	if (dataviewsOptions.enable) {
		void bootstrapDataViews(runtime, wpk, dataviewsOptions, (modules) => {
			dataViewsModules = modules;

			// Register any resources that arrived before dataviews were ready.
			pendingResourceDefinitions.forEach((resource) => {
				registerResourceWithDataViews(runtime, resource, {
					controller: modules.controller,
					metadata: modules.metadata,
				});
			});
			pendingResourceDefinitions.clear();
		});
	}

	return runtime;
};

function normalizeDataViewsOptions(
	rawOptions?: UIIntegrationOptions['dataviews']
): NormalizedDataViewsRuntimeOptions {
	if (
		!rawOptions ||
		typeof rawOptions !== 'object' ||
		Array.isArray(rawOptions)
	) {
		return {
			enable: true,
			autoRegisterResources: true,
		};
	}

	const normalized: NormalizedDataViewsRuntimeOptions = {
		enable: rawOptions.enable !== false,
		autoRegisterResources: rawOptions.autoRegisterResources !== false,
	};

	if (
		Object.prototype.hasOwnProperty.call(rawOptions, 'preferences') &&
		rawOptions.preferences !== undefined &&
		rawOptions.preferences !== null
	) {
		const prefs = rawOptions.preferences as {
			get?: unknown;
			set?: unknown;
		};
		if (
			typeof prefs.get !== 'function' ||
			typeof prefs.set !== 'function'
		) {
			throw new DataViewsConfigurationError(
				'DataViews preferences adapter must implement get() and set() methods.'
			);
		}
		normalized.preferences =
			rawOptions.preferences as NormalizedDataViewsRuntimeOptions['preferences'];
	}

	return normalized;
}

function registerResourceWithDataViews<TItem, TQuery>(
	runtime: WPKernelUIRuntime,
	resource: ResourceObject<TItem, TQuery>,
	deps?: {
		controller?: DataViewsControllerModule;
		metadata?: DataViewsMetadataModule;
	}
): void {
	const dataviews = runtime.dataviews;
	if (!dataviews || dataviews.options.autoRegisterResources === false) {
		return;
	}

	const metadataModule = deps?.metadata;
	const controllerModule = deps?.controller;
	if (!metadataModule || !controllerModule) {
		return;
	}

	const metadata = validateResourceMetadata(
		resource,
		runtime,
		dataviews,
		metadataModule
	);
	if (!metadata) {
		return;
	}

	try {
		registerControllerWithRuntime(
			runtime,
			dataviews,
			resource,
			metadata,
			controllerModule
		);
	} catch (error) {
		dataviews.reporter.error?.(
			'Failed to auto-register DataViews controller',
			{
				resource: resource.name,
				error,
			}
		);
	}
}

async function loadDataViewsModules(): Promise<DataViewsModules> {
	const [runtime, controller, metadata] = await Promise.all([
		import('./dataviews/runtime'),
		import('../dataviews/resource-controller'),
		import('./dataviews/metadata'),
	]);

	return {
		runtime,
		controller,
		metadata,
	};
}

async function bootstrapDataViews(
	runtime: WPKernelUIRuntime,
	wpk: WPKInstance,
	options: NormalizedDataViewsRuntimeOptions,
	onReady?: (modules: DataViewsModules) => void
): Promise<void> {
	const modules = await loadDataViewsModules();
	const { createWPKernelDataViewsRuntime } = modules.runtime;

	const dataviewsRuntime: WPKernelDataViewsRuntime =
		createWPKernelDataViewsRuntime(wpk, runtime, options);

	runtime.dataviews = dataviewsRuntime;

	// Register existing resources now that dataviews is available
	getRegisteredResources().forEach(({ resource }) => {
		registerResourceWithDataViews(
			runtime,
			resource as ResourceObject<unknown, unknown>,
			{ controller: modules.controller, metadata: modules.metadata }
		);
	});

	if (onReady) {
		onReady(modules);
	}

	// Subsequent resources will be handled by the main resource:defined listener.
	runtime.events.on('resource:defined', ({ resource }) => {
		registerResourceWithDataViews(
			runtime,
			resource as ResourceObject<unknown, unknown>,
			{ controller: modules.controller, metadata: modules.metadata }
		);
	});
}

function validateResourceMetadata<TItem, TQuery>(
	resource: ResourceObject<TItem, TQuery>,
	runtime: WPKernelUIRuntime,
	dataviews: WPKernelDataViewsRuntime,
	metadataModule: DataViewsMetadataModule
) {
	const { normalizeResourceDataViewMetadata, DATA_VIEWS_METADATA_INVALID } =
		metadataModule;
	const { metadata, issues } = normalizeResourceDataViewMetadata(resource);

	if (issues.length > 0) {
		dataviews
			.getResourceReporter(resource.name)
			.error?.('Invalid DataViews metadata', {
				code: DATA_VIEWS_METADATA_INVALID,
				resource: resource.name,
				issues,
			});
		return undefined;
	}

	if (!metadata) {
		return undefined;
	}

	// Ensure preferencesKey is always set for downstream consumers.
	const preferencesKey =
		metadata.preferencesKey ??
		[runtime.namespace ?? 'wpkernel', resource.name]
			.filter(Boolean)
			.join('/');

	return {
		config: metadata.config,
		preferencesKey,
	};
}

function registerControllerWithRuntime<TItem, TQuery>(
	runtime: WPKernelUIRuntime,
	dataviews: WPKernelDataViewsRuntime,
	resource: ResourceObject<TItem, TQuery>,
	metadata: {
		config: ResourceDataViewConfig<TItem, TQuery>;
		preferencesKey: string;
	},
	controllerModule: DataViewsControllerModule
) {
	const { createResourceDataViewController } = controllerModule;
	const normalizedResource = resource as ResourceObject<TItem, TQuery> & {
		fetchList?: ResourceObject<TItem, TQuery>['fetchList'];
		prefetchList?: ResourceObject<TItem, TQuery>['prefetchList'];
	};

	const controller = createResourceDataViewController<TItem, TQuery>({
		resource: normalizedResource,
		config: metadata.config,
		runtime: dataviews,
		namespace: runtime.namespace,
		invalidate: runtime.invalidate,
		capabilities: () => runtime.capabilities,
		preferencesKey: metadata.preferencesKey,
		fetchList: normalizedResource.fetchList,
		prefetchList: normalizedResource.prefetchList,
	});

	dataviews.controllers.set(resource.name, controller);
	dataviews.registry.set(resource.name, {
		resource: resource.name,
		preferencesKey: controller.preferencesKey,
		metadata: metadata.config as unknown as Record<string, unknown>,
	});

	dataviews.events.registered({
		resource: resource.name,
		preferencesKey: controller.preferencesKey,
	});

	dataviews.reporter.debug?.('Auto-registered DataViews controller', {
		resource: resource.name,
		preferencesKey: controller.preferencesKey,
	});
}
