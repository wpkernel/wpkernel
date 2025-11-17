import type { ResourceRoutes } from '@wpkernel/core';

/**
 * Schema configuration compatible with CLI SchemaConfig
 */
export interface SchemaConfigLike {
	path: string;
	generated: {
		types: string;
	};
	description?: string;
}

/**
 * Schema registry compatible with CLI SchemaRegistry
 */
export interface SchemaRegistryLike {
	[key: string]: SchemaConfigLike;
}

/**
 * Resource configuration compatible with CLI SerializableResourceConfig.
 */
export interface ResourceConfigLike {
	name: string;
	routes: ResourceRoutes;
	identity?: unknown;
	storage?: unknown;
	queryParams?: unknown;
	cacheKeys?: unknown;
	ui?: unknown;
	blocks?: unknown;
	schema?: unknown;
	[key: string]: unknown;
}

/**
 * Resource registry compatible with CLI ResourceRegistry.
 */
export interface ResourceRegistryLike {
	[key: string]: ResourceConfigLike;
}

export interface WPKConfigV1Like<
	TSchemas extends SchemaRegistryLike = SchemaRegistryLike,
	TResources extends ResourceRegistryLike = ResourceRegistryLike,
	TAdapters = unknown,
> {
	readonly version: 1;
	readonly namespace: string;
	readonly directories?: Record<string, string>;
	readonly schemas: TSchemas;
	readonly resources: TResources;
	readonly adapters?: TAdapters;
}

export interface LoadedWPKConfigV1Like<
	TConfig extends WPKConfigV1Like = WPKConfigV1Like,
	TOrigin extends string = string,
> {
	readonly config: TConfig;
	readonly sourcePath: string;
	readonly configOrigin: TOrigin;
	readonly namespace: string;
}

export interface IRRouteLike<
	TMethod extends string = string,
	TTransport extends string = string,
	TCapability = string | undefined,
> {
	readonly method: TMethod;
	readonly path: string;
	readonly capability?: TCapability;
	readonly hash: string;
	readonly transport: TTransport;
}

export interface IRResourceCacheKeyLike<
	TSegments extends readonly unknown[] = readonly unknown[],
	TSource extends string = string,
> {
	readonly segments: TSegments;
	readonly source: TSource;
}

export interface IRWarningLike<
	TContext extends Record<string, unknown> = Record<string, unknown>,
> {
	readonly code: string;
	readonly message: string;
	readonly context?: TContext;
}

export interface IRResourceLike<
	TRoute extends IRRouteLike = IRRouteLike,
	TCacheKey extends IRResourceCacheKeyLike = IRResourceCacheKeyLike,
	TIdentity = unknown,
	TStorage = unknown,
	TQueryParams = unknown,
	TUi = unknown,
	TWarning extends IRWarningLike = IRWarningLike,
> {
	readonly name: string;
	readonly schemaKey: string;
	readonly schemaProvenance: string;
	readonly routes: readonly TRoute[];
	readonly cacheKeys: {
		readonly list: TCacheKey;
		readonly get: TCacheKey;
		readonly create?: TCacheKey;
		readonly update?: TCacheKey;
		readonly remove?: TCacheKey;
	};
	readonly identity?: TIdentity;
	readonly storage?: TStorage;
	readonly queryParams?: TQueryParams;
	readonly ui?: TUi;
	readonly hash: string;
	readonly warnings: readonly TWarning[];
}

export interface IRMetaLike<TVersion extends number = number> {
	readonly version: TVersion;
	readonly namespace: string;
	readonly sourcePath: string;
	readonly origin: string;
	readonly sanitizedNamespace: string;
}

export interface IRv1Like<
	TConfig = WPKConfigV1Like,
	TSchema = unknown,
	TRoute extends IRRouteLike = IRRouteLike,
	TResource extends IRResourceLike<TRoute> = IRResourceLike<TRoute>,
	TCapabilityHint = unknown,
	TCapabilityMap = unknown,
	TBlock = unknown,
	TPhpProject = unknown,
	TDiagnostic = IRWarningLike,
> {
	readonly meta: IRMetaLike;
	readonly config: TConfig;
	readonly schemas: readonly TSchema[];
	readonly resources: readonly TResource[];
	readonly capabilities: readonly TCapabilityHint[];
	readonly capabilityMap: TCapabilityMap;
	readonly blocks: readonly TBlock[];
	readonly php: TPhpProject;
	readonly diagnostics?: readonly TDiagnostic[];
}

export interface BuildIrOptionsLike<TConfig = WPKConfigV1Like> {
	readonly config: TConfig;
	readonly namespace: string;
	readonly origin: string;
	readonly sourcePath: string;
}

export interface WorkspaceFileManifestLike {
	readonly writes: readonly string[];
	readonly deletes: readonly string[];
}

export interface WorkspaceWriteOptionsLike {
	readonly mode?: number;
	readonly ensureDir?: boolean;
	readonly [key: string]: unknown;
}

export interface WorkspaceWriteJsonOptionsLike
	extends WorkspaceWriteOptionsLike {
	readonly pretty?: boolean;
}

export interface WorkspaceRemoveOptionsLike {
	readonly recursive?: boolean;
	readonly force?: boolean;
	readonly [key: string]: unknown;
}

export interface WorkspaceMergeMarkersLike {
	readonly start: string;
	readonly mid: string;
	readonly end: string;
}

export interface WorkspaceMergeOptionsLike {
	readonly markers?: WorkspaceMergeMarkersLike;
	readonly [key: string]: unknown;
}

export interface WorkspaceLike<
	TFileManifest extends WorkspaceFileManifestLike = WorkspaceFileManifestLike,
	TWriteOptions extends WorkspaceWriteOptionsLike = WorkspaceWriteOptionsLike,
	TWriteJsonOptions extends
		WorkspaceWriteJsonOptionsLike = WorkspaceWriteJsonOptionsLike,
	TRemoveOptions extends
		WorkspaceRemoveOptionsLike = WorkspaceRemoveOptionsLike,
	TMergeOptions extends WorkspaceMergeOptionsLike = WorkspaceMergeOptionsLike,
> {
	readonly root: string;
	cwd: () => string;
	read: (file: string) => Promise<Buffer | null>;
	readText: (file: string) => Promise<string | null>;
	write: (
		file: string,
		data: Buffer | string,
		options?: TWriteOptions
	) => Promise<void>;
	writeJson: <T>(
		file: string,
		value: T,
		options?: TWriteJsonOptions
	) => Promise<void>;
	exists: (target: string) => Promise<boolean>;
	rm: (target: string, options?: TRemoveOptions) => Promise<void>;
	glob: (pattern: string | readonly string[]) => Promise<string[]>;
	threeWayMerge: (
		file: string,
		base: string,
		current: string,
		incoming: string,
		options?: TMergeOptions
	) => Promise<'clean' | 'conflict'>;
	begin: (label?: string) => void;
	commit: (label?: string) => Promise<TFileManifest>;
	rollback: (label?: string) => Promise<TFileManifest>;
	dryRun: <T>(
		fn: () => Promise<T>
	) => Promise<{ result: T; manifest: TFileManifest }>;
	tmpDir: (prefix?: string) => Promise<string>;
	resolve: (...parts: string[]) => string;
}

export interface BuilderWriteActionLike<TContents = Buffer | string> {
	readonly file: string;
	readonly contents: TContents;
}

export interface BuilderOutputLike<
	TAction extends BuilderWriteActionLike = BuilderWriteActionLike,
> {
	readonly actions: TAction[];
	queueWrite: (action: TAction) => void;
}
