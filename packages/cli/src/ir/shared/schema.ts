import path from 'node:path';
import { promises as fs } from 'node:fs';
import { WPKernelError } from '@wpkernel/core/error';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import type {
	ResourceConfig,
	ResourcePostMetaDescriptor,
} from '@wpkernel/core/resource';
import type {
	FragmentIrOptions,
	IRSchema,
	SchemaProvenance,
} from '../publicTypes';
import { hashCanonical, sortObject } from './canonical';
import { buildHashProvenance } from './hashing';
import { createSchemaId } from './identity';
import { toWorkspaceRelative } from '../../workspace';
import { resolveFromWorkspace } from '../../workspace/utilities';

const JSON_SCHEMA_URL = 'https://json-schema.org/draft/2020-12/schema';
const SCHEMA_REGISTRY_BASE_URL = `https://schemas.${WPK_NAMESPACE}.dev`;

/**
 * Accumulator for discovered IR schemas.
 *
 * Holds an ordered `entries` array and a lookup map by schema key for
 * quick de-duplication and resolution during IR assembly.
 *
 * @category IR
 */
export interface SchemaAccumulator {
	entries: IRSchema[];
	byKey: Map<string, IRSchema>;
}

/**
 * Create an empty schema accumulator.
 *
 * @returns New SchemaAccumulator with an empty entries array and map
 * @category IR
 */
export function createSchemaAccumulator(): SchemaAccumulator {
	return { entries: [], byKey: new Map() };
}

/**
 * Load schemas declared in the workspace configuration into the
 * accumulator.
 *
 * Each configured schema is resolved from the configured path, loaded,
 * hashed and stored with provenance metadata.
 *
 * @param    options       - Build IR options containing config and sourcePath
 * @param    accumulator   - SchemaAccumulator to populate
 * @param    workspaceRoot
 * @category IR
 */
export async function loadConfiguredSchemas(
	options: FragmentIrOptions,
	accumulator: SchemaAccumulator,
	workspaceRoot: string
): Promise<void> {
	const schemaEntries = Object.entries(options.config.schemas);

	for (const [key, schemaConfig] of schemaEntries) {
		const resolvedPath = await resolveSchemaPath(
			schemaConfig.path,
			options.sourcePath
		);

		const schema = await loadJsonSchema(resolvedPath, key);
		const hash = buildHashProvenance(['schema'], schema);

		const irSchema: IRSchema = {
			id: createSchemaId({
				key,
				provenance: 'manual',
				schema,
				sourcePath: toWorkspaceRelative(workspaceRoot, resolvedPath),
			}),
			key,
			sourcePath: toWorkspaceRelative(workspaceRoot, resolvedPath),
			hash,
			schema,
			provenance: 'manual',
		};

		accumulator.entries.push(irSchema);
		accumulator.byKey.set(key, irSchema);
	}
}

/**
 * Resolve which schema a resource should use.
 *
 * If a resource declares `schema: 'auto'` a synthesised schema is created
 * from the resource storage/meta; otherwise an explicit schema reference
 * is looked up in the accumulator.
 *
 * @param    resourceKey        - Name/key of the resource
 * @param    resource           - ResourceConfig from workspace config
 * @param    accumulator        - SchemaAccumulator containing loaded schemas
 * @param    sanitizedNamespace - Namespace used to generate schema $id
 * @returns Object with chosen schemaKey and its provenance
 * @category IR
 */
