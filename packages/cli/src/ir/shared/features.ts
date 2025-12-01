import { type WPKernelConfigV1 } from '../../config/types';

const BASE_FEATURES = ['capabilityMap', 'phpAutoload'] as const;

/**
 * Determine the IR feature set derived from the loaded config.
 *
 * @param config - Loaded workspace configuration
 */
export function enumerateFeatures(config: WPKernelConfigV1): string[] {
	const features = new Set<string>(BASE_FEATURES);

	if (Object.keys(config.resources ?? {}).length > 0) {
		features.add('resources');
	}

	if (Object.keys(config.schemas ?? {}).length > 0) {
		features.add('schemas');
	}

	const hasUi = Object.values(config.resources ?? {}).some((resource) =>
		Boolean(resource.ui)
	);
	if (hasUi) {
		features.add('uiRegistry');
	}

	return Array.from(features).sort();
}
