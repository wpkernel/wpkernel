import type { PackageManager } from '../init/types';

const PACKAGE_MANAGER_VALUES: readonly PackageManager[] = [
	'npm',
	'pnpm',
	'yarn',
] as const;

export function parsePackageManager(
	value: string | undefined
): PackageManager | undefined {
	if (typeof value !== 'string' || value.length === 0) {
		return undefined;
	}

	const normalised = value.toLowerCase() as PackageManager;
	if (!PACKAGE_MANAGER_VALUES.includes(normalised)) {
		throw new Error(
			`Unsupported package manager "${value}". Expected one of ${PACKAGE_MANAGER_VALUES.join(', ')}.`
		);
	}

	return normalised;
}

export function defaultPackageManager(): PackageManager {
	return 'npm';
}
