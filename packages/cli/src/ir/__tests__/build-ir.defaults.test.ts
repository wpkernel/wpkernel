import type { WPKernelConfigV1 } from '../../config/types';
import { createIr } from '../createIr';
import {
	FIXTURE_CONFIG_PATH,
	canonicalHash,
	createBaseConfig,
} from '../shared/test-helpers';

describe('buildIr - defaults and inference', () => {
	it('derives default cache keys when not provided', async () => {
		const config = createBaseConfig();
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
					get: {
						path: '/test-namespace/v1/items/:id',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const cacheKeys = ir.resources[0]!.cacheKeys;
		expect(cacheKeys.list).toEqual({
			source: 'default',
			segments: ['demo', 'list', '{}'],
		});
		expect(cacheKeys.get).toEqual({
			source: 'default',
			segments: ['demo', 'get', '__wpk_id__'],
		});
	});

	it('collects capability references across routes and resources', async () => {
		const config = createBaseConfig();
		config.resources = {
			alpha: {
				name: 'alpha',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/alpha',
						method: 'GET',
						capability: 'shared.capability',
					},
					create: {
						path: '/test-namespace/v1/alpha',
						method: 'POST',
						capability: 'shared.capability',
					},
				},
			},
			beta: {
				name: 'beta',
				schema: 'auto',
				routes: {
					get: {
						path: '/test-namespace/v1/beta/:id',
						method: 'GET',
						capability: 'shared.capability',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const [capability] = ir.capabilities.filter(
			(candidate) => candidate.key === 'shared.capability'
		);
		expect(capability?.references).toHaveLength(3);
		expect(
			capability?.references.map((reference) => reference.resource)
		).toEqual(['alpha', 'alpha', 'beta']);
	});

	it('normalises complex route paths and preserves transport classification', async () => {
		const config = createBaseConfig();
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: {
						path: '//test-namespace//v1/items/',
						method: 'GET',
					},
					update: {
						path: 'test-namespace/v1/items/:id/',
						method: 'PUT',
					},
					remote: {
						path: '/external/v1/items',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const paths = ir.resources[0]!.routes.map((route) => [
			route.path,
			route.transport,
		]);
		expect(paths).toEqual([
			['/external/v1/items', 'remote'],
			['/test-namespace/v1/items', 'local'],
			['/test-namespace/v1/items/:id', 'local'],
		]);

		const warningCodes = ir.resources[0]!.warnings.map(
			(warning) => warning.code
		);
		expect(warningCodes).toContain('route.remote.namespace');
	});

	it('classifies absolute routes as remote and emits warnings', async () => {
		const config = createBaseConfig();
		config.resources = {
			external: {
				name: 'external',
				schema: 'auto',
				routes: {
					list: {
						path: 'https://api.example.com/items',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const [resource] = ir.resources;
		expect(resource?.routes[0]?.transport).toBe('remote');
		expect(resource?.warnings.map((warning) => warning.code)).toEqual([
			'identity.inference.missing',
			'route.remote.absolute',
		]);
	});

	it('infers identity metadata from route placeholders', async () => {
		const config = createBaseConfig();
		config.resources = {
			posts: {
				name: 'posts',
				schema: 'auto',
				routes: {
					get: {
						path: '/test-namespace/v1/posts/:slug',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const [resource] = ir.resources;
		expect(resource?.identity).toEqual({ type: 'string', param: 'slug' });
		expect(resource?.warnings.map((warning) => warning.code)).toContain(
			'identity.inference.applied'
		);
	});

	it('warns when identity inference cannot determine a supported placeholder', async () => {
		const config = createBaseConfig();
		config.resources = {
			complex: {
				name: 'complex',
				schema: 'auto',
				routes: {
					get: {
						path: '/test-namespace/v1/things/:custom',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const [resource] = ir.resources;
		expect(resource?.identity).toBeUndefined();
		expect(resource?.warnings.map((warning) => warning.code)).toContain(
			'identity.inference.unsupported'
		);
	});

	it('defaults schema to auto when storage is provided without schema', async () => {
		const config = createBaseConfig();
		config.resources = {
			jobs: {
				name: 'jobs',
				routes: {
					list: {
						path: '/test-namespace/v1/jobs',
						method: 'GET',
					},
				},
				storage: { mode: 'wp-post' },
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const [schema] = ir.schemas;
		expect(schema?.key).toBe('auto:jobs');
		expect(schema?.hash.value).toBe(canonicalHash(schema?.schema));
	});

	it('infers wp-post postType with truncation warnings and collision detection', async () => {
		const config = createBaseConfig();
		config.namespace = 'very-long-namespace-value';
		config.resources = {
			alpha: {
				name: 'alpha',
				schema: 'auto',
				routes: {
					get: {
						path: '/very-long-namespace-value/v1/alpha/:id',
						method: 'GET',
					},
				},
				storage: { mode: 'wp-post' },
			},
			beta: {
				name: 'super-long-resource-name-beta',
				schema: 'auto',
				routes: {
					get: {
						path: '/very-long-namespace-value/v1/beta/:id',
						method: 'GET',
					},
				},
				storage: { mode: 'wp-post' },
			},
			gamma: {
				name: 'super-long-resource-name-alpha',
				schema: 'auto',
				routes: {
					get: {
						path: '/very-long-namespace-value/v1/gamma/:id',
						method: 'GET',
					},
				},
				storage: { mode: 'wp-post' },
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const postTypes = ir.resources.map(
			(resource) =>
				resource.storage?.mode === 'wp-post' &&
				resource.storage.postType
		);
		expect(
			postTypes.every((postType) => typeof postType === 'string')
		).toBe(true);
		const uniquePostTypes = new Set(postTypes);
		expect(uniquePostTypes.size).toBeLessThan(postTypes.length);
		for (const postType of postTypes) {
			expect((postType || '').length).toBeLessThanOrEqual(20);
		}
		const warningCodes = ir.resources.flatMap((resource) =>
			resource.warnings.map((warning) => warning.code)
		);
		expect(warningCodes).toContain('storage.wpPost.postType.truncated');
		expect(warningCodes).toContain('storage.wpPost.postType.collision');
	});

	it('sorts resources with identical names by schema key', async () => {
		const config = createBaseConfig();
		config.schemas = {
			first: {
				path: './schemas/todo.schema.json',
				generated: { types: 'types/first.d.ts' },
			},
			second: {
				path: './schemas/todo.schema.json',
				generated: { types: 'types/second.d.ts' },
			},
		} as WPKernelConfigV1['schemas'];
		config.resources = {
			one: {
				name: 'duplicate',
				schema: 'second',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
				},
			},
			two: {
				name: 'duplicate',
				schema: 'first',
				routes: {
					list: {
						path: '/test-namespace/v1/other',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await createIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		expect(ir.resources.map((resource) => resource.schemaKey)).toEqual([
			'first',
			'second',
		]);
	});
});
