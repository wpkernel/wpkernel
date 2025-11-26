import { WPKernelError } from '@wpkernel/core/error';
import type { BuilderApplyOptions } from '../runtime/types';

export type PlanLayoutPaths = {
	planManifest: string;
	planBase: string;
	planIncoming: string;
	blocksGenerated: string;
	blocksApplied: string;
	uiGenerated: string;
	uiApplied: string;
	jsGenerated: string;
	phpGenerated: string;
	pluginLoader: string;
	bundlerConfig: string;
	viteConfig: string;
};

export function resolvePlanPaths(
	options: BuilderApplyOptions
): PlanLayoutPaths {
	const ir = options.input.ir;
	if (!ir) {
		throw new WPKernelError('DeveloperError', {
			message: 'Plan paths cannot be resolved without an IR.',
		});
	}

	const { layout } = ir;
	if (!layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'IR layout fragment did not provide layout; cannot resolve plan paths.',
		});
	}

	return {
		planManifest: layout.resolve('plan.manifest'),
		planBase: layout.resolve('plan.base'),
		planIncoming: layout.resolve('plan.incoming'),
		blocksGenerated: layout.resolve('blocks.generated'),
		blocksApplied: layout.resolve('blocks.applied'),
		uiGenerated: layout.resolve('ui.generated'),
		uiApplied: layout.resolve('ui.applied'),
		jsGenerated: layout.resolve('js.generated'),
		phpGenerated: layout.resolve('php.generated'),
		pluginLoader: layout.resolve('plugin.loader'),
		bundlerConfig: layout.resolve('bundler.config'),
		viteConfig: 'vite.config.ts',
	};
}
