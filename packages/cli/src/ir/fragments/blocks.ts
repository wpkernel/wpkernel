import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import { discoverBlocks } from '../shared/block-discovery';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

/**
 * Creates an IR fragment that discovers and processes WordPress blocks.
 *
 * This fragment depends on the meta fragment to determine the workspace root
 * and then uses `block-discovery` to find and include block definitions in the IR.
 *
 * @category IR
 * @returns An `IrFragment` instance for block discovery.
 */
export function createBlocksFragment(): IrFragment {
	return createHelper({
		key: 'ir.blocks.core',
		kind: 'fragment',
		dependsOn: ['ir.meta.core', 'ir.layout.core'],
		async apply({ input, output, context }: IrFragmentApplyOptions) {
			if (!input.draft.layout) {
				throw new WPKernelError('DeveloperError', {
					message: 'Layout fragment must run before blocks fragment.',
				});
			}

			const blocksRoot = input.draft.layout.resolve('blocks.applied');
			const blocks = await discoverBlocks(
				context.workspace.root,
				blocksRoot
			);
			output.assign({ blocks });
		},
	});
}
