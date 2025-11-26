import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
	PipelineContext,
} from '../../runtime/types';
import {
	buildTransientStorageArtifacts,
	buildWpOptionStorageArtifacts,
	buildWpTaxonomyHelperArtifacts,
	buildWpTaxonomyQueryRouteBundle,
	resolveTransientKey,
	ensureWpTaxonomyStorage,
	resolveIdentityConfig,
} from '@wpkernel/wp-json-ast';
import { makeErrorCodeFactory, toPascalCase } from './utils';
import { ensureWpOptionStorage } from './storage.guards';
import {
	type PopulateArtifactsBaseOptions,
	type ResourceStorageHelperHost,
	type ResourceStorageHelperState,
} from './types';

export const RESOURCE_STORAGE_HELPERS_SYMBOL = Symbol(
	'@wpkernel/cli/resource/storageHelpers'
);

/**
 * Retrieves the singleton state object for resource storage helpers from the pipeline context.
 *
 * If the state object does not exist in the context, it is initialized.
 *
 * @category AST Builders
 * @param    context - The current pipeline context.
 * @returns The `ResourceStorageHelperState` instance.
 */
export function getResourceStorageHelperState(
	context: PipelineContext
): ResourceStorageHelperState {
	const host = context as ResourceStorageHelperHost;
	if (!host[RESOURCE_STORAGE_HELPERS_SYMBOL]) {
		host[RESOURCE_STORAGE_HELPERS_SYMBOL] = {
			transient: new Map(),
			wpOption: new Map(),
			wpTaxonomy: new Map(),
		} satisfies ResourceStorageHelperState;
	}

	return host[RESOURCE_STORAGE_HELPERS_SYMBOL]!;
}

/**
 * Creates a PHP builder helper for transient storage.
 *
 * This helper processes resources configured to use 'transient' storage mode
 * and populates the `ResourceStorageHelperState` with the necessary artifacts
 * for generating transient-based CRUD operations.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for transient storage.
 */
export function createPhpTransientStorageHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources.storage.transient',
		kind: 'builder',
		dependsOn: ['builder.generate.php.core'],
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const state = getResourceStorageHelperState(options.context);
			state.transient.clear();

			populateTransientArtifacts({
				ir: input.ir,
				state,
			});

			await next?.();
		},
	});
}

/**
 * Creates a PHP builder helper for WP Option storage.
 *
 * This helper processes resources configured to use 'wp-option' storage mode
 * and populates the `ResourceStorageHelperState` with the necessary artifacts
 * for generating WP Option-based CRUD operations.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for WP Option storage.
 */
export function createPhpWpOptionStorageHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources.storage.wpOption',
		kind: 'builder',
		dependsOn: ['builder.generate.php.core'],
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const state = getResourceStorageHelperState(options.context);
			state.wpOption.clear();

			populateWpOptionArtifacts({
				ir: input.ir,
				state,
			});

			await next?.();
		},
	});
}

/**
 * Creates a PHP builder helper for WP Taxonomy storage.
 *
 * This helper processes resources configured to use 'wp-taxonomy' storage mode
 * and populates the `ResourceStorageHelperState` with the necessary artifacts
 * for generating WP Taxonomy-based CRUD operations.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for WP Taxonomy storage.
 */
export function createPhpWpTaxonomyStorageHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.controller.resources.storage.wpTaxonomy',
		kind: 'builder',
		dependsOn: ['builder.generate.php.core'],
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input } = options;
			if (input.phase !== 'generate' || !input.ir) {
				await next?.();
				return;
			}

			const state = getResourceStorageHelperState(options.context);
			state.wpTaxonomy.clear();

			populateWpTaxonomyArtifacts({
				ir: input.ir,
				state,
			});

			await next?.();
		},
	});
}

function populateTransientArtifacts(
	options: PopulateArtifactsBaseOptions
): void {
	for (const resource of options.ir.resources) {
		if (resource.storage?.mode !== 'transient') {
			continue;
		}

		const identity = resolveIdentityConfig(resource);
		const pascalName = toPascalCase(resource.name);
		const errorCodeFactory = makeErrorCodeFactory(resource.name);
		const key = resolveTransientKey({
			resourceName: resource.name,
			namespace:
				options.ir.meta.sanitizedNamespace ??
				options.ir.meta.namespace ??
				'',
		});

		const artifacts = buildTransientStorageArtifacts({
			pascalName,
			key,
			identity,
			cacheSegments: resource.cacheKeys.get.segments,
			errorCodeFactory,
		});

		options.state.transient.set(resource.name, artifacts);
	}
}

function populateWpOptionArtifacts(
	options: PopulateArtifactsBaseOptions
): void {
	for (const resource of options.ir.resources) {
		if (resource.storage?.mode !== 'wp-option') {
			continue;
		}

		const storage = ensureWpOptionStorage(resource);
		const pascalName = toPascalCase(resource.name);
		const errorCodeFactory = makeErrorCodeFactory(resource.name);
		const artifacts = buildWpOptionStorageArtifacts({
			pascalName,
			optionName: storage.option,
			errorCodeFactory,
		});

		options.state.wpOption.set(resource.name, {
			helperMethods: artifacts.helperMethods,
			routeHandlers: artifacts.routeHandlers,
		});
	}
}

function populateWpTaxonomyArtifacts(
	options: PopulateArtifactsBaseOptions
): void {
	for (const resource of options.ir.resources) {
		if (resource.storage?.mode !== 'wp-taxonomy') {
			continue;
		}

		const storage = ensureWpTaxonomyStorage(resource.storage, {
			resourceName: resource.name,
		});
		const identity = resolveIdentityConfig(resource);
		const pascalName = toPascalCase(resource.name);
		const errorCodeFactory = makeErrorCodeFactory(resource.name);

		const helperArtifacts = buildWpTaxonomyHelperArtifacts({
			pascalName,
			storage,
			identity,
			errorCodeFactory,
		});
		const queryBundle = buildWpTaxonomyQueryRouteBundle({
			pascalName,
			storage,
			identity,
			errorCodeFactory,
			resourceName: resource.name,
		});

		options.state.wpTaxonomy.set(resource.name, {
			helperMethods: helperArtifacts.helperMethods,
			helperSignatures: helperArtifacts.helperSignatures,
			routeHandlers: queryBundle.routeHandlers,
		});
	}
}
