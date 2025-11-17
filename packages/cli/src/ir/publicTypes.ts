import type {
	ResourceCapabilityMap,
	ResourceIdentityConfig,
	ResourceQueryParams,
	ResourceStorageConfig,
	ResourceUIConfig,
} from '@wpkernel/core/resource';
import type { WPKernelConfigV1 } from '../config/types';

/**
 * Defines the provenance of a schema, indicating how it was generated or provided.
 *
 * @category IR
 */
export type SchemaProvenance = 'manual' | 'auto';

/**
 * Normalised hash metadata used across IR entities.
 *
 * @category IR
 */
export interface IRHashProvenance {
	/** The hashing algorithm used to generate the value. */
	algo: 'sha256';
	/** The logical inputs that were included in the hash derivation. */
	inputs: readonly string[];
	/** The computed hash digest. */
	value: string;
}

/**
 * Represents an Intermediate Representation (IR) for a schema.
 *
 * @category IR
 */
export interface IRSchema {
	/** Stable identifier for the schema entry. */
	id: string;
	/** A unique key for the schema. */
	key: string;
	/** The source path of the schema definition. */
	sourcePath: string;
	/** A hash of the schema content for change detection. */
	hash: IRHashProvenance;
	/** The actual schema definition. */
	schema: unknown;
	/** The provenance of the schema (manual or auto-generated). */
	provenance: SchemaProvenance;
	/** Optional: Information about what the schema was generated from. */
	generatedFrom?: {
		type: 'storage';
		resource: string;
	};
}

/**
 * Defines the transport type for an IR route.
 *
 * @category IR
 */
export type IRRouteTransport = 'local' | 'remote';

/**
 * Represents an Intermediate Representation (IR) for a resource route.
 *
 * @category IR
 */
export interface IRRoute {
	/** The HTTP method of the route (e.g., 'GET', 'POST'). */
	method: string;
	/** The URL path of the route. */
	path: string;
	/** Optional: The capability required to access this route. */
	capability?: string;
	/** A hash of the route definition for change detection. */
	hash: IRHashProvenance;
	/** The transport mechanism for the route (local or remote). */
	transport: IRRouteTransport;
}

/**
 * Represents an Intermediate Representation (IR) for a resource cache key.
 *
 * @category IR
 */
export interface IRResourceCacheKey {
	/** The segments that make up the cache key. */
	segments: readonly unknown[];
	/** The source of the cache key definition (default or config). */
	source: 'default' | 'config';
}

/**
 * Represents a warning generated during IR processing.
 *
 * @category IR
 */
export interface IRWarning {
	/** A unique code for the warning. */
	code: string;
	/** A human-readable warning message. */
	message: string;
	/** Optional: Additional context for the warning. */
	context?: Record<string, unknown>;
	/** Optional: Suggested operator hint for resolving the warning. */
	hint?: string;
}

/**
 * Defines the severity level of an IR diagnostic message.
 *
 * @category IR
 */
export type IRDiagnosticSeverity = 'info' | 'warn' | 'error';

/**
 * Identifies the entity or surface that triggered a diagnostic.
 *
 * @category IR
 */
export interface IRDiagnosticTarget {
	/** The entity type the diagnostic is associated with. */
	type: 'resource' | 'capability-map' | 'schema' | 'block' | 'adapter';
	/** Optional: Stable identifier of the target entity. */
	id?: string;
	/** Optional: JSON pointer path anchoring to a specific field. */
	path?: string;
}

/**
 * Represents an Intermediate Representation (IR) for a diagnostic message.
 *
 * @category IR
 */
export interface IRDiagnostic {
	/** Canonical diagnostic code. */
	code: string;
	/** The diagnostic message. */
	message: string;
	/** The severity of the diagnostic. */
	severity: IRDiagnosticSeverity;
	/** Optional: Entity the diagnostic refers to. */
	target?: IRDiagnosticTarget;
	/** Optional: Suggested hint for resolving the diagnostic. */
	hint?: string;
	/** Optional: Source that emitted the diagnostic (fragment, adapter, etc.). */
	source?: string;
}

/**
 * Represents an Intermediate Representation (IR) for a resource.
 *
 * @category IR
 */
