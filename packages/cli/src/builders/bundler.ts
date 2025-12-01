import { createHelper } from '../runtime';
import type { BuilderApplyOptions, BuilderHelper } from '../runtime/types';
import {
	buildAssetDependencies,
	buildExternalList,
	buildGlobalsMap,
	buildRollupDriverArtifacts,
	normaliseAliasReplacement,
	toWordPressGlobal,
	toWordPressHandle,
} from './bundler.artifacts';
import { applyBundlerGeneration } from './bundler.runner';

/**
 * Creates a builder helper for generating bundler configuration and asset manifests.
 */
export function createBundler(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.bundler.core',
		kind: 'builder',
		dependsOn: ['ir.bundler.core'],
		async apply(applyOptions: BuilderApplyOptions) {
			await applyBundlerGeneration(applyOptions);
		},
	});
}

export {
	buildAssetDependencies,
	buildExternalList,
	buildGlobalsMap,
	buildRollupDriverArtifacts,
	normaliseAliasReplacement,
	toWordPressGlobal,
	toWordPressHandle,
};
