import { type BlockRegistrarMetadata } from './types';

/**
 * Converts arbitrary strings into PascalCase segments.
 *
 * @param    value
 * @category Builders
 */
export function toPascalCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]+/u)
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join('');
}

/**
 * Converts arbitrary strings into camelCase segments.
 *
 * @param    value
 * @category Builders
 */
export function toCamelCase(value: string): string {
	const pascal = toPascalCase(value);
	if (pascal.length === 0) {
		return pascal;
	}
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

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
