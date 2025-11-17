import path from 'node:path';
import { createHelper } from '../runtime';
import { sanitizeNamespace } from '../adapters/extensions';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderOutput,
	PipelineContext,
} from '../runtime/types';
import type { Workspace } from '../workspace/types';
import {
	type PackageJsonLike,
	type RollupDriverArtifacts,
	type AssetManifestUIEntry,
	type RollupDriverConfig,
	type AssetManifest,
} from './types';
import { resolveBundlerPaths } from './bundler.paths';

const BUNDLER_TRANSACTION_LABEL = 'builder.generate.bundler.core';

const DEFAULT_ENTRY_POINT = 'src/index.ts';
const DEFAULT_ENTRY_KEY = 'index';
const DEFAULT_OUTPUT_DIR = 'build';
const DEFAULT_ASSET_PATH = path.posix.join(
	DEFAULT_OUTPUT_DIR,
	'index.asset.json'
);

const DEFAULT_WORDPRESS_EXTERNALS = [
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
	'@wordpress/hooks',
	'@wordpress/i18n',
	'@wordpress/interactivity',
];

const REACT_EXTERNALS = [
	'react',
	'react-dom',
	'react/jsx-runtime',
	'react/jsx-dev-runtime',
];

function sortUnique(values: Iterable<string>): string[] {
	return Array.from(new Set(values)).sort();
}

/**
 * Converts a dependency slug into the matching `wp.foo` global name.
 *
 * @param    slug
 * @category AST Builders
 */
export function toWordPressGlobal(slug: string): string {
	const segments = slug.split('-');
	const formatted = segments
		.map((segment, index) => {
			if (index === 0) {
				return segment;
			}

			if (segment.length === 0) {
				return segment;
			}

			return segment[0]?.toUpperCase() + segment.slice(1);
		})
		.join('');

	return `wp.${formatted}`;
}

/**
 * Converts a slug into a WordPress script handle format.
 *
 * For example, `my-plugin-script` becomes `wp-my-plugin-script`.
 *
 * @category AST Builders
 * @param    slug - The slug to convert.
 * @returns The WordPress script handle.
 */
export function toWordPressHandle(slug: string): string {
	return `wp-${slug}`;
}

/**
 * Builds a list of external dependencies from a package.json-like object.
 *
 * This function combines peer dependencies, regular dependencies, and a predefined
 * list of WordPress and React externals to create a comprehensive list of external
 * modules that should not be bundled.
 *
 * @category AST Builders
 * @param    pkg - A package.json-like object containing dependency information.
 * @returns An array of unique, sorted external dependency names.
 */
export function buildExternalList(pkg: PackageJsonLike | null): string[] {
	const peerDeps = Object.keys(pkg?.peerDependencies ?? {});
	const deps = Object.keys(pkg?.dependencies ?? {});

	return sortUnique([
		...peerDeps,
		...deps,
		...DEFAULT_WORDPRESS_EXTERNALS,
		...REACT_EXTERNALS,
	]);
}

/**
 * Maps external module IDs to the globals Rollup should reference.
 *
 * @category AST Builders
 * @param    externals - The list of externalized package names.
 * @returns Record of module ID → global expression.
 */
export function buildGlobalsMap(
	externals: readonly string[]
): Record<string, string> {
	const globals: Record<string, string> = {};

	for (const dependency of externals) {
		if (dependency === 'react') {
			globals[dependency] = 'React';
			continue;
		}

		if (dependency === 'react-dom') {
			globals[dependency] = 'ReactDOM';
			continue;
		}

		if (
			dependency === 'react/jsx-runtime' ||
			dependency === 'react/jsx-dev-runtime'
		) {
			globals[dependency] = 'React';
			continue;
		}

		if (dependency.startsWith('@wordpress/')) {
			const [, slug = ''] = dependency.split('/');
			globals[dependency] = toWordPressGlobal(slug);
		}
	}

	return globals;
}

/**
 * Builds a list of WordPress asset dependencies based on external modules.
 *
 * This function translates external JavaScript dependencies (especially WordPress and React)
 * into their corresponding WordPress script handles, which are used for enqueueing assets.
 *
 * @category AST Builders
 * @param    externals - A list of external module names.
 * @returns An array of unique, sorted WordPress asset handles.
 */
export function buildAssetDependencies(externals: readonly string[]): string[] {
	const dependencies = new Set<string>();

	for (const dependency of externals) {
		if (dependency.startsWith('@wordpress/')) {
			const [, slug = ''] = dependency.split('/');
			if (slug) {
				dependencies.add(toWordPressHandle(slug));
			}
			continue;
		}

		if (REACT_EXTERNALS.includes(dependency)) {
			dependencies.add('wp-element');
		}
	}

	return Array.from(dependencies).sort();
}

/**
 * Ensures an alias replacement path ends with a trailing slash.
 *
 * This is important for consistent path resolution in bundlers.
 *
 * @category AST Builders
 * @param    replacement - The alias replacement path.
 * @returns The normalized alias replacement path with a trailing slash.
 */
export function normaliseAliasReplacement(replacement: string): string {
	if (replacement.endsWith('/')) {
		return replacement;
	}

	return `${replacement}/`;
}