export function resolveResourceSchema(
	resourceKey: string,
	resource: ResourceConfig,
	accumulator: SchemaAccumulator,
	sanitizedNamespace: string
): { schemaKey: string; provenance: SchemaProvenance } {
	const schema = inferSchemaSetting(resource);

	if (schema === 'auto') {
		const schemaKey = `auto:${resourceKey}`;
		const existing = accumulator.byKey.get(schemaKey);
		if (existing) {
			return { schemaKey, provenance: existing.provenance };
		}

		const synthesizedSchema = synthesiseSchema(
			resource,
			sanitizedNamespace
		);
		const hash = buildHashProvenance(['schema'], synthesizedSchema);

		const irSchema: IRSchema = {
			id: createSchemaId({
				key: schemaKey,
				provenance: 'auto',
				schema: synthesizedSchema,
				sourcePath: `[storage:${resourceKey}]`,
			}),
			key: schemaKey,
			sourcePath: `[storage:${resourceKey}]`,
			hash,
			schema: synthesizedSchema,
			provenance: 'auto',
			generatedFrom: {
				type: 'storage',
				resource: resourceKey,
			},
		};

		accumulator.entries.push(irSchema);
		accumulator.byKey.set(schemaKey, irSchema);

		return { schemaKey, provenance: 'auto' };
	}

	if (typeof schema !== 'string') {
		if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
			const normalizedSchema = sortObject(
				schema as Record<string, unknown>
			);
			const hash = hashCanonical(normalizedSchema);
			const schemaKey = `inline:${hash}`;
			const existingInline = accumulator.byKey.get(schemaKey);
			if (existingInline) {
				return { schemaKey, provenance: existingInline.provenance };
			}

			const irSchema: IRSchema = {
				id: createSchemaId({
					key: schemaKey,
					provenance: 'manual',
					schema: normalizedSchema,
					sourcePath: `[inline:${resourceKey}]`,
				}),
				key: schemaKey,
				sourcePath: `[inline:${resourceKey}]`,
				hash: buildHashProvenance(['schema'], normalizedSchema),
				schema: normalizedSchema,
				provenance: 'manual',
			};

			accumulator.entries.push(irSchema);
			accumulator.byKey.set(schemaKey, irSchema);

			return { schemaKey, provenance: 'manual' };
		}

		throw new WPKernelError('ValidationError', {
			message: `Resource "${resourceKey}" must declare a schema reference or use 'auto'.`,
			context: { resource: resourceKey },
		});
	}

	const irSchema = accumulator.byKey.get(schema);
	if (!irSchema) {
		throw new WPKernelError('ValidationError', {
			message: `Resource "${resourceKey}" references unknown schema "${schema}".`,
			context: { resource: resourceKey, schema },
		});
	}

	return { schemaKey: schema, provenance: irSchema.provenance };
}

/**
 * Infer the schema setting for a resource.
 *
 * Explicit `resource.schema` is honoured. If missing and the resource
 * declares storage, `auto` is returned to indicate a generated schema
 * should be synthesised.
 *
 * @param    resource - ResourceConfig to inspect
 * @returns The explicit schema reference or 'auto'
 * @category IR
 */
export function inferSchemaSetting(
	resource: ResourceConfig
): ResourceConfig['schema'] | 'auto' {
	if (resource.schema) {
		return resource.schema;
	}

	if (resource.storage) {
		return 'auto';
	}

	return resource.schema;
}

/**
 * Resolve a configured schema path to an absolute filesystem path.
 *
 * The function will accept absolute paths, resolve paths relative to the
 * config file, or resolve paths relative to the workspace root. A
 * ValidationError is thrown when the path cannot be resolved.
 *
 * @param    schemaPath - Path declared in the config
 * @param    configPath - Path to the config file for resolving relative refs
 * @returns Absolute filesystem path to the schema file
 * @category IR
 */
export async function resolveSchemaPath(
	schemaPath: string,
	configPath: string
): Promise<string> {
	if (path.isAbsolute(schemaPath)) {
		await ensureFileExists(schemaPath);
		return schemaPath;
	}

	const configDirectory = path.dirname(configPath);
	const configRelative = path.resolve(configDirectory, schemaPath);

	if (await fileExists(configRelative)) {
		return configRelative;
	}

	const workspaceRelative = resolveFromWorkspace(schemaPath);
	if (await fileExists(workspaceRelative)) {
		return workspaceRelative;
	}

	throw new WPKernelError('ValidationError', {
		message: `Schema path "${schemaPath}" could not be resolved from ${configPath}.`,
		context: { schemaPath, configPath },
	});
}

