import path from 'path';
import { createHelper } from '../../runtime';
import { printCapabilityModule } from './entry.capability';
import { resolveTsLayout } from './ts.paths';

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
			const { jsGenerated } = resolveTsLayout(input.ir);
			const modulePath = path.posix.join(jsGenerated, 'capabilities.ts');
			const dtsPath = path.posix.join(jsGenerated, 'capabilities.d.ts');
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
