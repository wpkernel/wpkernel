import {
	buildResourceControllerRouteMetadata,
	collectCanonicalBasePaths,
	renderPhpValue,
	resolveIdentityConfig,
	type RestControllerResourcePlan,
} from '@wpkernel/wp-json-ast';
import {
	buildCacheKeyPlan,
	buildStorageArtifacts,
	resolveRouteMutationMetadata,
} from './controller.storageArtifacts';
import { buildRoutePlans } from './controller.routePlans';
import { buildRestArgs } from './controller.restArgs';
import { readWpPostRouteBundle } from './controller.wpPostRoutes';
import { toPascalCase, makeErrorCodeFactory, sanitizeJson } from '../../utils';
import type { IRv1, IRResource } from '../../ir';
import type { BuilderApplyOptions } from '../../runtime/types';
import type {
	ResourceStorageHelperState,
	WpPostRouteHelperState,
} from './types';

/**
 * Options for generating controller plans across every resource in the IR.
 *
 * @category Builders
 */
export interface BuildResourcePlansOptions {
	readonly ir: IRv1;
	readonly storageState: ResourceStorageHelperState;
	readonly wpPostRoutesState: WpPostRouteHelperState;
	readonly reporter: BuilderApplyOptions['reporter'];
}

/**
 * Arguments for generating an individual resource controller plan.
 *
 * @category Builders
 */
export interface ResourcePlanOptions {
	readonly ir: IRv1;
	readonly resource: IRResource;
	readonly storageState: ResourceStorageHelperState;
	readonly wpPostRoutesState: WpPostRouteHelperState;
	readonly reporter: BuilderApplyOptions['reporter'];
}

/**
 * Builds REST controller plans for every IR resource.
 *
 * @param    options
 * @category Builders
 */
export function buildResourcePlans(
	options: BuildResourcePlansOptions
): readonly RestControllerResourcePlan[] {
	return options.ir.resources.map((resource) =>
		buildResourcePlan({
			ir: options.ir,
			resource,
			storageState: options.storageState,
			wpPostRoutesState: options.wpPostRoutesState,
			reporter: options.reporter,
		})
	);
}

/**
 * Builds a REST controller plan for a specific resource.
 *
 * @param    options
 * @category Builders
 */
export function buildResourcePlan(
	options: ResourcePlanOptions
): RestControllerResourcePlan {
	const { ir, resource, storageState, wpPostRoutesState } = options;
	const identity = resolveIdentityConfig(resource);
	const pascalName = toPascalCase(resource.name);
	const errorCodeFactory = makeErrorCodeFactory(resource.name);

	const wpPostRouteBundle = readWpPostRouteBundle(
		wpPostRoutesState,
		resource.name
	);

	const storageArtifacts = buildStorageArtifacts({
		resource,
		storageState,
	});

	const routeDefinitions = resource.routes.map((route) => ({
		method: route.method,
		path: route.path,
	}));
	const canonicalBasePaths = collectCanonicalBasePaths(
		routeDefinitions,
		identity.param
	);
	const mutationMetadata =
		wpPostRouteBundle?.mutationMetadata ??
		resolveRouteMutationMetadata(resource);
	const routeMetadataList = buildResourceControllerRouteMetadata({
		routes: routeDefinitions,
		identity: { param: identity.param },
		canonicalBasePaths,
		cacheKeys: buildCacheKeyPlan(resource),
		mutationMetadata,
	});

	const helperMethods = [
		...storageArtifacts.helperMethods,
		...(wpPostRouteBundle?.helperMethods ?? []),
	];
	const helperSignatures = storageArtifacts.helperSignatures;

	return {
		name: resource.name,
		className: `${pascalName}Controller`,
		schemaKey: resource.schemaKey,
		schemaProvenance: resource.schemaProvenance,
		restArgsExpression: renderPhpValue(
			sanitizeJson(buildRestArgs(ir.schemas, resource))
		),
		identity,
		cacheKeys: resource.cacheKeys,
		mutationMetadata,
		helperMethods,
		helperSignatures,
		routes: buildRoutePlans({
			ir,
			resource,
			identity,
			pascalName,
			errorCodeFactory,
			storageArtifacts,
			wpPostRouteBundle,
			reporter: options.reporter,
			routeMetadataList,
		}),
	} satisfies RestControllerResourcePlan;
}
