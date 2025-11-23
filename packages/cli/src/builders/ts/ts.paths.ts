import { WPKernelError } from '@wpkernel/core/error';
import type { IRv1 } from '../../ir';

export interface TsLayoutPaths {
	readonly blocksGenerated: string;
	readonly blocksApplied: string;
	readonly uiGenerated: string;
	readonly uiApplied: string;
	readonly uiResourcesApplied: string;
	readonly jsGenerated: string;
}

export function resolveTsLayout(ir: IRv1): TsLayoutPaths {
	const layout = ir.layout;
	const resolve = (id: string): string => {
		try {
			return layout.resolve(id);
		} catch (error) {
			throw new WPKernelError('DeveloperError', {
				message: `Unknown layout id "${id}" for TypeScript generation.`,
				context: { error },
			});
		}
	};

	return {
		blocksGenerated: resolve('blocks.generated'),
		blocksApplied: resolve('blocks.applied'),
		uiGenerated: resolve('ui.generated'),
		uiApplied: resolve('ui.applied'),
		uiResourcesApplied: resolve('ui.resources.applied'),
		jsGenerated: resolve('js.generated'),
	};
}
