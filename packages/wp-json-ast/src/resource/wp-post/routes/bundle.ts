import type { PhpStmtClassMethod } from '@wpkernel/php-json-ast';

import type { RouteMutationMetadataPlan } from '../../../common/metadata/resourceController';
import type { RestControllerRouteHandlers } from '../../../rest-controller/routes/buildResourceControllerRouteSet';
import type { RestControllerRouteStatementsContext } from '../../../rest-controller/pipeline';
import type { ResolvedIdentity } from '../../../pipeline/identity';
import {
	WP_POST_MUTATION_CONTRACT,
	prepareWpPostResponse,
	syncWpPostMeta,
	syncWpPostTaxonomies,
	buildGetPostTypeHelper,
	buildGetStatusesHelper,
	buildNormaliseStatusHelper,
	buildResolvePostHelper,
	type MutationHelperOptions,
	type MutationHelperResource,
} from '../mutation';
import { buildWpPostListRouteStatements } from './list';
import { buildWpPostGetRouteStatements } from './get';
import {
	buildCreateRouteStatements,
	buildUpdateRouteStatements,
	buildDeleteRouteStatements,
} from './mutation';

/**
 * @category WordPress AST
 */
export interface BuildWpPostRouteBundleOptions {
	readonly resource: MutationHelperResource;
	readonly pascalName: string;
	readonly identity: ResolvedIdentity;
	readonly errorCodeFactory: (suffix: string) => string;
}

/**
 * @category WordPress AST
 */
export interface WpPostRouteBundle {
	readonly routeHandlers: RestControllerRouteHandlers;
	readonly helperMethods: readonly PhpStmtClassMethod[];
	readonly mutationMetadata: RouteMutationMetadataPlan;
}

/**
 * @param    options
 * @category WordPress AST
 */
export function buildWpPostRouteBundle(
	options: BuildWpPostRouteBundleOptions
): WpPostRouteBundle {
	const helperOptions: MutationHelperOptions = {
		resource: options.resource,
		pascalName: options.pascalName,
		identity: options.identity,
	};

	return {
		routeHandlers: buildRouteHandlers(options),
		helperMethods: buildHelperMethods(helperOptions),
		mutationMetadata: buildMutationMetadata(),
	} satisfies WpPostRouteBundle;
}

function buildRouteHandlers(
	options: BuildWpPostRouteBundleOptions
): RestControllerRouteHandlers {
	const metadataKeys = WP_POST_MUTATION_CONTRACT.metadataKeys;

	return {
		list: (context) => buildListRoute(context, options),
		get: (context) => buildGetRoute(context, options),
		create: () =>
			buildCreateRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				metadataKeys,
			}),
		update: () =>
			buildUpdateRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				metadataKeys,
				identity: options.identity,
			}),
		remove: () =>
			buildDeleteRouteStatements({
				resource: options.resource,
				pascalName: options.pascalName,
				metadataKeys,
				identity: options.identity,
			}),
	} satisfies RestControllerRouteHandlers;
}

function buildListRoute(
	context: RestControllerRouteStatementsContext,
	options: BuildWpPostRouteBundleOptions
) {
	return buildWpPostListRouteStatements({
		resource: options.resource,
		pascalName: options.pascalName,
		metadataHost: context.metadataHost,
		cacheSegments: context.metadata.cacheSegments ?? [],
	});
}

function buildGetRoute(
	context: RestControllerRouteStatementsContext,
	options: BuildWpPostRouteBundleOptions
) {
	return buildWpPostGetRouteStatements({
		resource: options.resource,
		identity: options.identity,
		pascalName: options.pascalName,
		errorCodeFactory: options.errorCodeFactory,
		metadataHost: context.metadataHost,
		cacheSegments: context.metadata.cacheSegments ?? [],
	});
}

function buildHelperMethods(
	options: MutationHelperOptions
): readonly PhpStmtClassMethod[] {
	return [
		buildGetPostTypeHelper(options),
		buildGetStatusesHelper(options),
		buildNormaliseStatusHelper(options),
		buildResolvePostHelper(options),
		syncWpPostMeta(options),
		syncWpPostTaxonomies(options),
		prepareWpPostResponse(options),
	];
}

function buildMutationMetadata(): RouteMutationMetadataPlan {
	return {
		channelTag: WP_POST_MUTATION_CONTRACT.metadataKeys.channelTag,
	} satisfies RouteMutationMetadataPlan;
}
