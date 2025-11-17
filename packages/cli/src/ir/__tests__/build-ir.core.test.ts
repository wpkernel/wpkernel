import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import type { WPKernelConfigV1 } from '../../config/types';
import { buildIr } from '../buildIr';
import { buildDataViewsConfig } from '@wpkernel/test-utils/builders/tests/ts.test-support';
import {
	FIXTURE_CONFIG_PATH,
	FIXTURE_ROOT,
	canonicalHash,
	createBaseConfig,
} from '../shared/test-helpers';

describe('buildIr - core behaviours', () => {
	it('constructs a deterministic IR for manual schemas', async () => {
		const schemaPath = path.join(FIXTURE_ROOT, 'schemas/todo.schema.json');
		const config = createBaseConfig();
		config.schemas = {
			todo: {
				path: './schemas/todo.schema.json',
				generated: { types: 'types/todo.d.ts' },
			},
		} as WPKernelConfigV1['schemas'];

		config.resources = {
			todo: {
				name: 'todo',
				schema: 'todo',
				routes: {
					list: {
						path: '/test-namespace/v1/todos',
						method: 'GET',
						capability: 'todos.list',
					},
					get: {
						path: '/test-namespace/v1/todos/:id',
						method: 'GET',
					},
					create: {
						path: '/test-namespace/v1/todos',
						method: 'POST',
						capability: 'todos.create',
					},
				},
				identity: { type: 'number', param: 'id' },
				storage: { mode: 'wp-post', postType: 'todo' },
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		expect(ir.meta).toMatchObject({
			version: 1,
			namespace: 'test-namespace',
			sourcePath: path.relative(process.cwd(), FIXTURE_CONFIG_PATH),
			origin: 'wpk.config.ts',
			sanitizedNamespace: 'test-namespace',
		});

		expect(ir.schemas).toHaveLength(1);
		const [schema] = ir.schemas;
		expect(schema.key).toBe('todo');
		expect(schema.provenance).toBe('manual');
		expect(schema.sourcePath).toBe(
			path.relative(process.cwd(), schemaPath)
		);
		expect(schema.hash.value).toBe(canonicalHash(schema.schema));

		expect(ir.resources).toHaveLength(1);
		const [resource] = ir.resources;
		expect(resource.schemaKey).toBe('todo');
		expect(resource.routes.map((route) => route.transport)).toEqual([
			'local',
			'local',
			'local',
		]);
		expect(resource.cacheKeys.list).toEqual({
			source: 'default',
			segments: ['todo', 'list', '{}'],
		});
		expect(resource.cacheKeys.get).toEqual({
			source: 'default',
			segments: ['todo', 'get', '__wpk_id__'],
		});
		expect(resource.identity).toEqual({ type: 'number', param: 'id' });
		expect(resource.storage).toEqual({ mode: 'wp-post', postType: 'todo' });
		expect(resource.warnings).toEqual([]);

		expect(ir.capabilities).toEqual([
			{
				key: 'todos.create',
				source: 'resource',
				references: [
					{
						resource: 'todo',
						route: '/test-namespace/v1/todos',
						transport: 'local',
					},
				],
			},
			{
				key: 'todos.list',
				source: 'resource',
				references: [
					{
						resource: 'todo',
						route: '/test-namespace/v1/todos',
						transport: 'local',
					},
				],
			},
		]);

		const secondRun = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const serialisedSecond = JSON.parse(JSON.stringify(secondRun));
		const serialisedFirst = JSON.parse(JSON.stringify(ir));
		expect(serialisedSecond).toEqual(serialisedFirst);
		expect(secondRun.layout.all).toEqual(ir.layout.all);
	});

	it('threads enriched DataViews metadata into the IR', async () => {
		const config = createBaseConfig();
		config.resources = {
			job: {
				name: 'job',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/jobs',
						method: 'GET',
					},
				},
				ui: {
					admin: {
						view: 'dataviews',
						dataviews: buildDataViewsConfig(),
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		const [resource] = ir.resources;
		expect(resource.ui?.admin?.dataviews?.preferencesKey).toBe(
			'jobs/admin'
		);
		expect(resource.ui?.admin?.dataviews?.perPageSizes).toEqual([
			10, 25, 50,
		]);
		expect(resource.ui?.admin?.dataviews?.defaultLayouts).toEqual({
			table: { columns: ['title', 'status'] },
		});
		expect(resource.ui?.admin?.dataviews?.views).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'all', isDefault: true }),
				expect.objectContaining({ id: 'draft' }),
			])
		);
		expect(resource.ui?.admin?.dataviews?.screen?.menu).toEqual(
			expect.objectContaining({ slug: 'jobs-admin', title: 'Jobs' })
		);
	});

	it('synthesises schemas when resources use auto mode', async () => {
		const config = createBaseConfig();
		config.resources = {
			job: {
				name: 'job',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/jobs',
						method: 'GET',
					},
				},
				storage: {
					mode: 'wp-post',
					meta: {
						department: { type: 'string', single: true },
						tags: { type: 'string', single: false },
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		expect(ir.schemas).toHaveLength(1);
		const [schema] = ir.schemas;
		expect(schema.key).toBe('auto:job');
		expect(schema.provenance).toBe('auto');
		expect(schema.generatedFrom).toEqual({
			type: 'storage',
			resource: 'job',
		});
		expect(schema.schema).toMatchObject({
			properties: {
				department: { type: 'string' },
				tags: { type: 'array', items: { type: 'string' } },
			},
		});

		const [resource] = ir.resources;
		expect(resource.schemaProvenance).toBe('auto');
		expect(resource.identity).toBeUndefined();
		expect(resource.storage?.mode).toBe('wp-post');
		expect(resource.storage?.postType).toBe('test_namespace_job');
	});

	it('throws when namespace cannot be sanitised', async () => {
		const config = createBaseConfig();
		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'wpk.config.ts',
				namespace: '123plugin',
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('loads schemas from absolute paths', async () => {
		const absoluteSchema = path.join(
			FIXTURE_ROOT,
			'schemas/todo.schema.json'
		);
		const config = createBaseConfig();
		config.schemas = {
			todo: {
				path: absoluteSchema,
				generated: { types: 'types/todo.d.ts' },
			},
		} as WPKernelConfigV1['schemas'];
		config.resources = {
			todo: {
				name: 'todo',
				schema: 'todo',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		const ir = await buildIr({
			config,
			sourcePath: FIXTURE_CONFIG_PATH,
			origin: 'wpk.config.ts',
			namespace: config.namespace,
		});

		expect(ir.schemas[0]?.sourcePath).toBe(
			path.relative(process.cwd(), absoluteSchema)
		);
	});
});
