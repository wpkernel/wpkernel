/**
 * WP Kernel UI - Component Library Package
 *
 * Reusable UI components for WP Kernel
 *
 * @module
 */

/**
 * Current version of WP Kernel UI
 */
export const VERSION = '0.3.0';

// Hooks migrated from kernel
export { usePolicy } from './hooks/usePolicy';
export {
	attachResourceHooks,
	type UseResourceItemResult,
	type UseResourceListResult,
} from './hooks/resource-hooks';

// New Sprint 5 hooks
export { usePrefetcher } from './hooks/usePrefetcher';
export { useHoverPrefetch } from './hooks/useHoverPrefetch';
export { useVisiblePrefetch } from './hooks/useVisiblePrefetch';
export { useNextPagePrefetch } from './hooks/useNextPagePrefetch';
export { useAction } from './hooks/useAction';
