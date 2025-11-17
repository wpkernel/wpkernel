import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { WPKernelConfigV1 } from '../../config/types';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';

/**
 * Path to fixture directory containing test-only resource and schema files.
 *
 * @category IR
 */
export const FIXTURE_ROOT = path.join(__dirname, '__fixtures__');
/**
 * Path to the primary fixture config file (`wpk.config.ts`).
 *
 * Used by integration tests that validate end-to-end IR generation.
 *
 * @category IR
 */
export const FIXTURE_CONFIG_PATH = path.join(
	FIXTURE_ROOT,
	WPK_CONFIG_SOURCES.WPK_CONFIG_TS
);
const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-ir-test-');
const DEFAULT_LAYOUT_MANIFEST = path.resolve(
	__dirname,
	'../../../../../layout.manifest.json'
);

export interface TempWorkspaceOptions {
	readonly copyLayoutManifest?: boolean;
}

/**
 * Creates a minimal WPKernel configuration for IR tests.
 *
 * Used as a starting point when constructing synthetic resource graphs.
 *
 * @category IR
 */
export function createBaseConfig(): WPKernelConfigV1 {
	return {
		version: 1,
		namespace: 'test-namespace',
		schemas: {} satisfies WPKernelConfigV1['schemas'],
		resources: {} satisfies WPKernelConfigV1['resources'],
	} satisfies WPKernelConfigV1;
}

/**
 * Writes a temporary JSON schema to disk, executes a callback, and cleans up.
 *
 * Useful for tests that need a real file path to a schema document.
 *
 * @param    contents
 * @param    run
 * @category IR
 */
export async function withTempSchema(
	contents: string,
	run: (schemaPath: string) => Promise<void>
): Promise<void> {
	const tempDir = await fs.mkdtemp(TMP_PREFIX);
	const schemaPath = path.join(tempDir, 'temp.schema.json');
	await fs.writeFile(schemaPath, contents, 'utf8');

	try {
		await run(schemaPath);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}

/**
 * Produces a canonical SHA-256 hash of an arbitrarily nested JS value.
 *
 * All object keys are sorted and line endings normalised to ensure
 * deterministic, cross-platform hashing.
 *
 * @param    value
 * @category IR
 */
export function canonicalHash(value: unknown): string {
	return createHash('sha256')
		.update(
			JSON.stringify(sortValue(value), null, 2).replace(/\r\n/g, '\n'),
			'utf8'
		)
		.digest('hex');
}

/**
 * Deep-sorts objects and arrays by keys to produce deterministic ordering.
 *
 * Used as part of canonical hashing and snapshot stabilisation during tests.
 *
 * @param    value
 * @category IR
 */
export function sortValue<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => sortValue(entry)) as unknown as T;
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>)
			.map(([key, val]) => [key, sortValue(val)] as const)
			.sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

		return Object.fromEntries(entries) as T;
	}

	if (typeof value === 'undefined') {
		return null as unknown as T;
	}

	return value;
}

/**
 * Creates a temporary workspace directory for running integration test
 * scenarios. Automatically cleans up after execution.
 *
 * @param    populate
 * @param    run
 * @param    options
 * @category IR
 */
export async function withTempWorkspace(
	populate: (root: string) => Promise<void>,
	run: (root: string) => Promise<void>,
	options: TempWorkspaceOptions = {}
): Promise<void> {
	const tempDir = await fs.mkdtemp(TMP_PREFIX);

	try {
		await populate(tempDir);

		if (options.copyLayoutManifest !== false) {
			const manifestPath = path.join(tempDir, 'layout.manifest.json');
			const hasManifest = await fs
				.access(manifestPath)
				.then(() => true)
				.catch(() => false);

			if (!hasManifest) {
				await fs.copyFile(DEFAULT_LAYOUT_MANIFEST, manifestPath);
			}
		}

		await run(tempDir);
	} finally {
		await fs.rm(tempDir, { recursive: true, force: true });
	}
}