/**
 * Ensure the given file exists, throwing a ValidationError otherwise.
 *
 * @param    filePath - Path to verify
 * @category IR
 */
export async function ensureFileExists(filePath: string): Promise<void> {
	if (!(await fileExists(filePath))) {
		throw new WPKernelError('ValidationError', {
			message: `Schema file "${filePath}" does not exist.`,
			context: { filePath },
		});
	}
}

/**
 * Check whether a candidate path exists and is a file.
 *
 * Returns false for non-existent paths and re-throws unexpected errors.
 *
 * @param    candidate - Path to test
 * @returns True when candidate exists and is a regular file
 * @category IR
 */
export async function fileExists(candidate: string): Promise<boolean> {
	try {
		const stats = await fs.stat(candidate);
		return stats.isFile();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}

/**
 * Load and parse a JSON Schema file from disk.
 *
 * Parsing failures are reported as ValidationError with contextual
 * information to aid debugging.
 *
 * @param    filePath - Filesystem path to the schema file
 * @param    key      - Logical key/name of the schema for error messages
 * @returns Parsed JSON schema value
 * @category IR
 */
export async function loadJsonSchema(
	filePath: string,
	key: string
): Promise<unknown> {
	try {
		const raw = await fs.readFile(filePath, 'utf8');
		return JSON.parse(raw);
	} catch (error) {
		const message = `Failed to load JSON schema for "${key}" from ${filePath}.`;
		throw new WPKernelError('ValidationError', {
			message,
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}
}

/**
 * Synthesize a JSON Schema for a resource using storage/post-meta
 * descriptors.
 *
 * This produces a minimal, deterministic schema (title, $id, properties)
 * suitable for use when resources opt into `schema: 'auto'`.
 *
 * @param    resource           - Resource configuration to synthesise schema from
 * @param    sanitizedNamespace - Namespace used to compose $id values
 * @returns A JSON Schema object for the resource
 * @category IR
 */
export function synthesiseSchema(
	resource: ResourceConfig,
	sanitizedNamespace: string
): Record<string, unknown> {
	const title = toTitleCase(resource.name);
	const baseSchema: Record<string, unknown> = {
		$schema: JSON_SCHEMA_URL,
		$id: `${SCHEMA_REGISTRY_BASE_URL}/${sanitizedNamespace}/${resource.name}.json`,
		title: `${title} Resource`,
		type: 'object',
		additionalProperties: false,
		properties: {},
	};

	const storage = resource.storage;
	if (storage?.mode === 'wp-post' && storage.meta) {
		const properties: Record<string, unknown> = {};
		for (const [metaKey, descriptor] of Object.entries(storage.meta)) {
			properties[metaKey] = createSchemaFromPostMeta(descriptor);
		}

		if (Object.keys(properties).length > 0) {
			baseSchema.properties = sortObject(properties);
		}
	}

	return sortObject(baseSchema);
}

/**
 * Create a small JSON Schema fragment from a post meta descriptor.
 *
 * Handles single vs multi-valued meta and returns either an item schema or
 * an array schema as appropriate.
 *
 * @param    descriptor - Post meta descriptor from resource storage config
 * @returns JSON Schema fragment describing the meta property
 * @category IR
 */
export function createSchemaFromPostMeta(
	descriptor: ResourcePostMetaDescriptor
): Record<string, unknown> {
	const type = descriptor.type;
	if (descriptor.single === false) {
		return {
			type: 'array',
			items: { type },
		};
	}

	return { type };
}

/**
 * Convert a kebab/underscore/colon separated identifier into Title Case.
 *
 * Used to create human-friendly schema titles from resource names.
 *
 * @param    value - Identifier to convert
 * @returns Title-cased string
 * @category IR
 */
export function toTitleCase(value: string): string {
	return value
		.split(/[-_:]/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}
