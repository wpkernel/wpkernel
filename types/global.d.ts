/**
 * Global Type Declarations for WP Kernel Monorepo
 *
 * Runtime type declarations for WordPress integration.
 * These types are available globally across all packages without imports.
 */
import type * as WPData from '@wordpress/data';
import type * as WPApiFetch from '@wordpress/api-fetch';
import type * as WPHooks from '@wordpress/hooks';
import type { ResourceObject } from '@geekist/wp-kernel/resource';

export {};

declare global {
	/**
	 * WordPress global type for data package access
	 * Available globally in all files without imports
	 * Points to the exact same @wordpress/data type everywhere
	 */
	type WPGlobal = {
		wp?: {
			data?: typeof WPData;
			apiFetch?: typeof WPApiFetch;
			hooks?: typeof WPHooks;
		};
	};

	/**
	 * Extend Window interface with WordPress global properties
	 * This makes window.wp?.data properly typed in all files
	 */
	interface Window extends WPGlobal {
		/**
		 * WP Kernel plugin data (set by wp_localize_script)
		 * Used by namespace detection from plugin headers
		 */
		wpKernelData?: {
			textDomain?: string;
			slug?: string;
		};
	}

	/**
	 * WP Kernel package data on globalThis
	 * Used by namespace detection and other kernel functionality
	 */
	interface GlobalThis {
		__WP_KERNEL_PACKAGE__?: {
			name?: string;
			version?: string;
		};
		/**
		 * React hook attachment function registered by @geekist/wp-kernel-ui
		 * Called by defineResource() to attach useGet/useList hooks when UI bundle is loaded
		 */
		__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__?: <
			T = unknown,
			TQuery = unknown,
		>(
			resource: ResourceObject<T, TQuery>
		) => void;
		/**
		 * Pending resource processor registered by kernel when resources are queued
		 * Returns and clears queued resources that were defined before UI bundle loaded
		 */
		__WP_KERNEL_UI_PROCESS_PENDING_RESOURCES__?: () => ResourceObject<
			unknown,
			unknown
		>[];
	}

	/**
	 * Safe accessor that works in browser & SSR contexts
	 * Available globally without imports
	 *
	 * @return WordPress data package or undefined if not available
	 */
	function getWPData(): typeof WPData | undefined;
}
