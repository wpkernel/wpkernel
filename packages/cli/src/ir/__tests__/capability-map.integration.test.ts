import fs from 'node:fs/promises';
import path from 'node:path';
import type { ResourceCapabilityMap } from '@wpkernel/core/resource';
import type { WPKernelConfigV1 } from '../../config/types';
import { createIrWithBuilders } from '../createIr';
import type { IRv1 } from '../publicTypes';
import { setCachedTsImport } from '../../config/load-wpk-config';
import { createBaseConfig, withTempWorkspace } from '../shared/test-helpers';

type CapabilityCase = {
	readonly name: string;
	readonly setup?: (config: WPKernelConfigV1) => void;
	readonly expect?: (
		ir: Awaited<ReturnType<typeof buildIr>>
	) => void | Promise<void>;
	readonly expectError?: RegExp | string;
};

async function buildIr(options: {
	readonly config: WPKernelConfigV1;
	readonly sourcePath: string;
	readonly origin: string;
	readonly namespace: string;
}): Promise<IRv1> {
	return createIrWithBuilders(options);
}

function addCapabilities(
	config: WPKernelConfigV1,
	resourceName: string,
	capabilities: ResourceCapabilityMap
): void {
	const resource = config.resources[resourceName];
	if (resource && typeof resource === 'object') {
		(resource as Record<string, unknown>).capabilities = capabilities;
	}
}

function createCapabilityConfig(): WPKernelConfigV1 {
	const base = createBaseConfig();
	return {
		...base,
		schemas: { demo: { $id: 'demo' } as unknown as any },
		resources: {
			demo: {
				name: 'demo',
				schema: 'demo',
				identity: { type: 'string', param: 'slug' },
				routes: {
					create: { method: 'POST', path: '/test/v1/demo' },
					get: { method: 'GET', path: '/test/v1/demo/:slug' },
				},
			},
		},
	};
}

function attachSchema(config: WPKernelConfigV1, schemaPath: string): void {
	config.schemas = {
		demo: { $id: 'demo', path: schemaPath } as unknown as any,
	};
	for (const resource of Object.values(config.resources)) {
		if (resource && typeof resource === 'object') {
			(resource as Record<string, unknown>).schema = 'demo';
		}
	}
}

