import { createHelper, requireIr } from '../../runtime';

/**
 * Creates the builder helper that writes `.wpk/generate/js/index.(ts|d.ts)`.
 *
 * @category Builders
 */
export function createTsIndexBuilder() {
	return createHelper({
		key: 'ts-index-builder',
		kind: 'builder',
		dependsOn: [
			'ir.ordering.core',
			'ir.capability-map.core',
			'ir.artifacts.plan',
		],
		async apply({ input, reporter }) {
			const { ir } = requireIr(input, ['capabilityMap']);
			if (!ir.capabilityMap.definitions.length) {
				reporter.debug(
					'Skipping TypeScript index module generation (no capabilities defined).'
				);
				return;
			}

			reporter.debug(
				'Skipping TypeScript index module generation (capabilities folded into runtime).'
			);
		},
	});
}
