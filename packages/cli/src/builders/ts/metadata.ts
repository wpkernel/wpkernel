import { type BlockRegistrarMetadata } from './types';

/**
 * Normalises block names into deterministic variable identifiers.
 *
 * @param    blockName
 * @category Builders
 */
export function formatBlockVariableName(blockName: string): string {
	const segments = blockName
		.split(/[\/\-]/u)
		.map((segment) => segment.trim())
		.filter(Boolean);

	if (segments.length === 0) {
		return 'block';
	}

	return segments
		.map((segment, index) => {
			const lower = segment.toLowerCase();
			if (index === 0) {
				return lower;
			}
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join('');
}

/**
 * Builds registrar metadata (identifiers + helper names) for a block key.
 *
 * @param    blockKey
 * @category Builders
 */
export function buildBlockRegistrarMetadata(
	blockKey: string
): BlockRegistrarMetadata {
	const variableName = formatBlockVariableName(blockKey);

	return {
		blockKey,
		variableName,
		manifestIdentifier: `${variableName}Manifest`,
		settingsHelperIdentifier: 'createGeneratedBlockSettings',
	};
}
