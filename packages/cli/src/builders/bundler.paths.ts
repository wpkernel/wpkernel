import type { IRv1 } from '../ir/publicTypes';

export interface BundlerPaths {
	config: string;
	assets: string;
}

export function resolveBundlerPaths(ir: IRv1 | null | undefined): BundlerPaths {
	if (!ir || !ir.layout) {
		throw new Error('Bundler paths require a resolved IR layout.');
	}

	return {
		config: ir.layout.resolve('bundler.config'),
		assets: ir.layout.resolve('bundler.assets'),
	};
}
