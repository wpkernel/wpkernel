import path from 'node:path';
import { sanitizeNamespace } from '../adapters/extensions';
import {
	DEFAULT_ALIAS_ROOT,
	DEFAULT_ENTRY_KEY,
	DEFAULT_ENTRY_POINT,
	DEFAULT_OUTPUT_DIR,
	DEFAULT_WORDPRESS_EXTERNALS,
} from './bundler.constants';
import type {
	AssetManifest,
	AssetManifestUIEntry,
	PackageJsonLike,
	RollupDriverArtifacts,
	RollupDriverConfig,
} from './types';

function sortUnique(values: Iterable<string>): string[] {
	return Array.from(new Set(values)).sort();
}

function buildDefaultAssetPath(outputDir: string, entryKey: string): string {
	return path.posix.join(outputDir, `${entryKey}.asset.json`);
}

type RollupDriverArtifactInputs = {
	readonly externals: readonly string[];
	readonly aliasRoot: string;
	readonly shimDir: string;
	readonly version: string;
	readonly normalizedNamespace: string;
	readonly hasUi: boolean;
	readonly hasDataViews: boolean;
	readonly entryKey: string;
	readonly entryPoint: string;
	readonly outputDir: string;
	readonly assetPath: string;
	readonly uiEntry?: AssetManifestUIEntry;
	readonly assetDependencies: string[];
};

function createUiEntry(
	normalizedNamespace: string,
	entryKey: string,
	outputDir: string,
	assetPath: string
): AssetManifestUIEntry {
	return {
		handle: toWordPressHandle(`${normalizedNamespace}-ui`),
		asset: assetPath,
		script: path.posix.join(outputDir, `${entryKey}.js`),
	};
}

function resolveNamespaceData(
	sanitizedNamespace: string | undefined,
	hasUiOption: boolean | undefined
): { normalizedNamespace: string; hasUi: boolean } {
	const normalizedNamespace = sanitizedNamespace
		? sanitizeNamespace(sanitizedNamespace)
		: '';

	return {
		normalizedNamespace,
		hasUi: hasUiOption === true && normalizedNamespace.length > 0,
	};
}

function buildOptionalUiEntry(
	hasUi: boolean,
	normalizedNamespace: string,
	entryKey: string,
	outputDir: string,
	assetPath: string
): AssetManifestUIEntry | undefined {
	if (!hasUi) {
		return undefined;
	}

	return createUiEntry(normalizedNamespace, entryKey, outputDir, assetPath);
}

function resolveRollupDriverInputs(
	pkg: PackageJsonLike | null,
	options: {
		readonly aliasRoot?: string;
		readonly shimDir?: string;
		readonly sanitizedNamespace?: string;
		readonly hasUi?: boolean;
		readonly entryPoint?: string;
		readonly entryKey?: string;
		readonly outputDir?: string;
		readonly assetPath?: string;
		readonly version?: string;
		readonly hasDataViews?: boolean;
	}
): RollupDriverArtifactInputs {
	const externals = buildExternalList(pkg);
	const aliasRoot = (options.aliasRoot ?? DEFAULT_ALIAS_ROOT).replace(
		/\\/g,
		'/'
	);
	const version = options.version ?? pkg?.version ?? '0.0.0';
	const { normalizedNamespace, hasUi } = resolveNamespaceData(
		options.sanitizedNamespace,
		options.hasUi
	);
	const hasDataViews = options.hasDataViews === true;
	const entryKey = options.entryKey ?? DEFAULT_ENTRY_KEY;
	const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
	const entryPoint = options.entryPoint ?? DEFAULT_ENTRY_POINT;
	const assetPath =
		options.assetPath ?? buildDefaultAssetPath(outputDir, entryKey);
	const shimDir = (
		options.shimDir ?? path.posix.join(aliasRoot, 'shims')
	).replace(/\\/g, '/');
	const uiEntry = buildOptionalUiEntry(
		hasUi,
		normalizedNamespace,
		entryKey,
		outputDir,
		assetPath
	);
	const assetDependencies = buildAssetDependencies(externals);

	return {
		externals,
		aliasRoot,
		shimDir,
		version,
		normalizedNamespace,
		hasUi,
		hasDataViews,
		entryKey,
		entryPoint,
		outputDir,
		assetPath,
		uiEntry,
		assetDependencies,
	};
}

function buildRollupDriverConfig(
	inputs: RollupDriverArtifactInputs
): RollupDriverConfig {
	const aliasEntries = buildAliasEntries(
		inputs.externals,
		inputs.aliasRoot,
		inputs.shimDir,
		inputs.hasDataViews
	);

	return {
		driver: 'rollup',
		input: { [inputs.entryKey]: inputs.entryPoint },
		outputDir: inputs.outputDir,
		format: 'iife',
		external: inputs.externals,
		globals: buildGlobalsMap(inputs.externals),
		alias: aliasEntries,
		sourcemap: {
			development: true,
			production: false,
		},
		optimizeDeps: {
			exclude: inputs.externals,
		},
		assetManifest: {
			path: inputs.assetPath,
		},
	};
}

function buildRollupDriverAssetManifest(
	inputs: RollupDriverArtifactInputs
): AssetManifest {
	return {
		entry: inputs.entryKey,
		dependencies: inputs.assetDependencies,
		version: inputs.version,
		...(inputs.uiEntry ? { ui: inputs.uiEntry } : {}),
	};
}

const WP_INTERNALIZED = new Set([
	'@wordpress/dataviews',
	'@wordpress/dataviews/wp',
]);

function isWordPressModule(dependency: string): boolean {
	return dependency.startsWith('@wordpress/');
}

