import path from 'node:path';
import fs from 'node:fs/promises';
import { createIr } from '../createIr';
import { createBaseConfig, withTempWorkspace } from '../shared/test-helpers';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';
import layoutManifest from '../../../../../layout.manifest.json' assert { type: 'json' };

describe('layout fragment', () => {
	it('exposes default layout paths from manifest', async () => {
		await withTempWorkspace(
			async (root) => {
				await fs.writeFile(
					path.join(root, 'layout.manifest.json'),
					JSON.stringify(layoutManifest, null, 2),
					'utf8'
				);
			},
			async (root) => {
				const config = createBaseConfig();
				const ir = await createIr({
					config,
					sourcePath: path.join(root, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				expect(ir.layout).toBeDefined();
				expect(ir.layout.resolve('plugin.loader')).toBe('plugin.php');
				expect(ir.layout.resolve('php.generated')).toBe(
					loadTestLayoutSync().resolve('php.generated')
				);
			}
		);
	});

	it('applies user overrides for applied targets', async () => {
		await withTempWorkspace(
			async (root) => {
				await fs.writeFile(
					path.join(root, 'layout.manifest.json'),
					JSON.stringify(layoutManifest, null, 2),
					'utf8'
				);
			},
			async (root) => {
				const config = createBaseConfig();
				config.directories = {
					blocks: 'custom/blocks',
				} as Record<string, string>;

				const ir = await createIr({
					config,
					sourcePath: path.join(root, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				expect(ir.layout.resolve('blocks.applied')).toBe(
					'custom/blocks'
				);
				expect(ir.layout.resolve('blocks')).toBe('custom/blocks');
			}
		);
	});

	it('rejects overrides for non-applied layout ids', async () => {
		await withTempWorkspace(
			async () => {},
			async (root) => {
				const config = createBaseConfig();
				config.directories = {
					'plan.manifest': 'custom/plan.json',
				} as Record<string, string>;

				await expect(
					createIr({
						config,
						sourcePath: path.join(root, 'wpk.config.ts'),
						origin: 'wpk.config.ts',
						namespace: config.namespace,
					})
				).rejects.toMatchObject({
					message: expect.stringContaining(
						'Unsupported layout override'
					),
				});
			}
		);
	});

	it('falls back to bundled manifest when manifest is missing', async () => {
		await withTempWorkspace(
			async () => {},
			async (root) => {
				const config = createBaseConfig();
				const ir = await createIr({
					config,
					sourcePath: path.join(root, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				expect(ir.layout.resolve('plan.manifest')).toBe(
					loadTestLayoutSync().resolve('plan.manifest')
				);
			},
			{ copyLayoutManifest: false }
		);
	});

	it('throws when manifest shape is invalid', async () => {
		await withTempWorkspace(
			async (root) => {
				await fs.writeFile(
					path.join(root, 'layout.manifest.json'),
					JSON.stringify({ foo: 'bar' }),
					'utf8'
				);
			},
			async (root) => {
				const config = createBaseConfig();
				await expect(
					createIr({
						config,
						sourcePath: path.join(root, 'wpk.config.ts'),
						origin: 'wpk.config.ts',
						namespace: config.namespace,
					})
				).rejects.toThrow(/invalid layout manifest/i);
			}
		);
	});

	it('errors when resolving unknown ids', async () => {
		await withTempWorkspace(
			async (root) => {
				await fs.writeFile(
					path.join(root, 'layout.manifest.json'),
					JSON.stringify(layoutManifest, null, 2),
					'utf8'
				);
			},
			async (root) => {
				const config = createBaseConfig();
				const ir = await createIr({
					config,
					sourcePath: path.join(root, 'wpk.config.ts'),
					origin: 'wpk.config.ts',
					namespace: config.namespace,
				});

				expect(() => ir.layout.resolve('not-here')).toThrow(
					/Unknown layout id "not-here"/
				);
			}
		);
	});

	it('returns null in non-strict mode when manifest cannot be parsed', async () => {
		await withTempWorkspace(
			async (root) => {
				await fs.writeFile(
					path.join(root, 'layout.manifest.json'),
					'{',
					'utf8'
				);
			},
			async (root) => {
				const workspace = {
					root,
					readText: (file?: string) =>
						fs.readFile(path.join(root, file ?? ''), 'utf8'),
					resolve: (...parts: string[]) => path.join(root, ...parts),
				} as any;

				const { loadLayoutFromWorkspace } = await import(
					'../fragments/ir.layout.core'
				);
				const layout = await loadLayoutFromWorkspace({
					workspace,
					strict: false,
				});

				expect(layout).toBeNull();
			}
		);
	});
});
