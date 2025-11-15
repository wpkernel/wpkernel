import { WPKernelError } from '@wpkernel/core/error';
import { createHelper, type Helper } from '@wpkernel/pipeline';
import type { Reporter } from '@wpkernel/core/reporter';
import type { DriverWorkspace } from './types';

const VENDOR_AUTOLOAD = 'vendor/autoload.php';
const COMPOSER_MANIFEST = 'composer.json';

export interface DriverContext {
	readonly workspace: DriverWorkspace;
}

export type DriverHelper = Helper<
	DriverContext,
	unknown,
	unknown,
	Reporter,
	'builder'
>;

type DriverApplyOptions = Parameters<DriverHelper['apply']>[0];

export function createPhpDriverInstaller(): DriverHelper {
	return createHelper<DriverContext, unknown, unknown, Reporter, 'builder'>({
		key: 'builder.generate.php.driver',
		kind: 'builder',
		async apply({ context, reporter }: DriverApplyOptions) {
			const { workspace } = context;
			const composerManifestPath = workspace.resolve(COMPOSER_MANIFEST);
			const hasComposerManifest =
				await workspace.exists(composerManifestPath);

			if (!hasComposerManifest) {
				reporter.debug(
					'createPhpDriverInstaller: composer.json missing, skipping installer.'
				);
				return;
			}

			const vendorAutoloadPath = workspace.resolve(VENDOR_AUTOLOAD);
			const hasVendorAutoload =
				await workspace.exists(vendorAutoloadPath);

			if (!hasVendorAutoload) {
				reporter.error(
					'Bundled PHP parser assets missing from CLI build.',
					{ autoloadPath: vendorAutoloadPath }
				);
				throw new WPKernelError('DeveloperError', {
					message: 'Bundled PHP parser assets missing.',
					data: {
						autoloadPath: vendorAutoloadPath,
					},
				});
			}

			reporter.debug('PHP parser dependency detected in bundled assets.');
		},
	});
}
