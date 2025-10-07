/**
 * Policy cache implementation with cross-tab synchronization
 *
 * Provides memory + sessionStorage caching for policy evaluation results with:
 * - Automatic TTL expiration (default: 60 seconds)
 * - Cross-tab synchronization via BroadcastChannel
 * - useSyncExternalStore integration for React re-renders
 * - Stable cache key generation (parameter serialization)
 *
 * The cache is namespace-scoped to prevent conflicts between plugins sharing
 * the same browser session. Cache entries are invalidated automatically when
 * rules change via policy.extend() or manually via policy.cache.invalidate().
 *
 * @module @geekist/wp-kernel/policy/cache
 */

import { getNamespace } from '../namespace/detect';
import { createReporter } from '../reporter';
import {
	WPK_SUBSYSTEM_NAMESPACES,
	WPK_INFRASTRUCTURE,
} from '../namespace/constants';
import type { PolicyCache, PolicyCacheOptions } from './types';

const DEFAULT_TTL_MS = 60_000;
const STORAGE_KEY_PREFIX = WPK_INFRASTRUCTURE.POLICY_CACHE_STORAGE;
const BROADCAST_CHANNEL_NAME = WPK_INFRASTRUCTURE.POLICY_CACHE_CHANNEL;

const policyCacheReporter = createReporter({
	namespace: WPK_SUBSYSTEM_NAMESPACES.POLICY_CACHE,
	channel: 'console',
	level: 'warn',
});

type Listener = () => void;

type CacheEntryInternal = {
	value: boolean;
	expiresAt: number;
};

type BroadcastSetMessage = {
	type: 'set';
	namespace: string;
	key: string;
	value: boolean;
	expiresAt: number;
};

type BroadcastInvalidateMessage = {
	type: 'invalidate';
	namespace: string;
	policyKey?: string;
};

type BroadcastClearMessage = {
	type: 'clear';
	namespace: string;
};

type BroadcastMessage =
	| BroadcastSetMessage
	| BroadcastInvalidateMessage
	| BroadcastClearMessage;

const hasWindow = typeof window !== 'undefined';

/**
 * Recursively serializes a value into a stable, canonical form for cache key generation.
 *
 * - Arrays are serialized element-wise with recursive stable serialization
 * - Objects are serialized with properties sorted alphabetically by key to ensure
 *   consistent output regardless of property insertion order
 * - Primitives (string, number, boolean) and null are returned as-is
 *
 * This ensures cache keys generated from parameters are stable and deterministic,
 * preventing cache misses due to differing property order in equivalent objects.
 *
 * @param value - The value to serialize (object, array, primitive, or null)
 * @return The stably serialized value with consistent property ordering
 * @internal
 *
 * @example
 * ```typescript
 * // These produce identical serialized output:
 * stableSerialize({ b: 2, a: 1 }); // → { a: 1, b: 2 }
 * stableSerialize({ a: 1, b: 2 }); // → { a: 1, b: 2 }
 * ```
 */
function stableSerialize(value: unknown): unknown {
	if (value === null) {
		return null;
	}

	if (Array.isArray(value)) {
		return value.map((item) => stableSerialize(item));
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, val]) => [key, stableSerialize(val)] as const)
			.sort(([a], [b]) => {
				if (a > b) {
					return 1;
				}
				if (a < b) {
					return -1;
				}
				return 0;
			});

		return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
			acc[key] = val;
			return acc;
		}, {});
	}

	return value;
}

export function createPolicyCacheKey(
	policyKey: string,
	params: unknown
): string {
	const serialized =
		params === undefined ? 'void' : JSON.stringify(stableSerialize(params));
	return `${policyKey}::${serialized}`;
}

/**
 * Get the appropriate storage mechanism based on cache options
 *
 * Returns sessionStorage if 'session' storage is requested and available.
 * Falls back to null in SSR environments or if sessionStorage is unavailable.
 *
 * @internal
 * @param options - Policy cache configuration options
 * @return Storage instance or null if unavailable
 */
function getStorage(options: PolicyCacheOptions | undefined): Storage | null {
	if (!hasWindow) {
		return null;
	}

	if (options?.storage === 'session') {
		try {
			return window.sessionStorage;
		} catch (error) {
			policyCacheReporter.warn(
				'sessionStorage is not available for policy cache.',
				error
			);
			return null;
		}
	}

	return null;
}

/**
 * Read persisted cache entries from storage
 *
 * Attempts to read and parse cached policy results from the configured storage.
 * Returns an empty object if storage is unavailable, parsing fails, or no cache exists.
 *
 * @internal
 * @param namespace - Namespace for storage key scoping
 * @param options   - Policy cache configuration options
 * @return Map of cache keys to their cached entries
 */
function readPersisted(
	namespace: string,
	options: PolicyCacheOptions | undefined
): Record<string, CacheEntryInternal> {
	const storage = getStorage(options);
	if (!storage) {
		return {};
	}

	try {
		const raw = storage.getItem(`${STORAGE_KEY_PREFIX}.${namespace}`);
		if (!raw) {
			return {};
		}
		const parsed = JSON.parse(raw) as
			| Record<string, CacheEntryInternal>
			| undefined;
		if (!parsed || typeof parsed !== 'object') {
			return {};
		}
		return parsed;
	} catch (error) {
		policyCacheReporter.warn(
			'Failed to parse persisted policy cache.',
			error
		);
		return {};
	}
}

