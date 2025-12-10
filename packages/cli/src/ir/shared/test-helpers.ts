import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import defaultLayoutManifest from '../../../../../layout.manifest.json' assert { type: 'json' };
import type { WPKernelConfigV1 } from '../../config/types';
import { WPK_CONFIG_SOURCES } from '@wpkernel/core/contracts';
import type { IRArtifactsPlan } from '../publicTypes';
import { resolveLayoutFromManifest } from '../fragments/ir.layout.core';

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
const DEFAULT_LAYOUT = resolveLayoutFromManifest({
	manifest: defaultLayoutManifest,
});

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

export function createArtifactsFixture(
	overrides: Partial<IRArtifactsPlan> = {}
): IRArtifactsPlan {
	const entryGenerated = DEFAULT_LAYOUT.resolve('entry.generated');
	const entryApplied = DEFAULT_LAYOUT.resolve('entry.applied');
	const runtimeGenerated = DEFAULT_LAYOUT.resolve('runtime.generated');
	const runtimeApplied = DEFAULT_LAYOUT.resolve('runtime.applied');
	const blocksGenerated = DEFAULT_LAYOUT.resolve('blocks.generated');
	const phpGenerated = DEFAULT_LAYOUT.resolve('php.generated');
	const pluginLoaderPath = DEFAULT_LAYOUT.resolve('plugin.loader');

	const base: IRArtifactsPlan = {
		pluginLoader: {
			id: 'plugin.loader',
			absolutePath: pluginLoaderPath,
			importSpecifier: undefined,
		},
		controllers: {},
		resources: {},
		surfaces: {},
		blocks: {},
		schemas: {},
		runtime: {
			entry: {
				generated: entryGenerated,
				applied: entryApplied,
			},
			runtime: {
				generated: runtimeGenerated,
				applied: runtimeApplied,
			},
			blocksRegistrarPath: path.posix.join(
				blocksGenerated,
				'auto-register.ts'
			),
			uiLoader: undefined,
		},
		bundler: {
			configPath: DEFAULT_LAYOUT.resolve('bundler.config'),
			assetsPath: DEFAULT_LAYOUT.resolve('bundler.assets'),
			shimsDir: DEFAULT_LAYOUT.resolve('bundler.shims'),
			aliasRoot: path.posix.dirname(runtimeGenerated),
			entryPoint: path.posix.extname(entryGenerated)
				? entryGenerated
				: path.posix.join(entryGenerated, 'index.tsx'),
		},
		plan: {
			planManifestPath: DEFAULT_LAYOUT.resolve('plan.manifest'),
			planBaseDir: DEFAULT_LAYOUT.resolve('plan.base'),
			planIncomingDir: DEFAULT_LAYOUT.resolve('plan.incoming'),
			patchManifestPath: DEFAULT_LAYOUT.resolve('patch.manifest'),
		},
		php: {
			pluginLoaderPath,
			autoload: {
				strategy: 'composer',
				autoloadPath: path.posix.join(
					path.posix.dirname(path.posix.dirname(phpGenerated)),
					'vendor',
					'autoload.php'
				),
			},
			blocksManifestPath: path.posix.join(
				phpGenerated,
				'build',
				'blocks-manifest.php'
			),
			blocksRegistrarPath: path.posix.join(
				phpGenerated,
				'Blocks',
				'Register.php'
			),
			blocks: {},
			controllers: {},
			debugUiPath: DEFAULT_LAYOUT.resolve('debug.ui'),
		},
	};

	const pickSection = <K extends keyof IRArtifactsPlan>(
		key: K
	): IRArtifactsPlan[K] => {
		const value = overrides[key];
		return (value ?? base[key]) as IRArtifactsPlan[K];
	};

	// Shallow spread isn’t enough for nested buckets, so keep maps/sections
	// stable unless explicitly overridden.
	return {
		...base,
		...overrides,
		pluginLoader: pickSection('pluginLoader'),
		controllers: pickSection('controllers'),
		resources: pickSection('resources'),
		surfaces: pickSection('surfaces'),
		blocks: pickSection('blocks'),
		schemas: pickSection('schemas'),
		runtime: pickSection('runtime'),
		bundler: pickSection('bundler'),
		php: pickSection('php'),
	};
}
