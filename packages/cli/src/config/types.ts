import type { Reporter } from '@wpkernel/core/reporter';
import type {
	ResourceAdminUIConfig,
	ResourceConfig,
	ResourceUIConfig,
} from '@wpkernel/core/resource';
import type { WPKConfigSource } from '@wpkernel/core/contracts';
import type { IRv1 } from '../ir/publicTypes';
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
	generated: {
		/**
		 * Relative path where WPKernel should write the generated TypeScript
		 * types for this schema.
		 */
		types: string;
	};
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

/**
 * Mapping of resource identifiers to their wpk configuration.
 *
 * @category Config
 * @public
 */
type RuntimeResourceConfig = ResourceConfig;

export type ResourceBlocksMode = 'js' | 'ssr';

export interface SerializableResourceBlocksConfig {
	/**
	 * Controls whether the CLI emits JS-only blocks (`"js"`, default)
	 * or SSR-ready blocks with PHP render callbacks (`"ssr"`).
	 */
	mode?: ResourceBlocksMode;
}

type ResourceConfigBase = Omit<
	RuntimeResourceConfig,
	'cacheKeys' | 'store' | 'schema' | 'reporter' | 'ui'
>;

type RuntimeResourceAdminUIConfig = ResourceAdminUIConfig;

type RuntimeResourceUIConfig = ResourceUIConfig;

export type SerializableResourceAdminUIConfig = Omit<
	RuntimeResourceAdminUIConfig,
	'dataviews'
> & {
	dataviews?: never;
};

export type SerializableResourceUIConfig = Omit<
	RuntimeResourceUIConfig,
	'admin'
> & {
	admin?: SerializableResourceAdminUIConfig;
};

export type SerializableSchemaReference = string | Record<string, unknown>;

/**
 * A resource configuration that is safe to serialize, suitable for use in a `wpk.config.ts` file.
 *
 * This type omits properties that are not serializable, such as functions or complex objects.
 *
 * @category Config
 * @public
 */
export type SerializableResourceConfig = ResourceConfigBase & {
	/**
	 * Resource name. Optional; defaults to the map key when omitted.
	 */
	name?: string;
	cacheKeys?: never;
	schema?: SerializableSchemaReference;
	reporter?: never;
	ui?: SerializableResourceUIConfig;
	/**
	 * Optional Gutenberg block configuration. Set `mode: "ssr"` to emit
	 * server-rendered blocks with PHP registrars; omit or set `mode: "js"`
	 * to keep the default JS-only blocks.
	 */
	blocks?: SerializableResourceBlocksConfig;
};

export interface ResourceRegistry {
	[key: string]: SerializableResourceConfig;
}

/**
 * Optional adapters configured by a wpk project.
 *
 * @category Adapters
 */
export interface AdaptersConfig {
	/**
	 * Factory that returns PHP codegen overrides (for example, changing
	 * namespaces or adding extra includes). Most plugins do not need this.
	 */
	php?: PhpAdapterFactory;
	/**
	 * Adapter extension factories that run during generation to patch or extend
	 * the default adapters.
	 */
	extensions?: AdapterExtensionFactory[];
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
export interface AdapterContext {
	config: WPKernelConfigV1;
	reporter: Reporter;
	namespace: string;
	ir?: IRv1;
}

/**
 * Configuration returned by the PHP adapter factory.
 *
 * @category Adapters
 */
export interface PhpAdapterConfig {
	namespace?: string;
	autoload?: string;
	customise?: (
		builder: PhpAstBuilder,
		context: AdapterContext & { ir: IRv1 }
	) => void;
	driver?: PhpDriverConfigurationOptions;
	codemods?: PhpCodemodAdapterConfig;
}

/**
 * Factory for producing PHP adapter configuration.
 *
 * @category Adapters
 */
export type PhpAdapterFactory = (
	context: AdapterContext
) => PhpAdapterConfig | void;

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
export interface AdapterExtensionContext extends AdapterContext {
	ir: IRv1;
	outputDir: string;
	configDirectory?: string;
	tempDir: string;
	queueFile: (filePath: string, contents: string) => Promise<void>;
	updateIr: (ir: IRv1) => void;
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
	apply: (context: AdapterExtensionContext) => Promise<void> | void;
}

/**
 * Factory responsible for returning adapter extensions.
 *
 * @category Adapters
 */
export type AdapterExtensionFactory = (
	context: AdapterContext
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
