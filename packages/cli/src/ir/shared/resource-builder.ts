import type { ResourceConfig } from '@wpkernel/core/resource';
import type { SerializableResourceConfig } from '../../config/types';
import { sortObject } from './canonical';
import type {
	BuildIrOptions,
	IRResource,
	IRWarning,
	SchemaProvenance,
} from '../publicTypes';
import { deriveCacheKeys, serializeCacheKeys } from './cache-keys';
import { normaliseRoutes } from './routes';
import type { SchemaAccumulator } from './schema';
import { resolveResourceSchema } from './schema';
import { buildHashProvenance } from './hashing';
import { createResourceId } from './identity';
import { toPascalCase } from '../../builders/php/utils';

interface ResourceBuilderState {
	duplicateDetector: Map<string, { resource: string; route: string }>;
	postTypeRegistry: Map<string, string>;
}

/**
 * Builds the full IR representation for all declared resources.
 *
 * Normalises routes, resolves schemas, infers identities, prepares storage
 * metadata, derives cache keys, and collects warnings.
 *
 * @param    options
 * @param    accumulator
 * @param    sanitizedNamespace
 * @category IR
 */
export async function buildResources(
	options: BuildIrOptions,
	accumulator: SchemaAccumulator,
	sanitizedNamespace: string
): Promise<IRResource[]> {
	const state: ResourceBuilderState = {
		duplicateDetector: new Map<
			string,
			{ resource: string; route: string }
		>(),
		postTypeRegistry: new Map<string, string>(),
	};

	const resources: IRResource[] = [];
	const resourceEntries = Object.entries(options.config.resources);

	for (const [resourceKey, resourceConfig] of resourceEntries) {
		const name =
			typeof resourceConfig.name === 'string' &&
			resourceConfig.name.length > 0
				? resourceConfig.name
				: resourceKey;
		(resourceConfig as SerializableResourceConfig).name = name;

		const resource = await buildResourceEntry({
			accumulator,
			resourceConfig,
			resourceKey,
			sanitizedNamespace,
			state,
			namespace: options.config.namespace,
		});

		resources.push(resource);
	}

	return resources;
}

/**
 * Builds a single resource IR entry.
 *
 * Applies all normalisation steps for one resource and returns IR + warnings.
 *
 * @param    options
 * @param    options.accumulator
 * @param    options.sanitizedNamespace
 * @param    options.resourceKey
 * @param    options.resourceConfig
 * @param    options.state
 * @param    options.namespace
 * @category IR
 */
async function buildResourceEntry(options: {
	accumulator: SchemaAccumulator;
	sanitizedNamespace: string;
	resourceKey: string;
	resourceConfig: SerializableResourceConfig;
	state: ResourceBuilderState;
	namespace: string;
}): Promise<IRResource> {
	const {
		accumulator,
		resourceKey,
		resourceConfig,
		sanitizedNamespace,
		state,
		namespace,
	} = options;

	const schemaResolution = await resolveResourceSchema(
		resourceKey,
		resourceConfig,
		accumulator,
		sanitizedNamespace
	);

	const { routes, warnings: routeWarnings } = normaliseRoutes({
		resourceKey,
		routes: resourceConfig.routes,
		duplicateDetector: state.duplicateDetector,
		sanitizedNamespace,
	});

	const identityResult = inferIdentity({
		resourceKey,
		provided: resourceConfig.identity,
		routes,
	});

	const storageResult = prepareStorage({
		resourceKey,
		storage: resourceConfig.storage,
		sanitizedNamespace,
	});

	const warnings = collectWarnings({
		routeWarnings,
		identityResult,
		storageResult,
		postTypeWarnings: recordPostTypeCollision({
			resourceKey,
			registry: state.postTypeRegistry,
			storageResult,
		}),
	});

	const cacheKeys = deriveCacheKeys(resourceConfig.name);

	const queryParams = normaliseQueryParams(resourceConfig.queryParams);

	// Infer minimal dataviews config when the admin view declares DataViews
	const inferredUi =
		resourceConfig.ui?.admin?.view === 'dataviews'
			? {
					admin: {
						...resourceConfig.ui.admin,
						dataviews: resourceConfig.ui.admin.dataviews ?? {
							fields: [],
							defaultView: { type: 'table' },
							preferencesKey: `${namespace}/dataviews/${resourceConfig.name}`,
						},
					},
				}
			: resourceConfig.ui;

	const irResource: IRResource = {
		id: createResourceId({
			namespace: sanitizedNamespace,
			key: resourceKey,
			name: resourceConfig.name,
			routes,
		}),
		controllerClass: buildControllerClassName(
			namespace,
			resourceConfig.name
		),
		name: resourceConfig.name,
		schemaKey: schemaResolution.schemaKey,
		schemaProvenance: schemaResolution.provenance,
		routes,
		cacheKeys,
		identity: identityResult.identity,
		storage: storageResult.storage,
		queryParams,
		ui: inferredUi,
		blocks: normaliseResourceBlocks(resourceConfig.blocks),
		capabilities: resourceConfig.capabilities,
		hash: hashResource({
			resourceConfig,
			schemaKey: schemaResolution.schemaKey,
			schemaProvenance: schemaResolution.provenance,
			routes,
			cacheKeys,
			identity: identityResult.identity,
			storage: storageResult.storage,
			queryParams,
		}),
		warnings,
	};

	return irResource;
}

