import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceConfig } from '@wpkernel/core/resource';
import type { WPKConfigSource } from '@wpkernel/core/contracts';
import type {
	PhpAstBuilder,
	PhpDriverConfigurationOptions,
} from '@wpkernel/php-json-ast';
import type { ReadinessHelperFactory } from '../dx';

/**
 * Source identifier describing where a wpk config was loaded from.
 *
 * @category Config
 * @public
 */
export type ConfigOrigin = WPKConfigSource;

/**
 * Currently supported wpk config schema version.
 *
 * @category Config
 * @public
 */
export type WPKernelConfigVersion = 1;

/**
 * Configuration for a registered schema file.
 *
 * Describes a shared schema source and where generated TypeScript types should
 * be written. Mirrors the JSON Schema `schemaConfig` definition.
 *
 * @category Config
 * @public
 */
export interface SchemaConfig {
	/**
	 * Relative path (from plugin root) to the source schema file
	 * (for example, a JSON Schema or Zod schema).
	 */
	path: string;
	/**
	 * Human-readable description of what this schema models
	 * (for example, "Public job listing API payload").
	 */
	description?: string;
}

/**
 * Registry of schema descriptors keyed by identifier. May be empty but is
 * always present in the config object.
 *
 * @category Config
 * @public
 */
export interface SchemaRegistry {
	[key: string]: SchemaConfig;
}

export type ResourceBlocksMode = 'js' | 'ssr';

export interface ResourceBlocksConfig {
	/**
	 * Controls whether the CLI emits JS-only blocks (`"js"`, default)
	 * or SSR-ready blocks with PHP render callbacks (`"ssr"`).
	 */
	mode?: ResourceBlocksMode;
}

/**
 * Mapping of resource identifiers to their wpk configuration.
 *
 * @category Config
 * @public
 */
export interface ResourceRegistry {
	[key: string]: ResourceConfig & {
		blocks?: ResourceBlocksConfig;
	};
}

/**
 * Optional adapters configured by a wpk project.
 *
 * @category Adapters
 */
export interface AdaptersConfig<TConfigSurface = unknown, TIr = unknown> {
	/**
	 * Factory that returns PHP codegen overrides (for example, changing
	 * namespaces or adding extra includes). Most plugins do not need this.
	 */
	php?: PhpAdapterFactory<TConfigSurface, TIr>;
	/**
	 * Adapter extension factories that run during generation to patch or extend
	 * the default adapters.
	 */
	extensions?: AdapterExtensionFactory<TConfigSurface, TIr>[];
}

/**
 * Optional readiness helper configuration provided by a wpk project.
 */
/**
 * Optional readiness helper configuration provided by a WPKernel project.
 *
 * @category Config
 */
export interface ReadinessConfig {
	/**
	 * List of factories that WPKernel calls when building the readiness
	 * registry. Each factory can register one or more custom health checks.
	 */
	helpers?: ReadonlyArray<ReadinessHelperFactory>;
}

/**
 * Optional WordPress plugin metadata used for generated plugin headers.
 *
 * @category Config
 */
export interface PluginMetaConfig {
	/** Human-readable plugin name shown in the WordPress plugin list. Defaults to the namespace in title case. */
	name?: string;
	/** Short description visible in the WordPress plugin list. */
	description?: string;
	/** Plugin version stamped into the generated loader. */
	version?: string;
	/** Minimum WordPress version required by the plugin. */
	requiresAtLeast?: string;
	/** Minimum PHP version required by the plugin. */
	requiresPhp?: string;
	/** Text domain used for translations. Defaults to the sanitized namespace. */
	textDomain?: string;
	/** Author shown in the plugin header. */
	author?: string;
	/** Optional author URL shown in the plugin header. */
	authorUri?: string;
	/** Optional plugin URL shown in the plugin header. */
	pluginUri?: string;
	/** License identifier stamped into the plugin header. */
	license?: string;
	/** Optional license URL stamped into the plugin header. */
	licenseUri?: string;
}

/**
 * Shape of a v1 wpk configuration object.
 *
 * @category Config
 * @public
 */
