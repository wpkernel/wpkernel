import { WPKernelError } from '@wpkernel/core/error';
import type { WorkspaceLike } from '../workspace';

const VENDOR_AUTOLOAD = 'vendor/autoload.php';
const COMPOSER_MANIFEST = 'composer.json';

export interface PhpDriverInstallLogger {
	info?: (message: string, context?: unknown) => void;
	debug?: (message: string, context?: unknown) => void;
	error?: (message: string, context?: unknown) => void;
}

export interface PhpDriverInstallOptions {
	readonly workspace: WorkspaceLike;
	readonly logger?: PhpDriverInstallLogger;
}

export type PhpDriverInstallSkipReason =
	| 'missing-manifest'
	| 'already-installed';

export interface PhpDriverInstallResult {
	readonly installed: boolean;
	readonly skippedReason?: PhpDriverInstallSkipReason;
}

export interface PhpDriverInstaller {
	install: (
		options: PhpDriverInstallOptions
	) => Promise<PhpDriverInstallResult>;
}

export function createPhpDriverInstaller(
	_config: Record<string, never> = {}
): PhpDriverInstaller {
	return {
		async install(options: PhpDriverInstallOptions) {
			const { workspace, logger } = options;
			const skipReason = await detectSkipReason(workspace, logger);

			if (skipReason) {
				return {
					installed: false,
					skippedReason: skipReason,
				};
			}

			const vendorAutoloadPath = workspace.resolve(VENDOR_AUTOLOAD);
			logger?.error?.(
				'Bundled PHP parser assets missing from CLI build.',
				{ autoloadPath: vendorAutoloadPath }
			);
			throw new WPKernelError('DeveloperError', {
				message: 'Bundled PHP parser assets missing.',
				data: {
					autoloadPath: vendorAutoloadPath,
				},
			});
		},
	};
}

async function detectSkipReason(
	workspace: WorkspaceLike,
	logger?: PhpDriverInstallLogger
): Promise<PhpDriverInstallSkipReason | null> {
	const manifestPath = workspace.resolve(COMPOSER_MANIFEST);
	const hasComposerManifest = await workspace.exists(manifestPath);

	if (!hasComposerManifest) {
		logger?.debug?.(
			'createPhpDriverInstaller: composer.json missing, skipping installer.'
		);
		return 'missing-manifest';
	}

	const vendorAutoloadPath = workspace.resolve(VENDOR_AUTOLOAD);
	const hasVendorAutoload = await workspace.exists(vendorAutoloadPath);

	if (hasVendorAutoload) {
		logger?.debug?.('PHP parser dependency detected in bundled assets.');
		return 'already-installed';
	}

	return null;
}
