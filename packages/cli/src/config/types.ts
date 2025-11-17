import type { Reporter } from '@wpkernel/core/reporter';
import type {
	ResourceAdminUIConfig,
	ResourceConfig,
	ResourceDataViewsUIConfig,
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
 * @category Config
 * @public
 */
export interface SchemaConfig {
	path: string;
	generated: {
		types: string;
	};
	description?: string;
}

/**
 * Mapping of schema identifiers to their configuration.
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
	mode?: ResourceBlocksMode;
}

type ResourceConfigBase = Omit<
	RuntimeResourceConfig,
	'cacheKeys' | 'store' | 'schema' | 'reporter' | 'ui'
>;

type RuntimeResourceDataViewsUIConfig = ResourceDataViewsUIConfig<
	unknown,
	unknown
>;

type RuntimeResourceAdminUIConfig = ResourceAdminUIConfig<unknown, unknown>;

type RuntimeResourceUIConfig = ResourceUIConfig<unknown, unknown>;

export type SerializableResourceDataViewsUIConfig = Omit<
	RuntimeResourceDataViewsUIConfig,
	'mapQuery' | 'getItemId'
> & {
	mapQuery?: never;
	getItemId?: never;
};

export type SerializableResourceAdminUIConfig = Omit<
	RuntimeResourceAdminUIConfig,
	'dataviews'
> & {
	dataviews?: SerializableResourceDataViewsUIConfig;
};

export type SerializableResourceUIConfig = Omit<
	RuntimeResourceUIConfig,
	'admin'
> & {
	admin?: SerializableResourceAdminUIConfig;
};

export type SerializableSchemaReference = string | Record<string, unknown>;

export type SerializableResourceConfig = ResourceConfigBase & {
	cacheKeys?: never;
	schema?: SerializableSchemaReference;
	reporter?: never;
	ui?: SerializableResourceUIConfig;
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
	php?: PhpAdapterFactory;
	extensions?: AdapterExtensionFactory[];
}

/**
 * Optional readiness helper configuration provided by a wpk project.
 */
export interface ReadinessConfig {
	helpers?: ReadonlyArray<ReadinessHelperFactory>;
}

/**
 * Shape of a v1 wpk configuration object.
 *
 * @category Config
 * @public
 */
export interface WPKernelConfigV1 {
	/**
	 * Optional JSON schema reference to enable IDE validation.
	 */
	$schema?: string;
	version: WPKernelConfigVersion;
	namespace: string;
	/**
	 * Optional applied-path overrides for surfaced assets (e.g., blocks, controllers).
	 * Keys are logical identifiers; values are workspace-relative paths.
	 */
	directories?: Record<string, string>;
	schemas: SchemaRegistry;
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
