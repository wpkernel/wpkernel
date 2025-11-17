import path from 'path';

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
	readonly layout?: { resolve: (id: string) => string };
}): {
	readonly planPath: string;
	readonly manifestPath: string;
	readonly baseRoot: string;
} {
	const layout = options.layout;
	if (!layout) {
		return {
			planPath: PATCH_PLAN_PATH,
			manifestPath: PATCH_MANIFEST_PATH,
			baseRoot: PATCH_BASE_ROOT,
		};
	}

	return {
		planPath: layout.resolve('plan.manifest'),
		manifestPath: layout.resolve('patch.manifest'),
		baseRoot: layout.resolve('plan.base'),
	};
}
