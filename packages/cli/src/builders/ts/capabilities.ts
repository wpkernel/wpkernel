import { createHelper } from '../../runtime';
import { printCapabilityModule } from './capability';

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
		dependsOn: ['ir.capability-map.core'],
		async apply({ input, output, reporter }) {
			if (!input.ir || !input.ir.capabilityMap.definitions.length) {
				reporter.debug(
					'Skipping TypeScript capability module generation (no capabilities defined).'
				);
				return;
			}

			const { source, declaration } = await printCapabilityModule(
				input.ir
			);
			const jsPlan = input.ir.artifacts.js?.capabilities;
			if (!jsPlan) {
				reporter.debug(
					'Skipping TypeScript capability module generation (no JS artifact plan).'
				);
				return;
			}
			const modulePath = jsPlan.modulePath;
			const dtsPath = jsPlan.declarationPath;
			output.queueWrite({
				file: modulePath,
				contents: source,
			});
			output.queueWrite({
				file: dtsPath,
				contents: declaration,
			});
		},
	});
}
