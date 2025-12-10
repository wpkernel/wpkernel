import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import type {
	IRBlock,
	IRCapabilityHint,
	IRResource,
	IRSchema,
} from '../publicTypes';

/**
 * Creates an IR fragment that sorts various IR collections for consistent output.
 *
 * This fragment depends on schemas, resources, capabilities, and blocks fragments
 * to ensure that these collections are consistently ordered in the IR,
 * which is important for reproducible code generation.
 *
 * @category IR
 * @returns An `IrFragment` instance for ordering IR collections.
 */
export function createOrderingFragment(): IrFragment {
	return createHelper({
		key: 'ir.ordering.core',
		kind: 'fragment',
		dependsOn: [
			'ir.schemas.core',
			'ir.resources.core',
			'ir.capabilities.core',
			'ir.blocks.core',
		],
		apply({ input, output }: IrFragmentApplyOptions) {
			output.assign({
				schemas: sortSchemas(input.draft.schemas),
				resources: sortResources(input.draft.resources),
				capabilities: sortCapabilities(input.draft.capabilities),
				blocks: sortBlocks(input.draft.blocks),
			});
		},
	});
}

/**
 * Return a new array of schemas sorted by their key property.
 *
 * The input is not mutated; a stable ordered copy is returned for
 * deterministic downstream processing.
 *
 * @param    schemas - Array of IRSchema
 * @returns New sorted array of IRSchema
 * @category IR
 */
function sortSchemas(schemas: IRSchema[]): IRSchema[] {
	return schemas.slice().sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Return a new array of resources deterministically sorted by name and
 * schema key. Used to produce stable output across runs.
 *
 * @param    resources - Array of IRResource
 * @returns New sorted array of IRResource
 * @category IR
 */
function sortResources(resources: IRResource[]): IRResource[] {
	return resources.slice().sort((a, b) => {
		const nameComparison = a.name.localeCompare(b.name);
		if (nameComparison !== 0) {
			return nameComparison;
		}

		return a.schemaKey.localeCompare(b.schemaKey);
	});
}

/**
 * Return a new array of capability hints sorted by capability key.
 *
 * @param    capabilities - Array of IRCapabilityHint
 * @returns Sorted capability hints
 * @category IR
 */
function sortCapabilities(
	capabilities: IRCapabilityHint[]
): IRCapabilityHint[] {
	return capabilities.slice().sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Return a new array of blocks sorted by block key.
 *
 * @param    blocks - Array of IRBlock
 * @returns Sorted blocks
 * @category IR
 */
function sortBlocks(blocks: IRBlock[]): IRBlock[] {
	return blocks.slice().sort((a, b) => a.key.localeCompare(b.key));
}