function buildControllerClassName(
	namespace: string,
	resourceName: string
): string {
	const pascal = toPascalCase(resourceName);
	const phpNamespace = namespace
		.split('-')
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join('\\');
	return `${phpNamespace}\\Generated\\Rest\\${pascal}Controller`;
}

function collectWarnings(options: {
	routeWarnings: IRWarning[];
	identityResult: ReturnType<typeof inferIdentity>;
	storageResult: ReturnType<typeof prepareStorage>;
	postTypeWarnings: IRWarning[];
}): IRWarning[] {
	const warnings: IRWarning[] = [];
	warnings.push(...options.routeWarnings);

	if (options.identityResult.warning) {
		warnings.push(options.identityResult.warning);
	}

	warnings.push(...options.storageResult.warnings);
	warnings.push(...options.postTypeWarnings);

	return sortWarnings(warnings);
}

/**
 * Sorts IR warnings deterministically.
 *
 * Warnings are ordered first by code, then by message, ensuring consistent
 * snapshot output between builds.
 *
 * @param    warnings
 * @category IR
 */
export function sortWarnings(warnings: IRWarning[]): IRWarning[] {
	return warnings.slice().sort((a, b) => {
		const codeComparison = a.code.localeCompare(b.code);
		if (codeComparison !== 0) {
			return codeComparison;
		}

		return (a.message ?? '').localeCompare(b.message ?? '');
	});
}

/**
 * Normalises query parameter descriptors before they enter the IR.
 *
 * Keys are alphabetically sorted to guarantee deterministic build output.
 *
 * @param    params
 * @category IR
 */
export function normaliseQueryParams(
	params: ResourceConfig['queryParams'] | undefined
): ResourceConfig['queryParams'] | undefined {
	if (!params) {
		return undefined;
	}

	return sortObject(params);
}

function normaliseResourceBlocks(
	blocks: SerializableResourceConfig['blocks']
): IRResource['blocks'] | undefined {
	if (!blocks || typeof blocks !== 'object') {
		return undefined;
	}

	const mode = (blocks as { mode?: unknown }).mode;
	if (mode === 'ssr') {
		return { mode: 'ssr' };
	}
	if (mode === 'js') {
		return { mode: 'js' };
	}
	return undefined;
}

/**
 * Records collisions in inferred WordPress post types across resources.
 *
 * When two resources infer or declare the same post type, a warning is
 * generated so the user can resolve the conflict.
 * @param    options
 * @param    options.resourceKey
 * @param    options.registry
 * @param    options.storageResult
 * @category IR
 */
