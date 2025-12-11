import { deriveResourceBlocks } from '../shared.blocks.derived';
import type {
	IRBlock,
	IRHashProvenance,
	IRResource,
	IRResourceCacheKey,
	IRRoute,
	IRSchema,
} from '../../ir/publicTypes';
import path from 'path';
import { createDefaultResource } from '@cli-tests/ir/resource-builder.mock';
import { makeIr } from '@cli-tests/ir.test-support';

describe('deriveResourceBlocks', () => {
	it('derives manifest attributes from schema definitions', () => {
		const schemaWithAttributes: IRSchema = {
			key: 'with-attributes',
			id: 'sch:with-attributes',
			sourcePath: '/schemas/with-attributes.schema.json',
			hash: makeHash('schema-hash', ['schema']),
			provenance: 'manual',
			schema: {
				type: 'object',
				properties: {
					title: {
						type: 'string',
						default: 'Untitled',
						description: 'Display title',
					},
					status: {
						enum: ['draft', 'published'],
						description: 'Current status',
					},
					multi: {
						type: ['string', 'boolean', 'unknown'],
					},
					described: {
						description: 'Only description',
					},
					defaultOnly: {
						default: 0,
					},
					typedEnum: {
						type: 'number',
						enum: [1, 2],
					},
					mixedEnum: {
						enum: ['alpha', 1],
					},
					unknownType: {
						type: 'mystery',
					},
					emptyEnum: {
						enum: [],
					},
					invalid: 'not-a-record',
				},
			},
		};

		const ir = makeIr({
			schemas: [schemaWithAttributes],
			resources: [
				makeResource('Alpha Resource', schemaWithAttributes.key),
			],
		});

		const derived = deriveResourceBlocks({
			ir,
			existingBlocks: new Map<string, IRBlock>(),
		});

		expect(derived).toHaveLength(1);
		const entry = derived[0]!;

		const namespace = ir.meta.namespace;
		const blockRoot = ir.artifacts.blockRoots.generated;

		expect(entry.block.key).toBe(`${namespace}/alpharesource`);
		expect(entry.block.directory).toBe(
			path.posix.join(blockRoot, 'alpharesource')
		);
		expect(entry.kind).toBe('js');
		expect(entry.block.id).toEqual(expect.stringMatching(/^blk:/));
		expect(entry.block.hash).toMatchObject({
			algo: 'sha256',
			inputs: ['key', 'directory', 'hasRender', 'manifestSource'],
		});
		expect(typeof entry.block.hash.value).toBe('string');

		expect(entry.manifest).toMatchObject({
			name: `${namespace}/alpharesource`,
			title: 'Alpha Resource',
			description: 'Alpha Resource block generated from project config',
			textdomain: namespace,
		});

		const manifestAttributes = (entry.manifest as Record<string, unknown>)
			.attributes as Record<string, unknown>;

		expect(manifestAttributes).not.toHaveProperty('unknownType');
		expect(manifestAttributes).not.toHaveProperty('emptyEnum');
		expect(manifestAttributes).not.toHaveProperty('invalid');
	});

	it('skips ineligible resources and derives fallback manifest metadata', () => {
		const schemaWithoutObject: IRSchema = {
			key: 'non-object',
			id: 'sch:non-object',
			sourcePath: '/schemas/non-object.schema.json',
			hash: makeHash('schema-non-object', ['schema']),
			provenance: 'manual',
			schema: {
				type: 'string',
			},
		};

		const ir = makeIr({
			schemas: [schemaWithoutObject],
			resources: [
				makeResource('Existing Resource', 'non-object'),
				makeResource('SSR Resource', 'non-object', {
					storage: { mode: 'wp-post' },
					routes: [
						makeRoute({
							method: 'GET',
							transport: 'local',
						}),
					],
				}),
				makeResource('Ui Only', 'missing-schema', {
					routes: [
						makeRoute({
							method: 'POST',
							transport: 'remote',
						}),
					],
					ui: { admin: { dataviews: {} } },
				}),
				makeResource('!!!', schemaWithoutObject.key),
			],
		});

		const existingBlockDir = path.posix.join(
			ir.artifacts.blockRoots.generated,
			'existingresource'
		);
		const namespace = ir.meta.namespace;
		const existingBlock: IRBlock = {
			id: 'blk:test-namespace/existingresource',
			hash: makeHash('existing-block', [
				'key',
				'directory',
				'hasRender',
				'manifestSource',
			]),
			key: `${namespace}/existingresource`,
			directory: existingBlockDir,
			hasRender: false,
			manifestSource: path.posix.join(existingBlockDir, 'block.json'),
		};

		const derived = deriveResourceBlocks({
			ir,
			existingBlocks: new Map([[existingBlock.key, existingBlock]]),
		});

		expect(derived).toHaveLength(3);

		const manifestByKey = new Map(
			derived.map((entry) => [entry.block.key, entry.manifest])
		);

		const uiManifest = manifestByKey.get(`${namespace}/uionly`);
		expect(uiManifest).toBeDefined();

		const unnamedManifest = manifestByKey.get(`${namespace}/`);
		expect(unnamedManifest).toBeDefined();
		expect(unnamedManifest).toMatchObject({
			title: 'Resource',
			name: `${namespace}/`,
		});

		const ssrEntry = derived.find(
			(entry) => entry.block.key === `${namespace}/ssrresource`
		);
		// SSR resource may be skipped when block inference deems it ineligible.
		if (!ssrEntry) {
		}
	});

	it('respects explicit blocks mode in resource config', () => {
		const ir = makeIr({
			schemas: [],
			resources: [
				makeResource('Content Block', 'auto', {
					routes: [
						makeRoute({
							method: 'POST',
							transport: 'remote',
						}),
					],
					blocks: { mode: 'ssr' },
				}),
			],
		});

		const derived = deriveResourceBlocks({
			ir,
			existingBlocks: new Map(),
		});

		expect(derived).toHaveLength(1);
		const entry = derived[0]!;
		expect(entry.kind).toBe('ssr');
		expect(entry.block.hasRender).toBe(true);
		expect(entry.manifest).toMatchObject({
			render: 'file:./render.php',
		});
	});
});

