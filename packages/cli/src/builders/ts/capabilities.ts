import { createHelper } from '../../runtime';
/**
 * Creates the TypeScript capability-module builder helper.
 *
 * Emits `.wpk/generate/js/capabilities.(ts|d.ts)` files that mirror the IR capability map.
 *
 * @category Builders
 */
export function createTsCapabilityBuilder() {
	return createHelper({
		key: 'ts-capability-builder',
		kind: 'builder',
		dependsOn: ['ir.capability-map.core', 'ir.artifacts.plan'],
		async apply({ input, reporter }) {
			if (!input.ir || !input.ir.capabilityMap.definitions.length) {
				reporter.debug(
					'Skipping TypeScript capability module generation (no capabilities defined).'
				);
				return;
			}
			reporter.debug(
				'Skipping TypeScript capability module generation (capabilities folded into runtime).'
			);
		},
	});
}
