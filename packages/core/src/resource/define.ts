/**
 * Resource definition and client generation
 *
 * Core function for declaring typed REST resources with automatic
 * client methods, store keys, and cache management.
 *
 * @see Product Specification § 4.1 Resources
 */
import { WPKernelError } from '../error/WPKernelError';
import type {
	ResourceCapabilityDescriptor,
	ResourceConfig,
	ResourceObject,
	ResourceRoutes,
} from './types';
import type { Reporter } from '../reporter';
import { createResourcePipeline } from '../pipeline/resources/createResourcePipeline';
import type {
	ResourcePipelineRunOptions,
	ResourcePipelineRunResult,
} from '../pipeline/resources/types';
import type { MaybePromise } from '@wpkernel/pipeline';
import { resolveNamespaceAndName } from './namespace';
import { resolveResourceReporter } from './reporter';
import type { NormalizedResourceConfig } from './buildResourceObject';
import { validateConfig } from './validation';

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
	return (
		!!value &&
		(typeof value === 'object' || typeof value === 'function') &&
		typeof (value as PromiseLike<T>).then === 'function'
	);
}

function assertSynchronousRunResult<T, TQuery>(
	result: MaybePromise<ResourcePipelineRunResult<T, TQuery>>
): ResourcePipelineRunResult<T, TQuery> {
	if (isPromiseLike(result)) {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineResource pipeline execution must complete synchronously. Received a promise from the pipeline run.',
		});
	}

	return result;
}

function buildNormalizedConfig<T, TQuery, const TRoutes extends ResourceRoutes>(
	config: ResourceConfig<T, TQuery, TRoutes>,
	resourceName: string
): NormalizedResourceConfig<T, TQuery, TRoutes> {
	return {
		...config,
		name: resourceName,
	} as NormalizedResourceConfig<T, TQuery, TRoutes>;
}

function buildResourceDefinitionOptions<
	T,
	TQuery,
	const TRoutes extends ResourceRoutes,
>({
	config,
	namespace,
	resourceName,
	reporter,
}: {
	readonly config: ResourceConfig<T, TQuery, TRoutes>;
	readonly namespace: string;
	readonly resourceName: string;
	readonly reporter: Reporter;
}): ResourcePipelineRunOptions<T, TQuery> {
	return {
		config,
		normalizedConfig: buildNormalizedConfig(config, resourceName),
		namespace,
		resourceName,
		reporter,
	} satisfies ResourcePipelineRunOptions<T, TQuery>;
}

/**
 * Infers the entity, query, and routes types from a given ResourceConfig.
 * This utility type is used to provide strong typing for the `defineResource` function.
 *
 * @template Config - The ResourceConfig type to infer from.
 * @category Resource
 */
export type InferResourceDefinition<
	Config extends ResourceConfig<unknown, unknown, ResourceRoutes>,
> =
	Config extends ResourceConfig<infer Entity, infer Query, infer Routes>
		? { entity: Entity; query: Query; routes: Routes }
		: { entity: unknown; query: unknown; routes: ResourceRoutes };

type ConfigCapabilityKeys<Config> = Config extends { routes: infer Routes }
	? {
			[K in keyof Routes]: Routes[K] extends {
				capability?: infer Capability;
			}
				? NonNullable<Capability> extends string
					? NonNullable<Capability>
					: never
				: never;
		}[keyof Routes]
	: never;

type ConfigCapabilityMap<Config> = Partial<
	Record<ConfigCapabilityKeys<Config>, string | ResourceCapabilityDescriptor>
>;

/**
 * A utility type for `defineResource` that infers capabilities from the provided ResourceConfig.
 * This type allows the `capabilities` property to be automatically typed based on the routes defined in the config.
 *
 * @template Config - The ResourceConfig type to infer capabilities from.
 * @category Resource
 */
export type ConfigWithInferredCapabilities<
	Config extends ResourceConfig<unknown, unknown, ResourceRoutes>,
> = Config & {
	readonly capabilities?: ConfigCapabilityMap<Config>;
};

/**
 * Define a resource with typed REST client
 *
 * Creates a resource object with:
 * - Typed client methods (fetchList, fetch, create, update, remove)
 * - Store key for @wordpress/data registration
 * - Cache key generators for invalidation
 * - Route definitions
 * - Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
 * - Grouped API (select.*, use.*, get.*, mutate.*, cache.*, storeApi.*, events.*)
 *
 * @template T - Resource entity type (e.g., TestimonialPost)
 * @template TQuery - Query parameters type for list operations (e.g., { search?: string })
 * @param    config - Resource configuration
 * @return Resource object with client methods and metadata
 * @throws DeveloperError if configuration is invalid
 * @category Resource
 */
export function defineResource<
	T = unknown,
	TQuery = unknown,
	const TRoutes extends ResourceRoutes = ResourceRoutes,
>(
	config: ResourceConfig<T, TQuery, TRoutes>
): ResourceObject<T, TQuery, TRoutes>;
export function defineResource<
	const Config extends ResourceConfig<unknown, unknown, ResourceRoutes>,
>(
	config: ConfigWithInferredCapabilities<Config>
): ResourceObject<
	InferResourceDefinition<Config>['entity'],
	InferResourceDefinition<Config>['query'],
	InferResourceDefinition<Config>['routes']
>;

export function defineResource<
	T = unknown,
	TQuery = unknown,
	const TRoutes extends ResourceRoutes = ResourceRoutes,
>(
	config: ResourceConfig<T, TQuery, TRoutes>
): ResourceObject<T, TQuery, TRoutes> {
	if (!config || typeof config !== 'object') {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineResource requires a configuration object with "name" and "routes".',
		});
	}

	validateConfig(config);

	if (!config.name || typeof config.name !== 'string') {
		throw new WPKernelError('DeveloperError', {
			message:
				'defineResource requires a non-empty string "name" property.',
		});
	}

	const { namespace, resourceName } = resolveNamespaceAndName(config);
	const reporter = resolveResourceReporter({
		namespace,
		resourceName,
		override: config.reporter,
	});
	const runOptions = buildResourceDefinitionOptions({
		config,
		namespace,
		resourceName,
		reporter,
	});
	const pipeline = createResourcePipeline<T, TQuery>();
	const runResult = assertSynchronousRunResult(pipeline.run(runOptions));

	if (!runResult.artifact.resource) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Resource pipeline completed without producing a resource artifact.',
		});
	}

	return runResult.artifact.resource as ResourceObject<T, TQuery, TRoutes>;
}
