/* istanbul ignore file -- Covered indirectly via integration suites; individual branch instrumentation remains unstable. */
import {
	type RestControllerRoutePlan,
	type ResourceControllerRouteMetadata,
	type BuildResourceControllerRouteSetOptions,
	buildResourceControllerRouteSet,
	type RestControllerRouteHandlers,
	type WpPostRouteBundle,
} from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../ir';
import {
	type ControllerBuildContext,
	type StorageArtifacts,
	type ResourceStorageMode,
} from './controller.planTypes';
import { buildRouteMethodName } from './controller.routeNames';
import { buildRouteSetOptions } from './controller.routeSetOptions';

/**
 * Builds per-route plans for a resource controller.
 *
 * @param    options
 * @category Builders
 */
export function buildRoutePlans(
	options: ControllerBuildContext
): readonly RestControllerRoutePlan[] {
	return options.resource.routes.map((route, index) => {
		const currentRouteMetadata = options.routeMetadataList[index];
		if (!currentRouteMetadata) {
			throw new Error(
				'Expected route metadata to be defined for resource route.'
			);
		}

		return buildRoutePlan({
			...options,
			route,
			currentRouteMetadata,
		});
	});
}
interface RoutePlanOptions extends ControllerBuildContext {
	readonly route: IRResource['routes'][number];
	readonly currentRouteMetadata: ResourceControllerRouteMetadata;
}
/**
 * Builds a single route plan including fallback analysis.
 *
 * @param    options
 * @category Builders
 */
function buildRoutePlan(options: RoutePlanOptions): RestControllerRoutePlan {
	const { ir, route, currentRouteMetadata } = options;

	const fallbackAnalysis = analyseRouteSupport({
		resourceName: options.resource.name,
		storageMode: options.resource.storage?.mode,
		route,
		routeMetadata: currentRouteMetadata,
		storageArtifacts: options.storageArtifacts,
		wpPostRouteBundle: options.wpPostRouteBundle,
	});

	if (!fallbackAnalysis.supported) {
		const context = buildFallbackLogContext({
			resourceName: options.resource.name,
			route,
			routeMetadata: currentRouteMetadata,
			storageMode: options.resource.storage?.mode,
			reason: fallbackAnalysis.reason,
			hint: fallbackAnalysis.hint,
		});

		options.reporter.warn('Route emitted Not Implemented stub.', context);
	}

	const routeSetOptions: BuildResourceControllerRouteSetOptions = {
		plan: {
			definition: {
				method: route.method,
				path: route.path,
				capability: route.capability,
			},
			methodName: buildRouteMethodName(route, ir),
		},
		...buildRouteSetOptions({
			resource: options.resource,
			route: options.route,
			identity: options.identity,
			pascalName: options.pascalName,
			errorCodeFactory: options.errorCodeFactory,
			storageArtifacts: options.storageArtifacts,
			wpPostRouteBundle: options.wpPostRouteBundle,
		}),
		fallbackContext: {
			resource: options.resource.name,
			transport: route.transport,
			kind: currentRouteMetadata.kind,
			storageMode: options.resource.storage?.mode,
			reason: fallbackAnalysis.reason,
			hint: fallbackAnalysis.hint,
		},
	} as BuildResourceControllerRouteSetOptions;

	return buildResourceControllerRouteSet(routeSetOptions);
}

/**
 * Analyses whether a controller route can be implemented for the configured storage.
 *
 * @param    options
 * @category Builders
 */
export function analyseRouteSupport(
	options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	const storageMode = options.storageMode;
	if (!storageMode) {
		return {
			supported: false,
			reason: 'Resource has no storage configuration.',
			hint: `Add a storage mode to resources.${options.resourceName} or mark the route transport as "remote".`,
		} satisfies RouteSupportAnalysisResult;
	}

	switch (storageMode) {
		case 'wp-post':
			return analyseWpPostSupport(options);
		case 'wp-taxonomy':
			return analyseWpTaxonomySupport(options);
		case 'wp-option':
			return analyseWpOptionSupport(options);
		case 'transient':
			return analyseTransientSupport(options);
		default:
			return {
				supported: false,
				reason: `Storage mode "${storageMode}" is not supported by the PHP generator.`,
				hint: 'Use wp-post, wp-option, wp-taxonomy, or transient storage, or extend the pipeline with a custom helper.',
			} satisfies RouteSupportAnalysisResult;
	}
}
function analyseWpPostSupport(
	_options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	return { supported: true } satisfies RouteSupportAnalysisResult;
}
function analyseWpTaxonomySupport(
	_options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	return { supported: true } satisfies RouteSupportAnalysisResult;
}
function analyseWpOptionSupport(
	_options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	return { supported: true } satisfies RouteSupportAnalysisResult;
}
function analyseTransientSupport(
	_options: RouteSupportAnalysisOptions
): RouteSupportAnalysisResult {
	return { supported: true } satisfies RouteSupportAnalysisResult;
}
/**
 * Options supplied to the storage compatibility analyser.
 *
 * @category Builders
 */
export interface RouteSupportAnalysisOptions {
	readonly resourceName: string;
	readonly storageMode: ResourceStorageMode | undefined;
	readonly route: IRResource['routes'][number];
	readonly routeMetadata: ResourceControllerRouteMetadata;
	readonly storageArtifacts: StorageArtifacts;
	readonly wpPostRouteBundle?: WpPostRouteBundle;
}

/**
 * Result describing whether a route is supported and, when not, why.
 *
 * @category Builders
 */
export interface RouteSupportAnalysisResult {
	readonly supported: boolean;
	readonly reason?: string;
	readonly hint?: string;
}
const ROUTE_KIND_TO_HANDLER: Record<
	ResourceControllerRouteMetadata['kind'],
	keyof RestControllerRouteHandlers | undefined
> = {
	list: 'list',
	get: 'get',
	create: 'create',
	update: 'update',
	remove: 'remove',
	custom: 'custom',
};

/**
 * Maps REST route metadata kinds to the corresponding handler in a storage bundle.
 *
 * @param    handlers
 * @param    kind
 * @category Builders
 */
export function resolveHandlerForKind(
	handlers: RestControllerRouteHandlers | undefined,
	kind: ResourceControllerRouteMetadata['kind']
) {
	if (!handlers) {
		return undefined;
	}

	const key = ROUTE_KIND_TO_HANDLER[kind];
	return key ? handlers[key] : undefined;
}
interface BuildFallbackLogContextOptions {
	readonly resourceName: string;
	readonly route: IRResource['routes'][number];
	readonly routeMetadata: ResourceControllerRouteMetadata;
	readonly storageMode: ResourceStorageMode | undefined;
	readonly reason?: string;
	readonly hint?: string;
}

/**
 * Builds the structured log payload describing an unsupported route.
 *
 * @param    options
 * @category Builders
 */
export function buildFallbackLogContext(
	options: BuildFallbackLogContextOptions
): Record<string, unknown> {
	const context: Record<string, unknown> = {
		resource: options.resourceName,
		method: options.route.method,
		path: options.route.path,
		kind: options.routeMetadata.kind,
		transport: options.route.transport,
	};

	if (options.storageMode) {
		context.storageMode = options.storageMode;
	}

	if (options.reason) {
		context.reason = options.reason;
	}

	if (options.hint) {
		context.hint = options.hint;
	}

	return context;
}