export interface IRResource {
	/** Stable identifier for the resource entry. */
	id: string;
	/** The name of the resource. */
	name: string;
	/** The key of the schema associated with this resource. */
	schemaKey: string;
	/** The provenance of the schema. */
	schemaProvenance: SchemaProvenance;
	/** An array of routes defined for this resource. */
	routes: IRRoute[];
	/** Cache key definitions for various resource operations. */
	cacheKeys: {
		list: IRResourceCacheKey;
		get: IRResourceCacheKey;
		create?: IRResourceCacheKey;
		update?: IRResourceCacheKey;
		remove?: IRResourceCacheKey;
	};
	/** Optional: Identity configuration for the resource. */
	identity?: ResourceIdentityConfig;
	/** Optional: Storage configuration for the resource. */
	storage?: ResourceStorageConfig;
	/** Optional: Query parameters configuration for the resource. */
	queryParams?: ResourceQueryParams;
	/** Optional: UI configuration for the resource. */
	ui?: ResourceUIConfig;
	/** Optional: Generated block configuration (js-only or SSR). */
	blocks?: IRResourceBlocksConfig;
	/** Optional: Inline capability mappings for the resource. */
	capabilities?: ResourceCapabilityMap;
	/** A hash of the resource definition for change detection. */
	hash: IRHashProvenance;
	/** An array of warnings associated with this resource. */
	warnings: IRWarning[];
}

export interface IRResourceBlocksConfig {
	mode: 'js' | 'ssr';
}

/**
 * Normalized menu configuration for UI resources.
 *
 * @category IR
 */
export interface IRUiMenuConfig {
	readonly slug?: string;
	readonly title?: string;
	readonly capability?: string;
	readonly parent?: string;
	readonly position?: number;
}

/**
 * UI resource descriptor produced from resource DataViews metadata.
 *
 * @category IR
 */
export interface IRUiResourceDescriptor {
	readonly resource: string;
	readonly preferencesKey: string;
	readonly menu?: IRUiMenuConfig;
}

/**
 * Aggregated UI metadata derived from the configuration.
 *
 * @category IR
 */
export interface IRUiSurface {
	readonly resources: readonly IRUiResourceDescriptor[];
}

/**
 * Represents an Intermediate Representation (IR) for a capability hint.
 *
 * @category IR
 */
export interface IRCapabilityHint {
	/** The key of the capability. */
	key: string;
	/** The source of the capability hint (resource or config). */
	source: 'resource' | 'config';
	/** References to where this capability is used. */
	references: Array<{
		resource: string;
		route: string;
		transport: IRRouteTransport;
	}>;
}

/**
 * Defines the scope of a capability.
 *
 * @category IR
 */
export type IRCapabilityScope = 'resource' | 'object';

/**
 * Represents an Intermediate Representation (IR) for a capability definition.
 *
 * @category IR
 */
export interface IRCapabilityDefinition {
	/** Stable identifier for the capability definition. */
	id: string;
	/** The key of the capability. */
	key: string;
	/** The underlying capability string. */
	capability: string;
	/** The scope to which the capability applies. */
	appliesTo: IRCapabilityScope;
	/** Optional: The binding parameter for object-level capabilities. */
	binding?: string;
	/** The source of the capability definition (map or fallback). */
	source: 'map' | 'fallback';
}

/**
 * Represents an Intermediate Representation (IR) for a capability map.
 *
 * @category IR
 */
export interface IRCapabilityMap {
	/** Optional: The source path of the capability map definition. */
	sourcePath?: string;
	/** An array of capability definitions. */
	definitions: IRCapabilityDefinition[];
	/** Fallback capability definition. */
	fallback: {
		capability: string;
		appliesTo: IRCapabilityScope;
	};
	/** An array of missing capabilities. */
	missing: string[];
	/** An array of unused capabilities. */
	unused: string[];
	/** An array of warnings related to the capability map. */
	warnings: IRWarning[];
}

/**
 * Represents an Intermediate Representation (IR) for a block.
 *
 * @category IR
 */
export interface IRBlock {
	/** Stable identifier for the block entry. */
	id: string;
	/** A unique key for the block. */
	key: string;
	/** The directory where the block is defined. */
	directory: string;
	/** Indicates if the block has a render function. */
	hasRender: boolean;
	/** The source path of the block's manifest. */
	manifestSource: string;
	/** Provenance hash for the discovered block. */
	hash: IRHashProvenance;
}

