/* eslint-disable @wpkernel/no-hardcoded-layout-paths */
// This file exercises manifest normalisation against legacy `.wpk` paths,
// so literals here are intentional fixtures, not new behaviour.
import fs from 'node:fs';
import path from 'node:path';
import type { IRResource } from '../../ir/publicTypes';
import type { SerializableResourceUIConfig } from '../../config/types';
import { makeIr, makeIrMeta } from '@cli-tests/ir.test-support';
import { createDefaultResource } from '@cli-tests/ir/resource-builder.mock';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildEmptyGenerationState,
	buildGenerationManifestFromIr,
	diffGenerationState,
	normaliseGenerationState,
	readGenerationState,
	writeGenerationState,
	type GenerationManifest,
} from '../manifest';
import { loadTestLayout } from '@wpkernel/test-utils/layout.test-support';

describe('generation manifest helpers', () => {
	let phpGeneratedRoot: string;
	let applyStatePath: string;
	let layoutManifestText: string;
	let testLayout: Awaited<ReturnType<typeof loadTestLayout>>;
	const defaultWorkspace = (
		overrides: Parameters<typeof makeWorkspaceMock>[0] = {}
	) =>
		makeWorkspaceMock({
			root: '/',
			readText: jest.fn(async (file?: string) =>
				file === 'layout.manifest.json' ? layoutManifestText : null
			),
			writeJson: jest.fn(async () => undefined),
			...overrides,
		});

	beforeAll(async () => {
		testLayout = await loadTestLayout();
		phpGeneratedRoot = testLayout.resolve('php.generated');
		uiGeneratedRoot = testLayout.resolve('ui.generated');
		applyStatePath = testLayout.resolve('apply.state');
		const manifestPath = path.resolve(
			__dirname,
			'..',
			'..',
			'..',
			'..',
			'..',
			'layout.manifest.json'
		);
		layoutManifestText = fs.readFileSync(manifestPath, 'utf8');
	});

	it('returns an empty state when the manifest file is missing', async () => {
		const workspace = defaultWorkspace();
		const result = await readGenerationState(workspace);

		expect(result).toEqual(buildEmptyGenerationState());
		expect(workspace.readText).toHaveBeenCalledWith(applyStatePath);
	});

	it('normalises manifest contents from disk', async () => {
		const workspace = defaultWorkspace({
			readText: jest.fn(async (file?: string) => {
				if (file === 'layout.manifest.json') {
					return layoutManifestText;
				}

				return JSON.stringify({
					version: 1,
					resources: {
						books: {
							hash: 'abc123',
							artifacts: {
								generated: [
									`${phpGeneratedRoot}\\Rest\\BooksController.php`,
									'',
									42,
								],
								shims: [
									'inc/Rest/BooksController.php',
									'inc\\Rest\\BooksController.php',
									null,
								],
							},
						},
						invalid: {
							artifacts: {
								generated: [
									'.wpk/generate/php/Rest/Invalid.php',
								],
							},
						},
					},
					pluginLoader: {
						file: './plugin.php',
					},
					phpIndex: {
						file: '.wpk/generate/php/index.php',
					},
					ui: {
						handle: 'wp-demo-plugin-ui',
						files: [
							{
								generated: '.wpk/generate/ui/index.tsx',
								applied: 'src/ui/index.tsx',
							},
						],
					},
				});
			}),
		});

		const result = await readGenerationState(workspace);

		expect(result).toEqual({
			version: 1,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: [
							path.posix.join(
								phpGeneratedRoot,
								'Rest/BooksController.php'
							),
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
			pluginLoader: {
				file: 'plugin.php',
			},
			phpIndex: {
				file: path.posix.join(phpGeneratedRoot, 'index.php'),
			},
			ui: {
				handle: 'wp-demo-plugin-ui',
				files: [
					{
						generated: '.wpk/generate/ui/index.tsx',
						applied: 'src/ui/index.tsx',
					},
				],
			},
		});
	});

	it('returns an empty state when parsing invalid structures', () => {
		const malformed = normaliseGenerationState({ version: 2 });
		expect(malformed).toEqual(buildEmptyGenerationState());
	});

	it('throws when the state file contains invalid JSON', async () => {
		const workspace = defaultWorkspace({
			readText: jest.fn(async (file?: string) => {
				if (file === 'layout.manifest.json') {
					return layoutManifestText;
				}
				return '{';
			}),
		});

		await expect(readGenerationState(workspace)).rejects.toMatchObject({
			message: 'Failed to parse generation state JSON.',
		});
	});

	it('writes the manifest back to disk with pretty formatting', async () => {
		const workspace = defaultWorkspace();
		const state = {
			version: 1,
			resources: {},
		} as const;

		await writeGenerationState(workspace, state);

		expect(workspace.writeJson).toHaveBeenCalledWith(
			applyStatePath,
			state,
			{ pretty: true }
		);
	});

	it('builds a manifest from an IR artifact', () => {
		const dataviewsConfig = {
			fields: [{ id: 'title', label: 'Title' }],
			defaultView: { type: 'table', fields: ['title'] },
			preferencesKey: 'books/admin',
		};
		const uiConfig: SerializableResourceUIConfig = {
			admin: {
				dataviews: dataviewsConfig,
			},
		};
		const baseResource = createDefaultResource();
		const resource: IRResource = {
			...baseResource,
			id: 'res:books',
			name: 'books',
			schemaKey: 'books',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {
				...baseResource.cacheKeys,
				list: { segments: [], source: 'default' },
				get: { segments: [], source: 'default' },
			},
			warnings: [],
			hash: {
				...baseResource.hash,
				inputs: ['resource'],
				value: 'abc123',
			},
			ui: uiConfig,
		};

		const manifest = buildGenerationManifestFromIr(
			makeIr({
				namespace: 'demo-plugin',
				meta: makeIrMeta('demo-plugin', {
					sourcePath: 'wpk.config.ts',
					origin: 'typescript',
					features: ['capabilityMap', 'blocks', 'phpAutoload'],
					redactions: ['config.env', 'adapters.secrets'],
					limits: {
						maxConfigKB: 256,
						maxSchemaKB: 1024,
						policy: 'truncate',
					},
				}),
				config: {
					resources: {
						books: {
							name: 'books',
							schema: 'auto',
							routes: {},
							cacheKeys: undefined,
							ui: uiConfig,
						},
					},
					schemas: {},
				},
				schemas: [],
				resources: [resource],
				capabilities: [],
				capabilityMap: {
					definitions: [],
					fallback: {
						capability: 'manage_demo',
						appliesTo: 'resource',
					},
					missing: [],
					unused: [],
					warnings: [],
				},
				blocks: [],
				php: {
					namespace: 'DemoPlugin',
					autoload: 'inc/',
					outputDir: phpGeneratedRoot,
				},
				diagnostics: [],
			})
		);

		expect(manifest.resources.books).toEqual({
			hash: 'abc123',
			artifacts: {
				generated: expect.arrayContaining([
					path.posix.join(
						phpGeneratedRoot,
						'Rest/BooksController.php'
					),
				]),
				shims: ['inc/Rest/BooksController.php'],
			},
		});
		expect(manifest.pluginLoader).toEqual({
			file: path.posix.join(phpGeneratedRoot, 'plugin.php'),
		});
		expect(manifest.phpIndex).toEqual({
			file: path.posix.join(phpGeneratedRoot, 'index.php'),
		});
		expect(manifest.ui).toBeUndefined();
	});

	it('returns an empty manifest when IR is null', () => {
		const manifest = buildGenerationManifestFromIr(null);
		expect(manifest).toEqual(buildEmptyGenerationState());
	});

	it('omits resources that cannot be normalised to PascalCase', () => {
		const manifest = buildGenerationManifestFromIr({
			meta: makeIrMeta('DemoPlugin', {
				sourcePath: 'wpk.config.ts',
				origin: 'typescript',
			}),
			config: {
				version: 1,
				namespace: 'DemoPlugin',
				resources: {},
				schemas: {},
			},
			schemas: [],
			resources: [
				((): IRResource => {
					const ignoredBase = createDefaultResource();
					return {
						...ignoredBase,
						id: 'res:ignored',
						name: '---',
						schemaKey: 'ignored',
						routes: [],
						cacheKeys: {
							...ignoredBase.cacheKeys,
							list: { segments: [], source: 'default' },
							get: { segments: [], source: 'default' },
						},
						warnings: [],
						hash: {
							...ignoredBase.hash,
							inputs: ['resource'],
							value: 'bad',
						},
					};
				})(),
			],
			capabilities: [],
			capabilityMap: {
				definitions: [],
				fallback: { capability: 'manage_demo', appliesTo: 'resource' },
				missing: [],
				unused: [],
				warnings: [],
			},
			blocks: [],
			php: {
				namespace: 'DemoPlugin',
				autoload: 'inc/',
				outputDir: phpGeneratedRoot,
			},
			layout: testLayout,
			diagnostics: [],
		});

		expect(manifest.resources).toEqual({});
	});

	it('diffs manifests to capture removed resources', () => {
		const previous = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: [
							path.posix.join(
								phpGeneratedRoot,
								'Rest/BooksController.php'
							),
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		};
		const next = {
			version: 1 as const,
			resources: {},
		};

		const diff = diffGenerationState(previous, next);
		expect(diff.removed).toEqual([
			{
				resource: 'books',
				generated: [
					path.posix.join(
						phpGeneratedRoot,
						'Rest/BooksController.php'
					),
				],
				shims: ['inc/Rest/BooksController.php'],
			},
		]);
	});

	it('diffs manifests without removals when resources persist', () => {
		const previous = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: [
							path.posix.join(
								phpGeneratedRoot,
								'Rest/BooksController.php'
							),
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;
		const next = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'def456',
					artifacts: {
						generated: [
							path.posix.join(
								phpGeneratedRoot,
								'Rest/BooksController.php'
							),
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const diff = diffGenerationState(previous, next);
		expect(diff.removed).toEqual([]);
	});

	it('diffs manifests when generated artifact paths change', () => {
		const serverRoot = path.posix.join(
			path.posix.dirname(phpGeneratedRoot),
			'server'
		);

		const previous = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: [
							path.posix.join(
								phpGeneratedRoot,
								'Rest/BooksController.php'
							),
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const next = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'def456',
					artifacts: {
						generated: [
							path.posix.join(
								serverRoot,
								'Rest/BooksController.php'
							),
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const diff = diffGenerationState(previous, next);
		expect(diff.removed).toEqual([
			{
				resource: 'books',
				generated: [
					path.posix.join(
						phpGeneratedRoot,
						'Rest/BooksController.php'
					),
				],
				shims: [],
			},
		]);
	});

	it('diffs manifests when shim paths change', () => {
		const previous = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'abc123',
					artifacts: {
						generated: [
							path.posix.join(
								phpGeneratedRoot,
								'Rest/BooksController.php'
							),
						],
						shims: ['inc/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const next = {
			version: 1 as const,
			resources: {
				books: {
					hash: 'def456',
					artifacts: {
						generated: [
							path.posix.join(
								phpGeneratedRoot,
								'Rest/BooksController.php'
							),
						],
						shims: ['includes/Rest/BooksController.php'],
					},
				},
			},
		} satisfies GenerationManifest;

		const diff = diffGenerationState(previous, next);
		expect(diff.removed).toEqual([
			{
				resource: 'books',
				generated: [],
				shims: ['inc/Rest/BooksController.php'],
			},
		]);
	});
});
