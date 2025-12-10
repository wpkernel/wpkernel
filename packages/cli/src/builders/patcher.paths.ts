import path from 'path';
import { WPKernelError } from '@wpkernel/core/error';

// Default patch locations derived from the published layout manifest.
export const PATCH_PLAN_PATH = path.posix.join('.wpk', 'apply', 'plan.json');
export const PATCH_MANIFEST_PATH = path.posix.join(
	'.wpk',
	'apply',
	'patch-manifest.json'
);
export const PATCH_BASE_ROOT = path.posix.join('.wpk', 'apply', 'base');

export function normalisePath(file: string): string {
	const replaced = file.replace(/\\/g, '/');
	const normalised = path.posix.normalize(replaced);

	if (normalised === '.' || normalised === '') {
		return '';
	}

	return normalised.replace(/^\.\//, '').replace(/^\/+/, '');
}

export function resolvePatchPaths(options: {
	readonly plan: {
		planManifestPath: string;
		patchManifestPath: string;
		planBaseDir: string;
	};
}): {
	readonly planPath: string;
	readonly manifestPath: string;
	readonly baseRoot: string;
} {
	const plan = options.plan;
	if (!plan) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Patch plan artifacts are required to resolve patcher paths.',
		});
	}

	return {
		planPath: plan.planManifestPath,
		manifestPath: plan.patchManifestPath,
		baseRoot: plan.planBaseDir,
	};
}
