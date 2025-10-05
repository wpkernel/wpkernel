import type { WPDataRegistry } from '@wordpress/data/build-types/registry';
import type { ReduxMiddleware } from '../actions/types';

export type KernelRegistry = WPDataRegistry & {
	__experimentalUseMiddleware?: (
		middleware: () => ReduxMiddleware[]
	) => (() => void) | void;
	dispatch: (storeName: string) => unknown;
};
