import path from 'path';
import { createHelper } from '../../runtime';
import { resolveTsLayout } from './ts.paths';

/**
 * Creates the builder helper that writes `.wpk/generate/js/index.(ts|d.ts)`.
 *
 * @category Builders
 */
export function createTsIndexBuilder() {
	return createHelper({
		key: 'ts-index-builder',
		kind: 'builder',
		async apply({ input, output, reporter }) {
			if (!input.ir || !input.ir.capabilityMap.definitions.length) {
				reporter.debug(
					'Skipping TypeScript index module generation (no capabilities defined).'
				);
				return;
			}

			const { jsGenerated } = resolveTsLayout(input.ir);
			const indexPath = path.posix.join(jsGenerated, 'index.ts');
			const dtsPath = path.posix.join(jsGenerated, 'index.d.ts');

			output.queueWrite({
				file: indexPath,
				contents: "export { capabilities } from './capabilities';\n",
			});
			await output.queueWrite({
				file: dtsPath,
				contents:
					"export { capabilities } from './capabilities';\nexport type { CapabilityConfig, CapabilityKey, CapabilityRuntime } from './capabilities';\n",
			});
		},
	});
}
