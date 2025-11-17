import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import { loadLayoutFromWorkspace } from '../../layout/manifest';
import { WPKernelError } from '@wpkernel/core/error';

export function createLayoutFragment(): IrFragment {
	return createHelper({
		key: 'ir.layout.core',
		kind: 'fragment',
		async apply({ input, output, context }: IrFragmentApplyOptions) {
			const layout = await loadLayoutFromWorkspace({
				workspace: context.workspace,
				overrides: input.options.config.directories as
					| Record<string, string>
					| undefined,
			});
			if (!layout) {
				throw new WPKernelError('DeveloperError', {
					message:
						'layout.manifest.json not found; cannot resolve artifact paths.',
				});
			}

			output.assign({
				layout,
			});
		},
	});
}