export function recordPostTypeCollision(options: {
	resourceKey: string;
	registry: Map<string, string>;
	storageResult: ReturnType<typeof prepareStorage>;
}): IRWarning[] {
	const candidate =
		options.storageResult.postType ??
		options.storageResult.explicitPostType;

	if (!candidate) {
		return [];
	}

	const existing = options.registry.get(candidate);
	if (existing && existing !== options.resourceKey) {
		return [
			{
				code: 'storage.wpPost.postType.collision',
				message: `${options.storageResult.postType ? 'Inferred post type' : 'Post type'} "${candidate}" for resource "${options.resourceKey}" collides with resource "${existing}".`,
				context: {
					resource: options.resourceKey,
					postType: candidate,
					existing,
				},
			},
		];
	}

	options.registry.set(candidate, options.resourceKey);

	return [];
}

/**
 * Infers a resource identity (id/slug/uuid) from route placeholders when the
 * user has not provided an explicit identity config.
 *
 * Inserts a warning into the IR whenever an inference occurs.
 *
 * @param    options
 * @param    options.resourceKey
 * @param    options.provided
 * @param    options.routes
 * @category IR
 */
export function inferIdentity(options: {
	resourceKey: string;
	provided: ResourceConfig['identity'];
	routes: IRResource['routes'];
}): { identity?: ResourceConfig['identity']; warning?: IRWarning } {
	if (options.provided) {
		return { identity: options.provided };
	}

	const placeholder = pickRoutePlaceholder(options.routes);
	if (!placeholder) {
		return {
			identity: undefined,
			warning: {
				code: 'identity.inference.missing',
				message: `Unable to infer identity for resource "${options.resourceKey}". Define resource.identity explicitly.`,
				context: { resource: options.resourceKey },
			},
		};
	}

	const inferred = createIdentityFromPlaceholder(placeholder);
	if (!inferred) {
		return {
			identity: undefined,
			warning: {
				code: 'identity.inference.unsupported',
				message: `Resource "${options.resourceKey}" routes reference :${placeholder} but no default identity mapping exists.`,
				context: { resource: options.resourceKey, placeholder },
			},
		};
	}

	return {
		identity: inferred,
		warning: {
			code: 'identity.inference.applied',
			message: `Resource "${options.resourceKey}" missing identity; inferred ${inferred.type} parameter "${inferred.param ?? 'id'}" from routes.`,
			context: { resource: options.resourceKey, placeholder },
		},
	};
}

/**
 * Extracts the most appropriate placeholder token from route definitions.
 *
 * Used for automatic identity inference.
 *
 * @param    routes
 * @category IR
 */
export function pickRoutePlaceholder(
	routes: IRResource['routes']
): string | undefined {
	const priority = ['id', 'slug', 'uuid'];
	const matches = new Map<string, number>();

	for (const route of routes) {
		const regex = /:([a-zA-Z0-9_]+)/g;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(route.path))) {
			const token = match[1]?.toLowerCase();
			if (token) {
				matches.set(token, (matches.get(token) ?? 0) + 1);
			}
		}
	}

	for (const candidate of priority) {
		if (matches.has(candidate)) {
			return candidate;
		}
	}

	const [first] = matches.keys();
	return first;
}

/**
 * Creates a default identity config object from a detected placeholder token.
 *
 * @param    placeholder
 * @category IR
 */
export function createIdentityFromPlaceholder(
	placeholder: string
): ResourceConfig['identity'] | undefined {
	switch (placeholder) {
		case 'id':
			return { type: 'number', param: 'id' };
		case 'slug':
			return { type: 'string', param: 'slug' };
		case 'uuid':
			return { type: 'string', param: 'uuid' };
		default:
			return undefined;
	}
}

/**
 * Applies storage defaults and derives missing WordPress post types.
 *
 * Produces warnings when post types are inferred or truncated.
 *
 * @param    options
 * @param    options.resourceKey
 * @param    options.storage
 * @param    options.sanitizedNamespace
 * @category IR
 */
