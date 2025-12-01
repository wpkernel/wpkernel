/**
 * WPKernel config loader.
 *
 * Responsible for locating and resolving the project's `wpk.config.(ts|js)`
 * (or a `wpk` field in package.json). It supports TS execution via `tsx`
 * and falls back to standard Node imports for JS files. Returned values
 * are normalised to the canonical wpk configuration object.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type * as cosmiconfigNamespace from 'cosmiconfig';
import { createReporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/error';
import {
	WPK_CONFIG_SOURCES,
	WPK_NAMESPACE,
	type WPKConfigSource,
} from '@wpkernel/core/contracts';
import { validateWPKernelConfig } from './validate-wpk-config';
import type { LoadedWPKernelConfig } from './types';

type CosmiconfigModule = typeof cosmiconfigNamespace;
type CosmiconfigResult = Awaited<
	ReturnType<ReturnType<CosmiconfigModule['cosmiconfig']>['search']>
>;
type TsImport = (
	path: string,
	parent?: string | { parentURL: string }
) => Promise<unknown>;

let cosmiconfigModulePromise: Promise<CosmiconfigModule> | null = null;
let cachedTsImport: Promise<TsImport> | null = null;

const reporter = createReporter({
	namespace: `${WPK_NAMESPACE}.cli.config-loader`,
	level: 'info',
	enabled: process.env.NODE_ENV !== 'test',
});

async function loadCosmiconfigModule(): Promise<CosmiconfigModule> {
	if (!cosmiconfigModulePromise) {
		cosmiconfigModulePromise = import(
			'cosmiconfig'
		) as Promise<CosmiconfigModule>;
	}

	return cosmiconfigModulePromise;
}

async function loadDefaultLoader<
	TExtension extends keyof CosmiconfigModule['defaultLoaders'],
>(
	extension: TExtension
): Promise<NonNullable<CosmiconfigModule['defaultLoaders'][TExtension]>> {
	const module = await loadCosmiconfigModule();
	const loader = module.defaultLoaders[extension];

	if (!loader) {
		throw new WPKernelError('DeveloperError', {
			message: `No cosmiconfig loader registered for ${extension}.`,
		});
	}

	return loader as NonNullable<
		CosmiconfigModule['defaultLoaders'][TExtension]
	>;
}

/**
 * Locate and load the project's wpk configuration.
 *
 * The function searches for supported config files, executes them via
 * cosmiconfig loaders, validates the resulting structure, and returns the
 * canonicalised configuration metadata.
 *
 * @param options
 * @param options.cwd
 * @return The validated wpk config and associated metadata.
 * @throws WPKernelError when discovery, parsing or validation fails.
 */
export async function loadWPKernelConfig(options?: {
	readonly cwd?: string;
}): Promise<LoadedWPKernelConfig> {
	const cosmiconfigModule = await loadCosmiconfigModule();
	const explorer = cosmiconfigModule.cosmiconfig(WPK_NAMESPACE, {
		searchPlaces: [
			WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
			WPK_CONFIG_SOURCES.WPK_CONFIG_JS,
			'package.json',
		],
		packageProp: WPK_NAMESPACE,
		loaders: {
			...cosmiconfigModule.defaultLoaders,
			'.ts': createTsLoader(),
			'.js': createJsLoader(),
			'.mjs': createJsLoader(),
			'.cjs': createJsLoader(),
		},
	});

	const searchResult = await explorer.search(options?.cwd);
	if (!searchResult || searchResult.isEmpty) {
		const message =
			'Unable to locate a wpk config. Create wpk.config.ts (or wpk.config.js) or add a "wpk" field to package.json.';
		reporter.error(message);
		throw new WPKernelError('DeveloperError', { message });
	}

	const resolvedResult = searchResult as NonNullable<CosmiconfigResult>;

	const origin = getConfigOrigin(resolvedResult);
	const sourcePath = resolvedResult.filepath;

	reporter.debug('Kernel config candidate discovered.', {
		origin,
		sourcePath,
	});

	const rawConfig = await resolveConfigValue(resolvedResult.config);
	const { config, namespace } = validateWPKernelConfig(rawConfig, {
		reporter,
		sourcePath,
		origin,
	});

	reporter.info('Kernel config loaded successfully.', {
		origin,
		namespace,
		sourcePath,
	});

	return {
		config,
		sourcePath,
		configOrigin: origin,
		namespace,
	};
}

/**
 * Determine the origin identifier for a discovered config file.
 *
 * @param result - Result returned from cosmiconfig.
 * @return The matching `WPK_CONFIG_SOURCES` identifier.
 * @throws WPKernelError when the file is unsupported.
 */
export function getConfigOrigin(
	result: NonNullable<CosmiconfigResult>
): WPKConfigSource {
	const fileName = path.basename(result.filepath);

	if (fileName === WPK_CONFIG_SOURCES.WPK_CONFIG_TS) {
		return WPK_CONFIG_SOURCES.WPK_CONFIG_TS;
	}

	if (fileName === WPK_CONFIG_SOURCES.WPK_CONFIG_JS) {
		return WPK_CONFIG_SOURCES.WPK_CONFIG_JS;
	}

	if (fileName === 'package.json') {
		return WPK_CONFIG_SOURCES.PACKAGE_JSON_WPK;
	}

	const message = `Unsupported wpk config source: ${fileName}.`;
	reporter.error(message, { fileName, filepath: result.filepath });
	throw new WPKernelError('DeveloperError', { message });
}

