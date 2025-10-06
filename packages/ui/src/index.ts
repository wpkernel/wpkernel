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
export const VERSION = '0.1.1';

export { useKernel } from './hooks/useKernel';
export { usePolicy } from './hooks/usePolicy';
export {
	attachResourceHooks,
	type UseResourceItemResult,
	type UseResourceListResult,
} from './hooks/resource-hooks';
