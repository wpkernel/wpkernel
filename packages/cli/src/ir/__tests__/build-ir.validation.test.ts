import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import type { WPKernelConfigV1 } from '../../config/types';
import { createIr } from '../createIr';
import { createPipeline } from '../../runtime/createPipeline';
import {
	FIXTURE_CONFIG_PATH,
	FIXTURE_ROOT,
	createBaseConfig,
	withTempSchema,
} from '../shared/test-helpers';
import { type IRv1 } from '..';

async function buildIr(options: {
	readonly config: WPKernelConfigV1;
	readonly sourcePath: string;
	readonly origin: string;
	readonly namespace: string;
}): Promise<IRv1> {
	return createIr({
		...options,
		pipeline: createPipeline(),
	});
}

describe('buildIr - validation', () => {
	it('throws when duplicate routes are detected', async () => {
		const config = createBaseConfig();
		config.resources = {
			first: {
				name: 'first',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
				},
			},
			second: {
				name: 'second',
				schema: 'auto',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'wpk.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('allows duplicate routes when both are remote', async () => {
		const config = createBaseConfig();
		config.resources = {
			first: {
				name: 'first',
				schema: 'auto',
				routes: {
					list: {
						path: 'https://api.example.com/items',
						method: 'GET',
					},
				},
			},
			second: {
				name: 'second',
				schema: 'auto',
				routes: {
					list: {
						path: 'https://api.example.com/items',
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

		expect(ir.resources).toHaveLength(2);
		expect(ir.resources[0]?.routes[0]).toMatchObject({
			method: 'GET',
			path: 'https://api.example.com/items',
			transport: 'remote',
		});
		expect(ir.resources[1]?.routes[0]).toMatchObject({
			method: 'GET',
			path: 'https://api.example.com/items',
			transport: 'remote',
		});
	});

	it('rejects reserved route prefixes', async () => {
		const config = createBaseConfig();
		config.resources = {
			sample: {
				name: 'sample',
				schema: 'auto',
				routes: {
					list: { path: 'wp/v2/conflict', method: 'GET' },
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'wpk.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('rejects path traversal segments', async () => {
		const config = createBaseConfig();
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: '../escape', method: 'GET' },
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'wpk.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('throws when schema path cannot be resolved', async () => {
		const config = createBaseConfig();
		config.schemas = {
			missing: {
				path: './unknown.schema.json',
				generated: { types: 'types/missing.d.ts' },
			},
		} as WPKernelConfigV1['schemas'];
		config.resources = {
			missing: {
				name: 'missing',
				schema: 'missing',
				routes: {
					list: {
						path: '/test-namespace/v1/items',
						method: 'GET',
					},
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'wpk.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('throws when schema JSON is invalid', async () => {
		const config = createBaseConfig();
		await withTempSchema('{ invalid', async (schemaPath) => {
			config.schemas = {
				temp: {
					path: schemaPath,
					generated: { types: 'types/temp.d.ts' },
				},
			} as WPKernelConfigV1['schemas'];
			config.resources = {
				temp: {
					name: 'temp',
					schema: 'temp',
					routes: {
						list: {
							path: '/test-namespace/v1/items',
							method: 'GET',
						},
					},
				},
			} as unknown as WPKernelConfigV1['resources'];

			await expect(
				buildIr({
					config,
					sourcePath: FIXTURE_CONFIG_PATH,
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				})
			).rejects.toBeInstanceOf(WPKernelError);
		});
	});

	it('throws when resource references unknown schema key', async () => {
		const config = createBaseConfig();
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

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'wpk.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('resolves schema path from workspace root', async () => {
		const schemaPath = path.relative(
			process.cwd(),
			path.join(FIXTURE_ROOT, 'schemas/todo.schema.json')
		);
		const config = createBaseConfig();
		config.schemas = {
			todo: {
				path: schemaPath,
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

		expect(ir.schemas[0]?.sourcePath).toBe('schemas/todo.schema.json');
	});

	it('rejects empty route definitions', async () => {
		const config = createBaseConfig();
		config.resources = {
			demo: {
				name: 'demo',
				schema: 'auto',
				routes: {
					list: { path: '   ', method: 'GET' },
				},
			},
		} as unknown as WPKernelConfigV1['resources'];

		await expect(
			buildIr({
				config,
				sourcePath: FIXTURE_CONFIG_PATH,
				origin: 'wpk.config.ts',
				namespace: config.namespace,
			})
		).rejects.toBeInstanceOf(WPKernelError);
	});
});
