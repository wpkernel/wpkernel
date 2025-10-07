/**
 * Type definitions for WP Kernel E2E utilities
 *
 * @module
 */

import type { Page } from '@playwright/test';
import type {
	Admin,
	Editor,
	PageUtils,
	RequestUtils,
} from '@wordpress/e2e-test-utils-playwright';
import type { ResourceConfig } from '@geekist/wp-kernel';

// Re-export for convenience
export type { ResourceConfig };

/**
 * WordPress E2E fixture context passed to the factory
 */
export type WordPressFixtures = {
	page: Page;
	requestUtils: RequestUtils;
	admin: Admin;
	editor: Editor;
	pageUtils: PageUtils;
};

/**
 * Resource utilities for seeding and cleanup
 */
export type ResourceUtils<T = unknown> = {
	/**
	 * Seed a single resource via REST API
	 *
	 * @param data - Resource data to create
	 * @return Created resource with ID
	 */
	seed: (data: Partial<T>) => Promise<T & { id: number }>;

	/**
	 * Seed multiple resources in bulk
	 *
	 * @param items - Array of resource data to create
	 * @return Array of created resources with IDs
	 */
	seedMany: (items: Partial<T>[]) => Promise<Array<T & { id: number }>>;

	/**
	 * Remove a single resource by ID
	 *
	 * @param id - Resource ID to delete
	 */
	remove: (id: number) => Promise<void>;

	/**
	 * Delete all resources (cleanup utility)
	 * WARNING: This will delete all resources of this type
	 */
	deleteAll: () => Promise<void>;
};

/**
 * Store utilities for waiting on resolvers and state
 */
export type StoreUtils<T = unknown> = {
	/**
	 * Wait for store selector to return truthy value
	 *
	 * @param selector - Function that receives store state and returns data
	 * @param timeout  - Max wait time in ms (default: 5000)
	 * @return Resolved data from selector
	 */
	wait: <R>(selector: (state: T) => R, timeout?: number) => Promise<R>;

	/**
	 * Invalidate store cache to trigger refetch
	 */
	invalidate: () => Promise<void>;

	/**
	 * Get current store state
	 *
	 * @return Current state object
	 */
	getState: () => Promise<T>;
};

/**
 * Event recorder options
 */
export type EventRecorderOptions = {
	/**
	 * Optional regex pattern to filter events
	 * @example /^wpk\.job\./
	 */
	pattern?: RegExp;
};

/**
 * Captured event structure
 */
export type CapturedEvent<P = unknown> = {
	type: string;
	payload?: P;
	timestamp: number;
};

/**
 * Event utilities for capturing and asserting on kernel events
 */
export type EventRecorder<P = unknown> = {
	/**
	 * Get all captured events
	 */
	list: () => Promise<CapturedEvent<P>[]>;

	/**
	 * Find first event matching type
	 *
	 * @param type - Event type to search for
	 * @return First matching event or undefined
	 */
	find: (type: string) => Promise<CapturedEvent<P> | undefined>;

	/**
	 * Find all events matching type
	 *
	 * @param type - Event type to search for
	 * @return Array of matching events
	 */
	findAll: (type: string) => Promise<CapturedEvent<P>[]>;

	/**
	 * Clear all captured events
	 */
	clear: () => Promise<void>;

	/**
	 * Stop recording events
	 */
	stop: () => Promise<void>;
};

/**
 * Main kernel utilities object returned by factory
 */
export type KernelUtils = {
	/**
	 * Create resource utilities for a given resource config
	 *
	 * @param config - Resource configuration from defineResource
	 * @return Resource utilities with typed methods
	 */
	resource: <T = unknown>(config: ResourceConfig) => ResourceUtils<T>;

	/**
	 * Create store utilities for a given store key
	 *
	 * @param storeKey - WordPress data store key (e.g., 'wpk/job')
	 * @return Store utilities with typed methods
	 */
	store: <T = unknown>(storeKey: string) => StoreUtils<T>;

	/**
	 * Create event recorder for capturing kernel events
	 *
	 * @param options - Optional configuration for event filtering
	 * @return Event recorder with capture and query methods
	 */
	events: <P = unknown>(
		options?: EventRecorderOptions
	) => Promise<EventRecorder<P>>;
};