/**
 * Represents an Intermediate Representation (IR) for a PHP project.
 *
 * @category IR
 */
export interface IRPhpProject {
	/** The PHP namespace of the project. */
	namespace: string;
	/** The autoload path for the PHP project. */
	autoload: string;
	/** The output directory for generated PHP files. */
	outputDir: string;
}

/**
 * Operation emitted when adapter extensions mutate the IR.
 *
 * @category IR
 */
export interface IRAdapterChangeOperation {
	/** The type of change performed. */
	op: 'add' | 'remove' | 'update' | 'replace-structure';
	/** JSON pointer path of the mutated field. */
	path: string;
	/** Optional: Previous value when a primitive change was detected. */
	before?: unknown;
	/** Optional: New value when a primitive change was detected. */
	after?: unknown;
	/** Optional: Hash of the previous structure when diffing complex data. */
	beforeHash?: string;
	/** Optional: Hash of the new structure when diffing complex data. */
	afterHash?: string;
}

/**
 * Change record produced for adapter mutations.
 *
 * @category IR
 */
export interface IRAdapterChange {
	/** Name of the adapter extension that performed the change. */
	name: string;
	/** Ordered list of detected operations. */
	ops: IRAdapterChangeOperation[];
}

/**
 * Adapter mutation audit envelope stored on the IR.
 *
 * @category IR
 */
export interface IRAdapterAudit {
	/** Change operations detected while running adapter extensions. */
	changes: IRAdapterChange[];
}

/**
 * Cross-reference integrity result for the assembled IR.
 *
 * @category IR
 */
export interface IRReferenceIssue {
	/** JSON pointer path from which the invalid reference originates. */
	from: string;
	/** The referenced key or identifier. */
	key: string;
}

/**
 * Resolved workspace layout mapping for generated and applied artifacts.
 *
 * @category IR
 */
export interface IRLayout {
	resolve: (id: string) => string;
	all: Record<string, string>;
}

/**
 * Summary of reference issues used by CI or tooling.
 *
 * @category IR
 */
export interface IRReferenceSummary {
	/** References that could not be resolved. */
	missing: IRReferenceIssue[];
	/** References that were declared but unused. */
	unused: IRReferenceIssue[];
}

/**
 * The top-level Intermediate Representation (IR) for version 1.
 *
 * @category IR
 */
export interface IRv1 {
	/** Metadata about the IR, including version, namespace, and source information. */
	meta: {
		version: 1;
		namespace: string;
		sourcePath: string;
		origin: string;
		sanitizedNamespace: string;
		features: string[];
		ids: {
			algorithm: 'sha256';
			resourcePrefix: 'res:';
			schemaPrefix: 'sch:';
			blockPrefix: 'blk:';
			capabilityPrefix: 'cap:';
		};
		redactions: string[];
		limits: {
			maxConfigKB: number;
			maxSchemaKB: number;
			policy: 'truncate' | 'error';
		};
	};
	/** The original WPKernel configuration. */
	config: WPKernelConfigV1;
	/** An array of schema IRs. */
	schemas: IRSchema[];
	/** An array of resource IRs. */
	resources: IRResource[];
	/** An array of capability hints. */
	capabilities: IRCapabilityHint[];
	/** The capability map IR. */
	capabilityMap: IRCapabilityMap;
	/** An array of block IRs. */
	blocks: IRBlock[];
	/** The PHP project IR. */
	php: IRPhpProject;
	/** Resolved layout map for internal/applied artifacts. */
	layout: IRLayout;
	/** Optional: UI metadata derived from resources. */
	ui?: IRUiSurface;
	/** Optional: An array of diagnostic messages. */
	diagnostics?: IRDiagnostic[];
	/** Optional: Adapter change audit trail. */
	adapterAudit?: IRAdapterAudit;
	/** Optional: Cross-reference summary for CI inspection. */
	references?: IRReferenceSummary;
}

/**
 * Options for building the Intermediate Representation (IR).
 *
 * @category IR
 */
export interface BuildIrOptions {
	/** The WPKernel configuration. */
	config: WPKernelConfigV1;
	/** The source path of the configuration file. */
	sourcePath: string;
	/** The origin of the configuration. */
	origin: string;
	/** The namespace of the project. */
	namespace: string;
}
