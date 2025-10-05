/**
 * Framework namespace constants
 *
 * Central definition of all framework namespace identifiers to prevent drift.
 * All framework code should import from here rather than hardcoding strings.
 *
 * @module @geekist/wp-kernel/namespace/constants
 */

/**
 * Root framework namespace
 *
 * This is the canonical namespace for the WP Kernel framework.
 * Used as:
 * - Default reporter namespace when no plugin namespace detected
 * - Fallback in getNamespace() detection cascade
 * - Prefix for framework public APIs (events, hooks, storage)
 *
 * @constant
 */
export const WPK_NAMESPACE = 'wpk';

/**
 * Framework subsystem namespaces
 *
 * Granular namespaces for internal framework logging and debugging.
 * These provide better diagnostic context than the root namespace alone.
 */
export const WPK_SUBSYSTEM_NAMESPACES = {
	/** Policy subsystem */
	POLICY: `${WPK_NAMESPACE}.policy`,
	/** Policy cache subsystem */
	POLICY_CACHE: `${WPK_NAMESPACE}.policy.cache`,
	/** Resource cache subsystem */
	CACHE: `${WPK_NAMESPACE}.cache`,
	/** Action subsystem */
	ACTIONS: `${WPK_NAMESPACE}.actions`,
	/** Namespace detection subsystem */
	NAMESPACE: `${WPK_NAMESPACE}.namespace`,
	/** Reporter subsystem */
	REPORTER: `${WPK_NAMESPACE}.reporter`,
} as const;

/**
 * Framework infrastructure constants
 *
 * Keys used for browser APIs (storage, channels) to avoid collisions.
 */
export const WPK_INFRASTRUCTURE = {
	/** Storage key prefix for policy cache */
	POLICY_CACHE_STORAGE: `${WPK_NAMESPACE}.policy.cache`,
	/** BroadcastChannel name for policy cache sync */
	POLICY_CACHE_CHANNEL: `${WPK_NAMESPACE}.policy.cache`,
	/** BroadcastChannel name for policy events */
	POLICY_EVENT_CHANNEL: `${WPK_NAMESPACE}.policy.events`,
} as const;

/**
 * Type-safe subsystem namespace keys
 */
export type WPKSubsystemNamespace =
	(typeof WPK_SUBSYSTEM_NAMESPACES)[keyof typeof WPK_SUBSYSTEM_NAMESPACES];

/**
 * Type-safe infrastructure constant keys
 */
export type WPKInfrastructureConstant =
	(typeof WPK_INFRASTRUCTURE)[keyof typeof WPK_INFRASTRUCTURE];