const cases: CapabilityCase[] = [
	{
		name: 'falls back to defaults when capability map is missing',
		expect: (ir) => {
			expect(ir.capabilityMap.definitions).toHaveLength(0);
			expect(ir.capabilityMap.missing).toEqual([]);
			expect(ir.capabilityMap.unused).toEqual([]);
			expect(ir.capabilityMap.fallback).toEqual({
				capability: 'manage_options',
				appliesTo: 'resource',
			});
			expect(ir.capabilityMap.warnings).toEqual([]);
		},
	},
	{
		name: 'warns when capability map omits referenced entries',
		setup: (config) => {
			addCapabilities(config, 'demo', {
				'demo.create': 'manage_options',
			});
		},
		expect: (ir) => {
			expect(ir.capabilityMap.missing).toEqual([]);
		},
	},
	{
		name: 'loads capability definitions from inline config',
		setup: (config) => {
			addCapabilities(config, 'demo', {
				'demo.create': 'manage_options',
				'demo.get': { capability: 'edit_post', appliesTo: 'object' },
				'unused.capability': 'read',
			});
		},
		expect: (ir) => {
			const map = new Map(
				ir.capabilityMap.definitions.map((entry) => [entry.key, entry])
			);
			expect(map.get('demo.create')).toMatchObject({
				key: 'demo.create',
				capability: 'manage_options',
				appliesTo: 'resource',
				source: 'map',
			});
			expect(map.get('demo.get')).toMatchObject({
				key: 'demo.get',
				capability: 'edit_post',
				appliesTo: 'object',
				binding: undefined,
				source: 'map',
			});
			expect(ir.capabilityMap.missing).toHaveLength(0);
			expect(ir.capabilityMap.unused.sort()).toEqual([
				'demo.create',
				'demo.get',
				'unused.capability',
			]);
			expect(
				ir.capabilityMap.warnings.map((warning) => warning.code)
			).toContain('capability-map.entries.unused');
			expect(ir.capabilityMap.sourcePath).toBe('inline');
		},
	},
	{
		name: 'collects capabilities from multiple resources',
		setup: (config) => {
			addCapabilities(config, 'demo', {
				'demo.create': 'edit_posts',
				'demo.get': 'read',
			});
			(config.resources as Record<string, unknown>).secondary = {
				name: 'secondary',
				schema: 'auto',
				identity: { type: 'string', param: 'slug' },
				routes: {
					create: {
						path: '/test/v1/secondary',
						method: 'POST',
						capability: 'secondary.create',
					},
					get: {
						path: '/test/v1/secondary/:slug',
						method: 'GET',
						capability: 'secondary.get',
					},
				},
			};
			addCapabilities(config, 'secondary', {
				'secondary.create': 'manage_options',
				'secondary.get': 'read',
			});
		},
		expect: (ir) => {
			expect(ir.capabilityMap.definitions).toHaveLength(4);
			expect(ir.capabilityMap.missing).toHaveLength(0);
			expect(new Set(ir.capabilityMap.unused)).toEqual(
				new Set(['demo.create', 'demo.get'])
			);
			expect(ir.capabilityMap.sourcePath).toBe('inline');
		},
	},
	{
		name: 'warns when bindings cannot be inferred for object-scoped capabilities',
		setup: (config) => {
			addCapabilities(config, 'demo', {
				'demo.create': 'manage_options',
				'demo.get': { capability: 'edit_post', appliesTo: 'object' },
			});
			(config.resources as Record<string, unknown>).secondary = {
				name: 'secondary',
				schema: 'auto',
				identity: { type: 'number', param: 'postId' },
				routes: {
					get: {
						path: '/test/v1/secondary/:postId',
						method: 'GET',
						capability: 'demo.get',
					},
				},
			};
		},
		expect: (ir) => {
			const demoGet = ir.capabilityMap.definitions.find(
				(entry) => entry.key === 'demo.get'
			);
			expect(demoGet?.binding).toBe('postId');
		},
	},
	{
		name: 'handles empty capabilities object',
		setup: (config) => {
			addCapabilities(config, 'demo', {});
		},
		expect: (ir) => {
			expect(ir.capabilityMap.definitions).toHaveLength(0);
			expect(ir.capabilityMap.missing).toEqual([]);
			expect(ir.capabilityMap.sourcePath).toBeUndefined();
		},
	},
	{
		name: 'rejects non-string and non-descriptor capability values',
		setup: (config) => {
			addCapabilities(config, 'demo', {
				'demo.create': 42 as unknown as string,
			});
		},
		expectError: /must resolve to a capability string or descriptor/,
	},
	{
		name: 'returns null binding when multiple identity params are ambiguous',
		setup: (config) => {
			(config.resources as Record<string, unknown>).books = {
				name: 'books',
				schema: 'auto',
				identity: { type: 'number', param: 'bookId' },
				routes: {
					get: {
						path: '/test/v1/books/:bookId',
						method: 'GET',
						capability: 'shared.get',
					},
				},
			};

			(config.resources as Record<string, unknown>).demo = {
				name: 'demo',
				schema: 'auto',
				identity: { type: 'number', param: 'postId' },
				routes: {
					create: {
						path: '/test/v1/demo',
						method: 'POST',
						capability: 'demo.create',
					},
					get: {
						path: '/test/v1/demo/:postId',
						method: 'GET',
						capability: 'shared.get',
					},
				},
			};

			addCapabilities(config, 'demo', {
				'demo.create': 'edit_posts',
				'shared.get': 'edit_posts',
			});
		},
		expect: (ir) => {
			const sharedGet = ir.capabilityMap.definitions.find(
				(entry) => entry.key === 'shared.get'
			);
			expect(sharedGet?.binding).toBeUndefined();
		},
	},
	{
		name: 'resolves binding when only one identity param matches',
		setup: (config) => {
			(config.resources as Record<string, unknown>).demo = {
				name: 'demo',
				schema: 'auto',
				identity: { type: 'number', param: 'postId' },
				routes: {
					get: {
						path: '/test/v1/demo/:postId',
						method: 'GET',
						capability: 'demo.get',
					},
				},
			};
			addCapabilities(config, 'demo', { 'demo.get': 'read' });
		},
		expect: (ir) => {
			const demoGet = ir.capabilityMap.definitions.find(
				(entry) => entry.key === 'demo.get'
			);
			expect(demoGet?.binding).toBeUndefined();
		},
	},
];

describe('capability map integration', () => {
	afterEach(() => {
		setCachedTsImport(null);
	});

	for (const testCase of cases) {
		it(testCase.name, async () => {
			await withTempWorkspace(
				async (workspace) => {
					await fs.writeFile(
						path.join(workspace, 'wpk.config.ts'),
						'export const wpkConfig = {};',
						'utf8'
					);
				},
				async (workspace) => {
					const config = createCapabilityConfig();
					testCase.setup?.(config);
					const schemaPath = path.join(workspace, 'schema.json');
					await fs.writeFile(
						schemaPath,
						JSON.stringify({ $id: 'demo', type: 'object' })
					);
					attachSchema(config, schemaPath);

					if (testCase.expectError) {
						await expect(
							buildIr({
								config,
								sourcePath: path.join(
									workspace,
									'wpk.config.ts'
								),
								origin: 'wpk.config.ts',
								namespace: config.namespace,
							})
						).rejects.toThrow(testCase.expectError);
						return;
					}

					const ir = await buildIr({
						config,
						sourcePath: path.join(workspace, 'wpk.config.ts'),
						origin: 'wpk.config.ts',
						namespace: config.namespace,
					});

					testCase.expect?.(ir);
				}
			);
		});
	}
});
