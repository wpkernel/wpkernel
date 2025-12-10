import { createHelper } from '../../runtime';
import {
	createSchemaAccumulator,
	loadConfiguredSchemas,
} from '../shared/schema';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

/**
 * The extension key for the schemas fragment.
 *
 * @category IR
 */
export const SCHEMA_EXTENSION_KEY = 'ir.schemas.core';

/**
 * Creates an IR fragment that loads configured JSON Schemas.
 *
 * This fragment:
 * - Loads schemas declared in `config.schemas` from disk
 * - Hashes and normalises them
 * - Populates a shared SchemaAccumulator extension
 * - Exposes the accumulator entries on `ir.schemas`
 *
 * It does NOT attach schemas to resources; that is done on demand by the
 * resources fragment via {@link resolveResourceSchema}, which may also add
 * auto/inline schemas to the same accumulator.
 */
export function createSchemasFragment(): IrFragment {
	return createHelper({
		key: SCHEMA_EXTENSION_KEY,
		kind: 'fragment',
		async apply({ input, output, context }: IrFragmentApplyOptions) {
			const accumulator = createSchemaAccumulator();
			await loadConfiguredSchemas(
				input.options,
				accumulator,
				context.workspace.root
			);

			input.draft.extensions[SCHEMA_EXTENSION_KEY] = accumulator;
			output.assign({ schemas: accumulator.entries });
		},
	});
}