function buildAliasEntries(
	externals: readonly string[],
	aliasRoot: string,
	shimDir: string,
	hasDataViews: boolean
): NonNullable<RollupDriverConfig['alias']> {
	const entries: { find: string; replacement: string }[] = [
		{
			find: '@/',
			replacement: normaliseAliasReplacement(aliasRoot),
		},
	];

	const wantsDataViews =
		hasDataViews ||
		externals.some((dep) => dep.startsWith('@wordpress/dataviews'));

	if (wantsDataViews) {
		entries.push(
			{
				find: '@wordpress/dataviews',
				replacement: '@wordpress/dataviews/wp',
			},
			{
				find: '@wordpress/dataviews/wp/components',
				replacement: '@wordpress/dataviews/wp/components',
			},
			{
				find: '@wordpress/dataviews/wp/dataform-layouts',
				replacement: '@wordpress/dataviews/wp/dataform-layouts',
			},
			{
				find: '@wordpress/dataviews/wp/dataform-controls',
				replacement: '@wordpress/dataviews/wp/dataform-controls',
			},
			{
				find: '@wordpress/dataviews/build-style',
				replacement: '@wordpress/dataviews/build-style',
			}
		);
	}

	entries.push({
		find: 'react/jsx-dev-runtime',
		replacement: path.posix.join(shimDir, 'wp-element-jsx-runtime.ts'),
	});
	entries.push({
		find: 'react/jsx-runtime',
		replacement: path.posix.join(shimDir, 'wp-element-jsx-runtime.ts'),
	});
	entries.push({
		find: '@wordpress/element/jsx-runtime',
		replacement: path.posix.join(shimDir, 'wp-element-jsx-runtime.ts'),
	});
	entries.push({
		find: 'react-dom/client',
		replacement: path.posix.join(shimDir, 'wp-element-client.ts'),
	});
	entries.push({
		find: 'react-dom',
		replacement: path.posix.join(shimDir, 'wp-react.ts'),
	});
	entries.push({
		find: 'react',
		replacement: path.posix.join(shimDir, 'wp-react.ts'),
	});

	return entries;
}

/**
 * Converts a dependency slug into the matching `wp.foo` global name.
 *
 * @param dependency - The dependency slug to convert.
 *
 * @param slug
 * @returns The corresponding WordPress global name.
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
 * Converts a dependency slug into a safe WordPress handle.
 *
 * @param slug - The dependency slug to convert.
 * @returns A sanitized WordPress-compatible handle.
 */
export function toWordPressHandle(slug: string): string {
	return `wp-${slug}`;
}

/**
 * Creates a list of external dependencies for the bundler configuration.
 *
 * @param pkg                          - The package.json data to analyze for dependencies.
 *
 * @param options
 * @param options.internalizeDataViews
 * @returns An array of unique, sorted external dependency names.
 */
export function buildExternalList(
	pkg: PackageJsonLike | null,
	options: { readonly internalizeDataViews?: boolean } = {}
): string[] {
	const internalized = new Set(WP_INTERNALIZED);

	if (options.internalizeDataViews === false) {
		internalized.delete('@wordpress/dataviews');
		internalized.delete('@wordpress/dataviews/wp');
	}

	const isExternalWordPressModule = (dependency: string): boolean =>
		isWordPressModule(dependency) && !internalized.has(dependency);

	const peerDeps = Object.keys(pkg?.peerDependencies ?? {}).filter(
		isExternalWordPressModule
	);
	const deps = Object.keys(pkg?.dependencies ?? {}).filter(
		isExternalWordPressModule
	);

	return sortUnique([...peerDeps, ...deps, ...DEFAULT_WORDPRESS_EXTERNALS]);
}

/**
 * Maps external dependencies to their corresponding global names.
 *
 * @param externals - The list of external dependencies.
 *
 * @returns An object mapping dependency names to global variable names.
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

		if (dependency === 'react-dom' || dependency === 'react-dom/client') {
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
 * Builds a list of asset dependencies based on external modules.
 *
 * @param externals - The list of external dependencies.
 * @returns An array of WordPress asset dependencies.
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
	}

	return sortUnique(dependencies);
}

/**
 * Ensures alias replacements have a trailing slash to avoid path resolution issues.
 *
 * @param replacement - The alias replacement string.
 * @returns A normalized alias replacement.
 */
export function normaliseAliasReplacement(replacement: string): string {
	if (replacement.endsWith('/')) {
		return replacement;
	}

	return `${replacement}/`;
}

/**
 * Builds rollup driver configuration and asset manifest artifacts.
 *
 * @param pkg                        - The package.json data to analyze, may be null.
 * @param options                    - Additional options for building the artifacts.
 * @param options.aliasRoot
 * @param options.sanitizedNamespace
 * @param options.hasUi
 * @param options.entryPoint
 * @param options.entryKey
 * @param options.outputDir
 * @param options.assetPath
 * @param options.version
 * @param options.shimDir
 * @param options.hasDataViews
 * @returns An object containing the `RollupDriverConfig` and `AssetManifest`.
 */
export function buildRollupDriverArtifacts(
	pkg: PackageJsonLike | null,
	options: {
		readonly aliasRoot?: string;
		readonly shimDir?: string;
		readonly sanitizedNamespace?: string;
		readonly hasUi?: boolean;
		readonly hasDataViews?: boolean;
		readonly entryPoint?: string;
		readonly entryKey?: string;
		readonly outputDir?: string;
		readonly assetPath?: string;
		readonly version?: string;
	} = {}
): RollupDriverArtifacts {
	const inputs = resolveRollupDriverInputs(pkg, options);
	const config = buildRollupDriverConfig(inputs);
	const assetManifest = buildRollupDriverAssetManifest(inputs);

	return { config, assetManifest };
}
