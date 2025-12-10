import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';

export function createBundlerFragment(): IrFragment {
	return createHelper({
		key: 'ir.bundler.core',
		kind: 'fragment',
		dependsOn: ['ir.artifacts.plan'],
		apply({ output, input }: IrFragmentApplyOptions) {
			const artifacts = input.draft.artifacts;
			if (!artifacts) {
				// This should be impossible in practice because this fragment
				// declares a dependency on `ir.artifacts.plan`. If it happens,
				// the IR pipeline wiring is broken.
				throw new WPKernelError('DeveloperError', {
					message:
						'Bundler fragment requires an artifacts plan; `ir.artifacts.plan` did not populate `draft.artifacts`.',
				});
			}

			const entryPath = artifacts.runtime.entry.generated;
			const bundlerPlan = artifacts.bundler;

			const bundler = {
				entryPath,
				configPath: bundlerPlan.configPath,
				assetsPath: bundlerPlan.assetsPath,
				viteConfigPath: 'vite.config.ts',
			};

			output.assign({ bundler });
		},
	});
}
