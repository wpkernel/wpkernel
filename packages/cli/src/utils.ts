/**
 * Shared string and serialization helpers for the PHP builders.
 *
 * These utilities intentionally live inside the CLI package so that
 * `@wpkernel/php-json-ast` can remain focused on pure AST construction without
 * bundling higher level string helpers that are only relevant to scaffolding.
 */

import fs from 'node:fs/promises';

export function toPascalCase(value: string): string {
	return (
		value
			.split(/[^a-zA-Z0-9]+/u)
			.filter(Boolean)
			.map(
				(segment) => segment.charAt(0).toUpperCase() + segment.slice(1)
			)
			.join('') || ''
	);
}

/**
 * Converts arbitrary strings into camelCase segments.
 *
 * @param    value
 * @category Builders
 */
export function toCamelCase(value: string): string {
	const pascal = toPascalCase(value);
	if (pascal.length === 0) {
		return pascal;
	}
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Converts a string to snake_case format.
 *
 * Transforms PascalCase, camelCase, or hyphenated strings into lowercase
 * snake_case. Used for generating WordPress-compatible identifiers like
 * option keys and error codes.
 *
 * @param    value - String to convert
 * @returns snake_case formatted string
 * @category AST Builders
 */
export function toSnakeCase(value: string): string {
	return value
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.toLowerCase()
		.replace(/^_+|_+$/g, '')
		.replace(/_+/g, '_');
}

/**
 * Type guard to check if a value is a non-empty string.
 *
 * @param    value - Value to check
 * @returns True if value is a string with non-whitespace content
 * @category AST Builders
 */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Recursively sanitizes JSON values for stable serialization.
 *
 * Deeply sorts object keys alphabetically and recursively processes arrays
 * and nested objects. Ensures consistent JSON output for generated PHP code.
 *
 * @typeParam T - Type of the value being sanitized
 * @param     value - Value to sanitize
 * @returns Sanitized value with sorted keys
 * @category AST Builders
 */
export function sanitizeJson<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeJson(entry)) as unknown as T;
	}

	if (isRecord(value)) {
		const entries = Object.entries(value)
			.map(([key, val]) => [key, sanitizeJson(val)] as const)
			.sort(([a], [b]) => a.localeCompare(b));
		return Object.fromEntries(entries) as T;
	}

	return value;
}

/**
 * Creates a factory function for generating WordPress error codes.
 *
 * Returns a function that generates prefixed error codes in the format
 * `wpk_{resource_name}_{suffix}`. Used to create consistent WP_Error codes
 * for REST API responses.
 *
 * @param    resourceName - Resource name to include in error codes
 * @returns Factory function that generates error codes with given suffix
 * @category AST Builders
 */
export function makeErrorCodeFactory(
	resourceName: string
): (suffix: string) => string {
	const base = toSnakeCase(resourceName) || 'resource';
	return (suffix: string) => `wpk_${base}_${suffix}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
export function isAbsoluteUrl(candidate: string): boolean {
	return candidate.startsWith('http://') || candidate.startsWith('https://');
}
export async function pathExists(candidate: string): Promise<boolean> {
	try {
		const stat = await fs.stat(candidate);
		if (typeof (stat as { isFile?: unknown }).isFile === 'function') {
			return (stat as { isFile: () => boolean }).isFile();
		}
		return false;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}
