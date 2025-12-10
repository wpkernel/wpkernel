/**
 * WPKernel UI - Component Library Package
 *
 * Reusable UI components for WPKernel.
 *
 * @module @wpkernel/ui
 */

/**
 * Current version of WPKernel UI
 */
export const VERSION = '0.11.0';

export { attachUIBindings, WPKernelUIProvider, useWPKernelUI } from './runtime';
export type { WPKernelUIProviderProps } from './runtime';

// Hooks migrated from kernel
export { useCapability } from './hooks/useCapability';
export {
	attachResourceHooks,
	type UseResourceItemResult,
	type UseResourceListResult,
} from './hooks/resource-hooks';

// New Sprint 5 hooks
export { usePrefetcher } from './hooks/usePrefetcher';
export type {
	Prefetcher,
	PrefetchGet,
	PrefetchList,
} from './hooks/usePrefetcher';
export { useHoverPrefetch } from './hooks/useHoverPrefetch';
export type { HoverPrefetchOptions } from './hooks/useHoverPrefetch';
export { useVisiblePrefetch } from './hooks/useVisiblePrefetch';
export type { VisiblePrefetchOptions } from './hooks/useVisiblePrefetch';
export { useNextPagePrefetch } from './hooks/useNextPagePrefetch';
export type { NextPagePrefetchOptions } from './hooks/useNextPagePrefetch';
export { useAction } from './hooks/useAction';
export type { UseActionOptions, UseActionResult } from './hooks/useAction';
export { useTaxonomyOptions } from './hooks/useTaxonomyOptions';
export type { TaxonomyOption } from './hooks/useTaxonomyOptions';

export { TaxonomyList } from './components/TaxonomyList';
export { WPKernelScreen } from './runtime/WPKernelScreen';
