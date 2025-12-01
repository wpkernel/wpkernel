import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	PipelineContext,
} from '../../runtime/types';
import { makeErrorCodeFactory, toPascalCase } from './utils';
export { resolveIdentityConfig } from '@wpkernel/wp-json-ast';

import {
	buildWpPostRouteBundle,
	resolveIdentityConfig,
	type WpPostRouteBundle,
} from '@wpkernel/wp-json-ast';
import {
	type WpPostRouteHelperState,
	type WpPostRouteHelperHost,
	type PopulateWpPostRouteBundlesOptions,
} from './types';

export const WP_POST_ROUTE_HELPER_SYMBOL = Symbol(
	'@wpkernel/cli/resource/wpPost/routes'
);

/**
 * Retrieves the singleton state object for the WP Post route helper from the pipeline context.
 *
 * If the state object does not exist in the context, it is initialized.
 *
 * @category AST Builders
 * @param    context - The current pipeline context.
 * @returns The `WpPostRouteHelperState` instance.
 */
export function getWpPostRouteHelperState(
	context: PipelineContext
): WpPostRouteHelperState {
	const host = context as WpPostRouteHelperHost;
	if (!host[WP_POST_ROUTE_HELPER_SYMBOL]) {
		host[WP_POST_ROUTE_HELPER_SYMBOL] = {
			bundles: new Map(),
		} satisfies WpPostRouteHelperState;
	}

	return host[WP_POST_ROUTE_HELPER_SYMBOL]!;
}

/**
 * Reads a WP Post route bundle for a given resource name from the helper state.
 *
 * @category AST Builders
 * @param    state        - The `WpPostRouteHelperState` containing the bundles.
 * @param    resourceName - The name of the resource to retrieve the bundle for.
 * @returns The `WpPostRouteBundle` for the specified resource, or `undefined` if not found.
 */
export function readWpPostRouteBundle(
	state: WpPostRouteHelperState,
	resourceName: string
): WpPostRouteBundle | undefined {
	return state.bundles.get(resourceName);
}

/**
 * Creates a PHP builder helper for WP Post-based routes.
 *
 * This helper processes resources configured to use 'wp-post' storage mode
 * and generates the necessary route bundles for handling WP Post CRUD operations.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for WP Post routes.
 */
export function createPhpWpPostRoutesHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources.wpPostRoutes',
		kind: 'builder',
		dependsOn: ['builder.generate.php.channel.bootstrap'],
		async apply(options: BuilderApplyOptions) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				return;
			}

			const state = getWpPostRouteHelperState(options.context);
			state.bundles.clear();

			populateWpPostRouteBundles({
				ir: input.ir,
				state,
			});
		},
	});
}

function populateWpPostRouteBundles(
	options: PopulateWpPostRouteBundlesOptions
): void {
	for (const resource of options.ir.resources) {
		if (resource.storage?.mode !== 'wp-post') {
			continue;
		}

		const identity = resolveIdentityConfig(resource);
		const pascalName = toPascalCase(resource.name);
		const errorCodeFactory = makeErrorCodeFactory(resource.name);

		const bundle = buildWpPostRouteBundle({
			resource,
			pascalName,
			identity,
			errorCodeFactory,
		});

		options.state.bundles.set(resource.name, bundle);
	}
}