export interface WPKernelConfigV1 {
	/**
	 * Optional JSON Schema URI used by editors and tooling.
	 * Ignored by WPKernel at runtime.
	 */
	$schema?: string;
	version: WPKernelConfigVersion;
	/**
	 * Short, slug-style identifier for this plugin or feature.
	 * Used as a prefix for generated PHP namespaces, JS store keys,
	 * and WordPress capability names.
	 */
	namespace: string;
	/**
	 * Optional mapping of applied artifact identifiers to workspace-relative
	 * directories (omit the ".applied" suffix). Supported keys:
	 * blocks, blocks.applied, controllers, controllers.applied, plugin,
	 * plugin.loader.
	 */
	directories?: Record<string, string>;
	/**
	 * Optional plugin metadata used for generated plugin headers. When omitted,
	 * sane defaults are derived from the namespace.
	 */
	meta?: PluginMetaConfig;
	/**
	 * Registry of shared schema descriptors keyed by identifier.
	 * Required but may be empty.
	 */
	schemas: SchemaRegistry;
	/**
	 * Registry of resource descriptors keyed by identifier.
	 * Required and drives routes, storage, capabilities, UI, and builders.
	 */
	resources: ResourceRegistry;
	adapters?: AdaptersConfig;
	readiness?: ReadinessConfig;
}

/**
 * Context shared with adapter factories while generating artifacts.
 *
 * @category Adapters
 */
export interface AdapterContext<TConfigSurface = unknown, TIr = unknown> {
	config: TConfigSurface;
	reporter: Reporter;
	namespace: string;
	ir?: TIr;
}

/**
 * Configuration returned by the PHP adapter factory.
 *
 * @category Adapters
 */
export interface PhpAdapterConfig<TConfigSurface = unknown, TIr = unknown> {
	namespace?: string;
	autoload?: string;
	customise?: (
		builder: PhpAstBuilder,
		context: AdapterExtensionContext<TConfigSurface, TIr>
	) => void;
	driver?: PhpDriverConfigurationOptions;
	codemods?: PhpCodemodAdapterConfig;
}

/**
 * Factory for producing PHP adapter configuration.
 *
 * @category Adapters
 */
export type PhpAdapterFactory<TConfigSurface = unknown, TIr = unknown> = (
	context: AdapterContext<TConfigSurface, TIr>
) => PhpAdapterConfig<TConfigSurface, TIr> | void;

/**
 * Configuration for PHP codemod operations within the PHP adapter.
 *
 * This allows defining files to be processed by codemods, their configuration,
 * and optional diagnostic settings.
 *
 * @category Adapters
 */
export interface PhpCodemodAdapterConfig {
	readonly files: readonly string[];
	readonly configurationPath?: string;
	readonly diagnostics?: {
		readonly nodeDumps?: boolean;
	};
	readonly driver?: PhpCodemodDriverOptions;
}

export interface PhpCodemodDriverOptions {
	readonly binary?: string;
	readonly scriptPath?: string;
	readonly importMetaUrl?: string;
	readonly autoloadPaths?: readonly string[];
}

/**
 * Execution context provided to adapter extensions.
 *
 * @category Adapters
 */
export interface AdapterExtensionContext<
	TConfigSurface = unknown,
	TIr = unknown,
> extends AdapterContext<TConfigSurface, TIr> {
	outputDir: string;
	configDirectory?: string;
	tempDir: string;
	queueFile: (filePath: string, contents: string) => Promise<void>;
	updateIr: (ir: TIr) => void;
	formatPhp: (filePath: string, contents: string) => Promise<string>;
	formatTs: (filePath: string, contents: string) => Promise<string>;
}

/**
 * Adapter extension contract.
 *
 * @category Adapters
 */
export interface AdapterExtension {
	name: string;
	apply: (
		context: AdapterExtensionContext<unknown, unknown>
	) => Promise<void> | void;
}

/**
 * Factory responsible for returning adapter extensions.
 *
 * @category Adapters
 */
export type AdapterExtensionFactory<TConfigSurface = unknown, TIr = unknown> = (
	context: AdapterContext<TConfigSurface, TIr>
) => AdapterExtension | AdapterExtension[] | void;

/**
 * Result returned when loading and validating a wpk config file.
 *
 * @category Config
 * @public
 */
export interface LoadedWPKernelConfig {
	config: WPKernelConfigV1;
	sourcePath: string;
	configOrigin: ConfigOrigin;
	namespace: string;
}