/**
 * Creates a custom loader for TypeScript configuration files.
 *
 * This loader attempts to use a default cosmiconfig TypeScript loader first.
 * If that fails, it falls back to dynamically importing the `tsx` ESM loader
 * to execute TypeScript configuration files.
 *
 * @category Config
 * @param    options.defaultLoader
 * @param    options.tsImportLoader
 * @param    options                - Options for the TypeScript loader, including an optional default loader and `tsx` import loader.
 * @returns An asynchronous function that loads and resolves a TypeScript configuration file.
 */
export function createTsLoader({
	defaultLoader = async (filepath: string, content: string) => {
		const loader = await loadDefaultLoader('.ts');
		return loader(filepath, content);
	},
	tsImportLoader = getTsImport,
}: {
	defaultLoader?: (
		filepath: string,
		content: string
	) => unknown | Promise<unknown>;
	tsImportLoader?: () => Promise<TsImport>;
} = {}) {
	return async (filepath: string, content: string) => {
		try {
			const result = await defaultLoader(filepath, content);
			if (typeof result !== 'undefined') {
				return result;
			}
		} catch (_defaultError) {
			// fall through to the tsImport loader
		}

		try {
			const tsImport = await tsImportLoader();
			const absPath = path.resolve(filepath);
			const moduleExports = await tsImport(absPath, {
				parentURL: pathToFileURL(absPath).href,
			});
			return resolveConfigValue(moduleExports);
		} catch (tsxError) {
			const message = `Failed to execute ${filepath}: ${formatError(tsxError)}`;
			reporter.error(message, { filepath, error: tsxError });
			const underlying = tsxError instanceof Error ? tsxError : undefined;
			throw new WPKernelError('DeveloperError', {
				message,
				data: underlying ? { originalError: underlying } : undefined,
			});
		}
	};
}

/**
 * Creates a custom loader for JavaScript configuration files.
 *
 * This loader uses dynamic `import()` to load JavaScript configuration files,
 * supporting both CommonJS and ES module formats.
 *
 * @category Config
 * @param    importModule - The import function to use for loading modules. Defaults to the native `import()`.
 * @returns An asynchronous function that loads and resolves a JavaScript configuration file.
 */
export function createJsLoader(
	importModule: (specifier: string) => Promise<unknown> = (specifier) =>
		import(specifier)
) {
	return async (filepath: string) => {
		try {
			const moduleExports = await importModule(
				pathToFileURL(filepath).href
			);
			return resolveConfigValue(moduleExports);
		} catch (error) {
			const message = `Failed to import ${filepath}: ${formatError(error)}`;
			const underlying = error instanceof Error ? error : undefined;
			throw new WPKernelError('DeveloperError', {
				message,
				data: underlying ? { originalError: underlying } : undefined,
			});
		}
	};
}

/**
 * Normalise nested config module exports into a raw config value.
 *
 * The helper unwraps default exports, `wpkConfig` wrappers, `config`
 * wrappers and promises to support a wide range of authoring styles.
 *
 * @param value - Raw module export from a loader.
 * @return The resolved wpk config candidate.
 */
/**
 * Normalises nested config module exports into a raw config value.
 *
 * The helper unwraps default exports, `wpkConfig` wrappers, `config`
 * wrappers and promises to support a wide range of authoring styles.
 *
 * @category Config
 * @param    value - Raw module export from a loader.
 * @return The resolved wpk config candidate.
 */
export async function resolveConfigValue(value: unknown): Promise<unknown> {
	let current = value;

	while (isPromise(current)) {
		current = await current;
	}

	while (isObject(current)) {
		if ('default' in current && current.default !== current) {
			current = current.default;
			continue;
		}

		if ('wpkConfig' in current && current.wpkConfig !== current) {
			current = current.wpkConfig;
			continue;
		}

		if ('config' in current && current.config !== current) {
			current = current.config;
			continue;
		}

		break;
	}

	return current;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isPromise(value: unknown): value is Promise<unknown> {
	return (
		isObject(value) &&
		typeof (value as { then?: unknown }).then === 'function'
	);
}

/**
 * Dynamically loads the `tsx` ESM loader for TypeScript module imports.
 *
 * This function ensures that the `tsx` dependency is only loaded when needed,
 * making it optional for consumers who don't use TypeScript configuration files.
 *
 * @category Config
 * @returns A promise that resolves with the `tsImport` function from `tsx/esm/api`.
 */
export async function getTsImport(): Promise<TsImport> {
	if (!cachedTsImport) {
		// Dynamically load the `tsx` ESM loader when needed. This keeps the
		// dependency optional for consumers that never load TS wpk configs.
		cachedTsImport = import('tsx/esm/api').then(
			(mod) => mod.tsImport as TsImport
		);
	}

	return cachedTsImport;
}

/**
 * Sets the cached `tsImport` function.
 *
 * This is primarily used for testing or to manually inject a `tsImport` implementation.
 *
 * @category Config
 * @param    value - The promise resolving to the `tsImport` function, or `null` to clear the cache.
 */
export function setCachedTsImport(value: Promise<TsImport> | null): void {
	cachedTsImport = value;
}

/**
 * Produce a human-readable error message for logging purposes.
 *
 * @param error - Unknown error thrown by dynamic imports.
 * @return The error message or its stringified representation.
 */
export function formatError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}