/**
 * Persist cache entries to storage
 *
 * Serializes and writes the current cache state to the configured storage.
 * Silently fails if storage is unavailable or write operation fails.
 *
 * @internal
 * @param namespace - Namespace for storage key scoping
 * @param store     - Map of cache entries to persist
 * @param options   - Policy cache configuration options
 */
function persist(
	namespace: string,
	store: Map<string, CacheEntryInternal>,
	options: PolicyCacheOptions | undefined
): void {
	const storage = getStorage(options);
	if (!storage) {
		return;
	}

	try {
		const serialized = JSON.stringify(Object.fromEntries(store.entries()));
		storage.setItem(`${STORAGE_KEY_PREFIX}.${namespace}`, serialized);
	} catch (error) {
		policyCacheReporter.warn('Failed to persist policy cache.', error);
	}
}

/**
 * Create a BroadcastChannel for cross-tab cache synchronization
 *
 * Creates a channel for syncing cache invalidations across browser tabs.
 * Returns null in SSR environments, if BroadcastChannel API is unavailable,
 * or if cross-tab sync is explicitly disabled.
 *
 * @internal
 * @param options - Policy cache configuration options
 * @return BroadcastChannel instance or null if unavailable
 */
function createBroadcastChannel(
	options: PolicyCacheOptions | undefined
): BroadcastChannel | null {
	if (!hasWindow) {
		return null;
	}

	if (options?.crossTab === false) {
		return null;
	}

	if (typeof window.BroadcastChannel !== 'function') {
		return null;
	}

	try {
		return new window.BroadcastChannel(BROADCAST_CHANNEL_NAME);
	} catch (error) {
		policyCacheReporter.warn(
			'Failed to create BroadcastChannel for policy cache.',
			error
		);
		return null;
	}
}

export function createPolicyCache(
	options: PolicyCacheOptions | undefined,
	namespace = getNamespace()
): PolicyCache {
	const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;
	const store = new Map<string, CacheEntryInternal>();
	const listeners = new Set<Listener>();
	let version = 0;
	const persisted = readPersisted(namespace, options);
	for (const [key, entry] of Object.entries(persisted)) {
		store.set(key, entry);
	}

	const channel = createBroadcastChannel(options);

	function notify(): void {
		version += 1;
		listeners.forEach((listener) => listener());
		persist(namespace, store, options);
	}

	function applyBroadcastSet(message: BroadcastSetMessage): void {
		store.set(message.key, {
			value: message.value,
			expiresAt: message.expiresAt,
		});
		notify();
	}

	function applyBroadcastInvalidate(
		message: BroadcastInvalidateMessage
	): void {
		if (message.policyKey) {
			const prefix = `${message.policyKey}::`;
			for (const key of Array.from(store.keys())) {
				if (key.startsWith(prefix)) {
					store.delete(key);
				}
			}
		} else {
			store.clear();
		}
		notify();
	}

	function applyBroadcastClear(): void {
		store.clear();
		notify();
	}

	if (channel) {
		channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
			const message = event.data;
			if (!message || message.namespace !== namespace) {
				return;
			}

			switch (message.type) {
				case 'set':
					applyBroadcastSet(message);
					break;
				case 'invalidate':
					applyBroadcastInvalidate(message);
					break;
				case 'clear':
					applyBroadcastClear();
					break;
				default:
					break;
			}
		};
	}

	function broadcast(message: BroadcastMessage): void {
		if (!channel) {
			return;
		}
		channel.postMessage(message);
	}

	function evictExpired(
		key: string,
		entry: CacheEntryInternal | undefined
	): boolean {
		if (!entry) {
			return true;
		}
		if (entry.expiresAt <= Date.now()) {
			store.delete(key);
			return true;
		}
		return false;
	}

	return {
		get(key: string): boolean | undefined {
			const entry = store.get(key);
			if (evictExpired(key, entry)) {
				return undefined;
			}
			return entry?.value;
		},
		set(
			key: string,
			value: boolean,
			setOptions: {
				ttlMs?: number;
				source?: 'local' | 'remote';
				expiresAt?: number;
			} = {}
		): void {
			const expiresAt =
				setOptions.expiresAt ?? Date.now() + (setOptions.ttlMs ?? ttl);
			store.set(key, { value, expiresAt });
			notify();
			if (setOptions.source !== 'remote') {
				broadcast({ type: 'set', namespace, key, value, expiresAt });
			}
		},
		invalidate(policyKey?: string): void {
			if (!policyKey) {
				store.clear();
				notify();
				broadcast({ type: 'clear', namespace });
				return;
			}

			const prefix = `${policyKey}::`;
			let removed = false;
			for (const key of Array.from(store.keys())) {
				if (key.startsWith(prefix)) {
					store.delete(key);
					removed = true;
				}
			}
			if (removed) {
				notify();
				broadcast({ type: 'invalidate', namespace, policyKey });
			}
		},
		clear(): void {
			store.clear();
			notify();
			broadcast({ type: 'clear', namespace });
		},
		keys(): string[] {
			return Array.from(store.keys());
		},
		subscribe(listener: Listener): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		getSnapshot(): number {
			return version;
		},
	};
}
