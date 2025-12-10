import type { BuilderInput } from '../runtime/types';
import type { PackageJsonLike } from './types';

export function resolveBundlerNamespace(input: BuilderInput): string {
	return (
		input.ir?.meta?.sanitizedNamespace ??
		input.ir?.meta?.namespace ??
		input.options.namespace
	);
}

export function resolveBundlerVersion(
	input: BuilderInput,
	pkg: PackageJsonLike | null
): string {
	return input.ir?.meta?.plugin.version ?? pkg?.version ?? '0.0.0';
}
