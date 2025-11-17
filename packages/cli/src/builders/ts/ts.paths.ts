import { WPKernelError } from '@wpkernel/core/error';
import type { IRv1 } from '../../ir';

export interface TsLayoutPaths {
	readonly blocksGenerated: string;
	readonly uiGenerated: string;
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
		uiGenerated: resolve('ui.generated'),
		jsGenerated: resolve('js.generated'),
	};
}