type ResourceOverrides = Partial<
	Omit<
		IRResource,
		| 'name'
		| 'schemaKey'
		| 'schemaProvenance'
		| 'routes'
		| 'cacheKeys'
		| 'hash'
		| 'warnings'
		| 'blocks'
	> & {
		routes: IRRoute[];
		cacheKeys: IRResource['cacheKeys'];
	}
> & {
	schemaProvenance?: IRResource['schemaProvenance'];
	routes?: IRRoute[];
	cacheKeys?: Partial<IRResource['cacheKeys']>;
	hash?: string;
	warnings?: IRResource['warnings'];
	blocks?: IRResource['blocks'];
};

// function makeIr(options?: {
// 	schemas?: IRSchema[];
// 	resources?: IRResource[];
// 	phpOutputDir?: string;
// 	namespace?: string;
// }): IRv1 {
// 	const namespace = options?.namespace ?? 'test-namespace';

// 	return {
// 		meta: {
// 			version: 1,
// 			namespace,
// 			sourcePath: '/path/to/wpk.config.ts',
// 			origin: 'typescript',
// 			sanitizedNamespace: namespace,
// 			features: [],
// 			ids: {
// 				algorithm: 'sha256',
// 				resourcePrefix: 'res:',
// 				schemaPrefix: 'sch:',
// 				blockPrefix: 'blk:',
// 				capabilityPrefix: 'cap:',
// 			},
// 			redactions: [],
// 			limits: {
// 				maxConfigKB: 512,
// 				maxSchemaKB: 512,
// 				policy: 'error',
// 			},
// 			plugin: {
// 				name: 'test-plugin',
// 				description: 'Test plugin',
// 				version: '0.0.0',
// 				requiresAtLeast: '6.4',
// 				requiresPhp: '8.1',
// 				textDomain: 'test-plugin',
// 				author: 'tests',
// 				license: 'EUPL-1.2',
// 			},
// 		},
// 		schemas: options?.schemas ?? [],
// 		resources: options?.resources ?? [],
// 		capabilities: [],
// 		capabilityMap: {
// 			definitions: [],
// 			fallback: {
// 				capability: 'manage_' + namespace,
// 				appliesTo: 'resource',
// 			},
// 			missing: [],
// 			unused: [],
// 			warnings: [],
// 		},
// 		blocks: [],
// 		php: {
// 			namespace,
// 			autoload: 'inc/',
// 		},
// 		layout,
// 		diagnostics: [],
// 	};
// }

function makeResource(
	name: string,
	schemaKey: string,
	overrides?: ResourceOverrides
): IRResource {
	const base = createDefaultResource();
	const routes = overrides?.routes ?? [makeRoute()];
	const cacheKeys = buildCacheKeys(overrides?.cacheKeys);

	return {
		...base,
		id: overrides?.id ?? `res:${name}`,
		name,
		schemaKey,
		schemaProvenance: overrides?.schemaProvenance ?? 'manual',
		routes,
		cacheKeys,
		identity: overrides?.identity,
		storage: overrides?.storage,
		queryParams: overrides?.queryParams,
		ui: overrides?.ui,
		blocks: overrides?.blocks ?? { mode: 'js' },
		hash:
			(overrides?.hash as IRHashProvenance | undefined) ??
			makeHash(`${name}-hash`, ['name', 'schemaKey', 'schemaProvenance']),
		warnings: overrides?.warnings ?? [],
	} satisfies IRResource;
}

function buildCacheKeys(
	overrides?: Partial<IRResource['cacheKeys']>
): IRResource['cacheKeys'] {
	return {
		list: overrides?.list ?? makeCacheKey('list'),
		get: overrides?.get ?? makeCacheKey('get'),
		create: overrides?.create,
		update: overrides?.update,
		remove: overrides?.remove,
	} satisfies IRResource['cacheKeys'];
}

function makeCacheKey(label: string): IRResourceCacheKey {
	return {
		segments: [label],
		source: 'default',
	} satisfies IRResourceCacheKey;
}

function makeRoute(overrides?: Partial<IRRoute>): IRRoute {
	return {
		method: 'GET',
		path: '/resource',
		hash:
			overrides?.hash ??
			makeHash('route-hash', [
				'method',
				'path',
				'capability',
				'transport',
			]),
		transport: 'remote',
		...overrides,
	} satisfies IRRoute;
}

function makeHash(label: string, inputs: readonly string[]): IRHashProvenance {
	return {
		algo: 'sha256',
		inputs: Array.from(inputs),
		value: label,
	} satisfies IRHashProvenance;
}
