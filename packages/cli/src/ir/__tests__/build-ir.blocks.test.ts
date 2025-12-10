import path from 'node:path';
import fs from 'node:fs';
import type { WPKernelConfigV1 } from '../../config/types';
import { createIr } from '../createIr';
import { createBaseConfig, withTempWorkspace } from '../shared/test-helpers';
import { createPipeline } from '../../runtime/createPipeline';
import { type IRv1 } from '..';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';

async function buildIr(options: {
	readonly config: WPKernelConfigV1;
	readonly sourcePath: string;
	readonly origin: string;
	readonly namespace: string;
	readonly pipeline?: ReturnType<typeof createPipeline>;
}): Promise<IRv1> {
	const { pipeline, ...rest } = options;

	return createIr({
		...rest,
		// keep tests free to provide their own stricter/fragment pipeline
		pipeline: pipeline ?? createPipeline(),
	});
}

describe('buildIr - block discovery', () => {
	it('discovers JS-only and SSR blocks while respecting ignore rules', async () => {
		await withTempWorkspace(
			async (root) => {
				const layout = loadTestLayoutSync();
				const blocksRoot = layout.resolve('blocks.applied');
				const jsBlock = path.join(root, blocksRoot, 'js-block');
				const ssrBlock = path.join(root, blocksRoot, 'ssr-block');
				const ignoredBlock = path.join(root, '.generated', 'ignored');

				fs.mkdirSync(jsBlock, { recursive: true });
				fs.writeFileSync(
					path.join(jsBlock, 'block.json'),
					JSON.stringify({
						apiVersion: 3,
						name: 'plugin/js-block',
						title: 'JS Block',
					}),
					'utf8'
				);

				fs.mkdirSync(ssrBlock, { recursive: true });
				fs.writeFileSync(
					path.join(ssrBlock, 'block.json'),
					JSON.stringify({
						apiVersion: 3,
						name: 'plugin/ssr-block',
						title: 'SSR Block',
						render: 'file:./render.php',
					}),
					'utf8'
				);
				fs.writeFileSync(
					path.join(ssrBlock, 'render.php'),
					'<?php // render'
				);

				fs.mkdirSync(ignoredBlock, { recursive: true });
				fs.writeFileSync(
					path.join(ignoredBlock, 'block.json'),
					JSON.stringify({
						apiVersion: 3,
						name: 'plugin/ignored',
						title: 'Ignored',
					})
				);
			},
			async (root) => {
				const originalCwd = process.cwd();
				const layout = loadTestLayoutSync();
				const blocksRoot = layout.resolve('blocks.applied');
				process.chdir(root);
				try {
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
							},
						},
					} as unknown as WPKernelConfigV1['resources'];

					const ir = await buildIr({
						config,
						sourcePath: path.join(root, 'wpk.config.ts'),
						origin: 'wpk.config.ts',
						namespace: config.namespace,
						// Provide builder deps so the strict graph is satisfied in this fragment-only test
						pipeline: createPipeline({
							builderProvidedKeys: [
								'builder.generate.php.controller.resources',
								'builder.generate.php.capability',
								'builder.generate.php.registration.persistence',
								'builder.generate.php.plugin-loader',
								'builder.generate.php.index',
								'ir.resources.core',
								'ir.capability-map.core',
								'ir.blocks.core',
								'ir.layout.core',
								'ir.meta.core',
								'ir.schemas.core',
								'ir.ordering.core',
								'ir.bundler.core',
							],
						}),
					});

					expect(ir.blocks).toEqual([
						expect.objectContaining({
							key: 'plugin/js-block',
							directory: path.join(blocksRoot, 'js-block'),
							hasRender: false,
							manifestSource: path.join(
								blocksRoot,
								'js-block',
								'block.json'
							),
							id: expect.stringMatching(/^blk:/),
							hash: expect.objectContaining({
								algo: 'sha256',
								inputs: [
									'key',
									'directory',
									'hasRender',
									'manifestSource',
								],
							}),
						}),
						expect.objectContaining({
							key: 'plugin/ssr-block',
							directory: path.join(blocksRoot, 'ssr-block'),
							hasRender: true,
							manifestSource: path.join(
								blocksRoot,
								'ssr-block',
								'block.json'
							),
							id: expect.stringMatching(/^blk:/),
							hash: expect.objectContaining({
								algo: 'sha256',
								inputs: [
									'key',
									'directory',
									'hasRender',
									'manifestSource',
								],
							}),
						}),
					]);
				} finally {
					process.chdir(originalCwd);
				}
			}
		);
	});

	it('throws when block manifest contains invalid JSON', async () => {
		await withTempWorkspace(
			async (root) => {
				const layout = loadTestLayoutSync();
				const blockDir = path.join(
					root,
					layout.resolve('blocks.applied'),
					'broken'
				);
				fs.mkdirSync(blockDir, { recursive: true });
				fs.writeFileSync(
					path.join(blockDir, 'block.json'),
					'{ invalid'
				);
			},
			async (root) => {
				const originalCwd = process.cwd();
				process.chdir(root);
				try {
					const config = createBaseConfig();
					config.resources =
						{} as unknown as WPKernelConfigV1['resources'];

					await expect(
						buildIr({
							config,
							sourcePath: path.join(root, 'wpk.config.ts'),
							origin: 'wpk.config.ts',
							namespace: config.namespace,
						})
					).rejects.toThrow();
				} finally {
					process.chdir(originalCwd);
				}
			}
		);
	});

	it('throws when duplicate block names are discovered', async () => {
		await withTempWorkspace(
			async (root) => {
				const layout = loadTestLayoutSync();
				const blockA = path.join(
					root,
					layout.resolve('blocks.applied'),
					'a'
				);
				const blockB = path.join(
					root,
					layout.resolve('blocks.applied'),
					'b'
				);
				fs.mkdirSync(blockA, { recursive: true });
				fs.mkdirSync(blockB, { recursive: true });
				const manifest = JSON.stringify({
					apiVersion: 3,
					name: 'plugin/duplicate',
					title: 'Duplicate',
				});
				fs.writeFileSync(path.join(blockA, 'block.json'), manifest);
				fs.writeFileSync(path.join(blockB, 'block.json'), manifest);
			},
			async (root) => {
				const originalCwd = process.cwd();
				process.chdir(root);
				try {
					const config = createBaseConfig();
					config.resources =
						{} as unknown as WPKernelConfigV1['resources'];

					await expect(
						buildIr({
							config,
							sourcePath: path.join(root, 'wpk.config.ts'),
							origin: 'wpk.config.ts',
							namespace: config.namespace,
						})
					).rejects.toThrow();
				} finally {
					process.chdir(originalCwd);
				}
			}
		);
	});

	it('throws when block manifest omits the name field', async () => {
		await withTempWorkspace(
			async (root) => {
				const layout = loadTestLayoutSync();
				const blockDir = path.join(
					root,
					layout.resolve('blocks.applied'),
					'noname'
				);
				fs.mkdirSync(blockDir, { recursive: true });
				fs.writeFileSync(
					path.join(blockDir, 'block.json'),
					JSON.stringify({ apiVersion: 3, title: 'No Name' })
				);
			},
			async (root) => {
				const originalCwd = process.cwd();
				process.chdir(root);
				try {
					const config = createBaseConfig();
					config.resources =
						{} as unknown as WPKernelConfigV1['resources'];

					await expect(
						buildIr({
							config,
							sourcePath: path.join(root, 'wpk.config.ts'),
							origin: 'wpk.config.ts',
							namespace: config.namespace,
						})
					).rejects.toThrow();
				} finally {
					process.chdir(originalCwd);
				}
			}
		);
	});

	it('throws when block manifest is not an object', async () => {
		await withTempWorkspace(
			async (root) => {
				const layout = loadTestLayoutSync();
				const blockDir = path.join(
					root,
					layout.resolve('blocks.applied'),
					'array'
				);
				fs.mkdirSync(blockDir, { recursive: true });
				fs.writeFileSync(
					path.join(blockDir, 'block.json'),
					JSON.stringify(['invalid'])
				);
			},
			async (root) => {
				const originalCwd = process.cwd();
				process.chdir(root);
				try {
					const config = createBaseConfig();
					config.resources =
						{} as unknown as WPKernelConfigV1['resources'];

					await expect(
						buildIr({
							config,
							sourcePath: path.join(root, 'wpk.config.ts'),
							origin: 'wpk.config.ts',
							namespace: config.namespace,
						})
					).rejects.toThrow();
				} finally {
					process.chdir(originalCwd);
				}
			}
		);
	});
});
