import path from 'node:path';
import fs from 'node:fs/promises';
import { buildIr } from '../buildIr';
import { createBaseConfig, withTempWorkspace } from '../shared/test-helpers';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

describe('layout fragment', () => {
	it('exposes default layout paths from manifest', async () => {
		await withTempWorkspace(
			async (root) => {
				const manifest = {
					directories: {
						'.wpk': {
							generate: { php: 'php.generated' },
							apply: { base: 'plan.base' },
						},
						src: { blocks: 'blocks.applied' },
						'plugin.php': 'plugin.loader',
					},
				};

				await fs.writeFile(
					path.join(root, 'layout.manifest.json'),
					JSON.stringify(manifest, null, 2),
					'utf8'
				);
			},
			async (root) => {
				const config = createBaseConfig();
				const ir = await buildIr({
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
				const manifest = {
					directories: {
						'.wpk': { generate: { php: 'php.generated' } },
						src: { blocks: 'blocks.applied' },
					},
				};

				await fs.writeFile(
					path.join(root, 'layout.manifest.json'),
					JSON.stringify(manifest, null, 2),
					'utf8'
				);
			},
			async (root) => {
				const config = createBaseConfig();
				config.directories = {
					blocks: 'custom/blocks',
				} as Record<string, string>;

				const ir = await buildIr({
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

	it('falls back to bundled manifest when manifest is missing', async () => {
		await withTempWorkspace(
			async () => {},
			async (root) => {
				const config = createBaseConfig();
				const ir = await buildIr({
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
					buildIr({
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
				const manifest = {
					directories: {
						'.wpk': { generate: { php: 'php.generated' } },
						src: { blocks: 'blocks.applied' },
					},
				};

				await fs.writeFile(
					path.join(root, 'layout.manifest.json'),
					JSON.stringify(manifest, null, 2),
					'utf8'
				);
			},
			async (root) => {
				const config = createBaseConfig();
				const ir = await buildIr({
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
});
