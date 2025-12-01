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
		dependsOn: ['ir.ordering.core'],
		async apply({ input, output, reporter }) {
			const { ir } = requireIr(input, ['capabilityMap']);
			if (!ir.capabilityMap.definitions.length) {
				reporter.debug(
					'Skipping TypeScript index module generation (no capabilities defined).'
				);
				return;
			}

			const jsPlan = ir.artifacts.js?.index;
			if (!jsPlan) {
				reporter.debug(
					'Skipping TypeScript index module generation (no JS artifact plan).'
				);
				return;
			}
			const indexPath = jsPlan.modulePath;
			const dtsPath = jsPlan.declarationPath;

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
