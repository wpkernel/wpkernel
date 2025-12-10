/**
 * Lazy loader for ts-morph to optimize CLI startup performance.
 *
 * ts-morph (~12MB) + typescript (~23MB) = ~35MB of dependencies that are only
 * needed during code generation. By lazy-loading, we defer parsing and loading
 * these heavy modules until `wpk generate` actually executes, keeping the CLI
 * responsive for other commands like `wpk --help`, `wpk doctor`, etc.
 *
 * Note: ts-morph and typescript are installed as regular dependencies, but
 * loading is deferred for performance optimization.
 *
 * @module
 */

import type * as tsMorphModule from 'ts-morph';

let tsMorphPromise: Promise<typeof tsMorphModule> | null = null;

/**
 * Dynamically imports ts-morph module on first use.
 * Caches the promise to avoid multiple imports.
 *
 * @returns Promise resolving to the ts-morph module
 */
export async function loadTsMorph(): Promise<typeof tsMorphModule> {
	if (!tsMorphPromise) {
		tsMorphPromise = import('ts-morph');
	}

	return tsMorphPromise;
}