/**
 * Builds the Rollup driver configuration and asset manifest artifacts.
 *
 * This function orchestrates the creation of the necessary configuration objects
 * for the Rollup bundler, including external dependencies, global mappings, and
 * the asset manifest used by WordPress.
 *
 * @category AST Builders
 * @param    pkg                        - A package.json-like object for dependency information.
 * @param    options                    - Additional options for building the artifacts.
 * @param    options.sanitizedNamespace
 * @param    options.hasUi
 * @param    options.aliasRoot          - The root path for alias replacements, defaults to './src'.
 * @returns An object containing the `RollupDriverConfig` and `AssetManifest`.
 */
export function buildRollupDriverArtifacts(
	pkg: PackageJsonLike | null,
	options: {
		readonly aliasRoot?: string;
		readonly sanitizedNamespace?: string;
		readonly hasUi?: boolean;
	} = {}
): RollupDriverArtifacts {
	const externals = buildExternalList(pkg);
	const globals = buildGlobalsMap(externals);
	const assetDependencies = buildAssetDependencies(externals);
	const aliasRoot = options.aliasRoot ?? './src';
	const version = pkg?.version ?? '0.0.0';
	const sanitizedNamespace = options.sanitizedNamespace ?? '';
	const normalizedNamespace = sanitizedNamespace
		? sanitizeNamespace(sanitizedNamespace)
		: '';
	const hasUi = options.hasUi === true && normalizedNamespace.length > 0;

	const uiEntry = hasUi
		? ({
				handle: toWordPressHandle(`${normalizedNamespace}-ui`),
				asset: DEFAULT_ASSET_PATH,
				script: path.posix.join(
					DEFAULT_OUTPUT_DIR,
					`${DEFAULT_ENTRY_KEY}.js`
				),
			} satisfies AssetManifestUIEntry)
		: undefined;

	const config: RollupDriverConfig = {
		driver: 'rollup',
		input: { [DEFAULT_ENTRY_KEY]: DEFAULT_ENTRY_POINT },
		outputDir: DEFAULT_OUTPUT_DIR,
		format: 'esm',
		external: externals,
		globals,
		alias: [
			{
				find: '@/',
				replacement: normaliseAliasReplacement(aliasRoot),
			},
		],
		sourcemap: {
			development: true,
			production: false,
		},
		optimizeDeps: {
			exclude: externals,
		},
		assetManifest: {
			path: DEFAULT_ASSET_PATH,
		},
	} satisfies RollupDriverConfig;

	const assetManifest: AssetManifest = {
		entry: DEFAULT_ENTRY_KEY,
		dependencies: assetDependencies,
		version,
		...(uiEntry ? { ui: uiEntry } : {}),
	} satisfies AssetManifest;

	return { config, assetManifest };
}

async function readPackageJson(
	workspace: Workspace
): Promise<PackageJsonLike | null> {
	const contents = await workspace.readText('package.json');
	if (!contents) {
		return null;
	}

	try {
		return JSON.parse(contents) as PackageJsonLike;
	} catch (error) {
		throw new SyntaxError(
			`Failed to parse workspace package.json: ${(error as Error).message}`
		);
	}
}

async function queueManifestWrites(
	context: PipelineContext,
	output: BuilderOutput,
	files: readonly string[]
): Promise<void> {
	for (const file of files) {
		const contents = await context.workspace.read(file);
		if (!contents) {
			continue;
		}

		output.queueWrite({ file, contents });
	}
}

/**
 * Creates a builder helper for generating bundler configuration and asset manifests.
 *
 * This helper is responsible for analyzing the project's `package.json`,
 * determining external dependencies, and generating the necessary configuration
 * files for a JavaScript bundler (currently Rollup) and a WordPress asset manifest.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance configured to generate bundler artifacts.
 */
export function createBundler(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.bundler.core',
		kind: 'builder',
		async apply({ context, input, output, reporter }: BuilderApplyOptions) {
			if (input.phase !== 'generate') {
				reporter.debug(
					'createBundler: skipping phase without bundler support.',
					{ phase: input.phase }
				);
				return;
			}

			context.workspace.begin(BUNDLER_TRANSACTION_LABEL);

			try {
				const pkg = await readPackageJson(context.workspace);
				const sanitizedNamespace =
					input.ir?.meta?.sanitizedNamespace ??
					input.options.config.namespace ??
					'';
				const hasUiResources = (input.ir?.resources ?? []).some(
					(resource) => Boolean(resource.ui?.admin?.dataviews)
				);
				const artifacts = buildRollupDriverArtifacts(pkg, {
					aliasRoot: './src',
					sanitizedNamespace,
					hasUi: hasUiResources,
				});
				const paths = resolveBundlerPaths(input.ir);

				await context.workspace.writeJson(
					paths.config,
					artifacts.config,
					{
						pretty: true,
					}
				);
				await context.workspace.writeJson(
					paths.assets,
					artifacts.assetManifest,
					{ pretty: true }
				);

				const manifest = await context.workspace.commit(
					BUNDLER_TRANSACTION_LABEL
				);
				await queueManifestWrites(context, output, manifest.writes);

				reporter.debug('Bundler configuration generated.', {
					files: manifest.writes,
				});
			} catch (error) {
				await context.workspace.rollback(BUNDLER_TRANSACTION_LABEL);
				throw error;
			}
		},
	});
}