export function prepareStorage(options: {
	resourceKey: string;
	storage: ResourceConfig['storage'];
	sanitizedNamespace: string;
}): {
	storage?: ResourceConfig['storage'];
	warnings: IRWarning[];
	postType?: string;
	explicitPostType?: string;
} {
	const { resourceKey, storage, sanitizedNamespace } = options;
	if (!storage) {
		return { storage: undefined, warnings: [] };
	}

	if (storage.mode !== 'wp-post') {
		return { storage: { ...storage }, warnings: [] };
	}

	const warnings: IRWarning[] = [];
	if (storage.postType) {
		return {
			storage: { ...storage },
			warnings,
			explicitPostType: storage.postType,
		};
	}

	const inferred = inferPostType({
		resourceKey,
		sanitizedNamespace,
	});

	warnings.push(...inferred.warnings);

	return {
		storage: { ...storage, postType: inferred.postType },
		warnings,
		postType: inferred.postType,
	};
}

/**
 * Infers a WordPress post type slug from the namespace and resource key.
 *
 * Guarantees a valid ≤20 character post type, generating warnings for truncation.
 *
 * @param    options
 * @param    options.resourceKey
 * @param    options.sanitizedNamespace
 * @category IR
 */
export function inferPostType(options: {
	resourceKey: string;
	sanitizedNamespace: string;
}): { postType: string; warnings: IRWarning[] } {
	const warnings: IRWarning[] = [];
	const namespaceSlug = options.sanitizedNamespace
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
	const resourceSlug = options.resourceKey
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	const fallback = resourceSlug ? `wpk_${resourceSlug}` : 'wpk_resource';
	const combined =
		[namespaceSlug, resourceSlug].filter(Boolean).join('_') || fallback;
	const trimmed = combined.slice(0, 20);

	if (combined.length > 20) {
		warnings.push({
			code: 'storage.wpPost.postType.truncated',
			message: `Derived post type "${combined}" for resource "${options.resourceKey}" exceeds 20 characters; truncated to "${trimmed}".`,
			context: { resource: options.resourceKey, postType: trimmed },
		});
	}

	return { postType: trimmed, warnings };
}

/**
 * Computes a canonical hash for the resource definition.
 *
 * Used by the CLI to detect configuration changes and drive incremental rebuilds.
 *
 * @param    options
 * @param    options.resourceConfig
 * @param    options.schemaKey
 * @param    options.schemaProvenance
 * @param    options.routes
 * @param    options.cacheKeys
 * @param    options.identity
 * @param    options.storage
 * @param    options.queryParams
 * @category IR
 */
export function hashResource(options: {
	resourceConfig: SerializableResourceConfig;
	schemaKey: string;
	schemaProvenance: SchemaProvenance;
	routes: IRResource['routes'];
	cacheKeys: IRResource['cacheKeys'];
	identity: ResourceConfig['identity'];
	storage: ResourceConfig['storage'];
	queryParams: ResourceConfig['queryParams'];
}): IRResource['hash'] {
	return buildHashProvenance(
		[
			'name',
			'schemaKey',
			'schemaProvenance',
			'routes',
			'cacheKeys',
			'identity',
			'storage',
			'queryParams',
			'ui',
			'blocks',
		],
		{
			name: options.resourceConfig.name,
			schemaKey: options.schemaKey,
			schemaProvenance: options.schemaProvenance,
			routes: options.routes.map((route) => ({
				method: route.method,
				path: route.path,
				capability: route.capability,
				transport: route.transport,
			})),
			cacheKeys: serializeCacheKeys(options.cacheKeys),
			identity: options.identity ?? null,
			storage: options.storage ?? null,
			queryParams: options.queryParams ?? null,
			ui: options.resourceConfig.ui ?? null,
			blocks:
				normaliseResourceBlocks(options.resourceConfig.blocks) ?? null,
		}
	);
}
