import type { IRv1 } from '../ir/publicTypes';

export interface BundlerPaths {
	config: string;
	assets: string;
	shimsDir: string;
	aliasRoot: string;
	entryPoint: string;
}

export function resolveBundlerPaths(ir: IRv1 | null | undefined): BundlerPaths {
	if (!ir?.artifacts?.bundler) {
		throw new Error('Bundler paths require a resolved IR layout.');
	}

	return {
		config: ir.artifacts.bundler.configPath,
		assets: ir.artifacts.bundler.assetsPath,
		shimsDir: ir.artifacts.bundler.shimsDir,
		aliasRoot: ir.artifacts.bundler.aliasRoot,
		entryPoint: ir.artifacts.bundler.entryPoint,
	};
}
