import path from 'node:path';
import fs from 'node:fs/promises';
import type { WPKernelConfigV1 } from '../../config/types';
import { buildIr } from '../buildIr';
import { createBaseConfig, withTempWorkspace } from '../shared/test-helpers';

describe('buildIr - block discovery', () => {
	it('discovers JS-only and SSR blocks while respecting ignore rules', async () => {
		await withTempWorkspace(
			async (root) => {
				const jsBlock = path.join(root, 'src', 'blocks', 'js-block');
				const ssrBlock = path.join(root, 'src', 'blocks', 'ssr-block');
				const ignoredBlock = path.join(root, '.generated', 'ignored');

				await fs.mkdir(jsBlock, { recursive: true });
				await fs.writeFile(
					path.join(jsBlock, 'block.json'),
					JSON.stringify({
						apiVersion: 3,
						name: 'plugin/js-block',
						title: 'JS Block',
					}),
					'utf8'
				);

				await fs.mkdir(ssrBlock, { recursive: true });
				await fs.writeFile(
					path.join(ssrBlock, 'block.json'),
					JSON.stringify({
						apiVersion: 3,
						name: 'plugin/ssr-block',
						title: 'SSR Block',
						render: 'file:./render.php',
					}),
					'utf8'
				);
				await fs.writeFile(
					path.join(ssrBlock, 'render.php'),
					'<?php // render'
				);

				await fs.mkdir(ignoredBlock, { recursive: true });
				await fs.writeFile(
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
					});

					expect(ir.blocks).toEqual([
						expect.objectContaining({
							key: 'plugin/js-block',
							directory: path.join('src', 'blocks', 'js-block'),
							hasRender: false,
							manifestSource: path.join(
								'src',
								'blocks',
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
							directory: path.join('src', 'blocks', 'ssr-block'),
							hasRender: true,
							manifestSource: path.join(
								'src',
								'blocks',
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
				const blockDir = path.join(root, 'src', 'blocks', 'broken');
				await fs.mkdir(blockDir, { recursive: true });
				await fs.writeFile(
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
				const blockA = path.join(root, 'src', 'blocks', 'a');
				const blockB = path.join(root, 'src', 'blocks', 'b');
				await fs.mkdir(blockA, { recursive: true });
				await fs.mkdir(blockB, { recursive: true });
				const manifest = JSON.stringify({
					apiVersion: 3,
					name: 'plugin/duplicate',
					title: 'Duplicate',
				});
				await fs.writeFile(path.join(blockA, 'block.json'), manifest);
				await fs.writeFile(path.join(blockB, 'block.json'), manifest);
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
				const blockDir = path.join(root, 'src', 'blocks', 'noname');
				await fs.mkdir(blockDir, { recursive: true });
				await fs.writeFile(
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
				const blockDir = path.join(root, 'src', 'blocks', 'array');
				await fs.mkdir(blockDir, { recursive: true });
				await fs.writeFile(
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
