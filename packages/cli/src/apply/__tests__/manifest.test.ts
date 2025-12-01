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
	resolveGenerationStatePath,
	readGenerationState,
	writeGenerationState,
	type GenerationManifest,
} from '../manifest';
import { loadTestLayout } from '@wpkernel/test-utils/layout.test-support';
import * as layoutManifest from '../../layout/manifest';

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

	it('throws when layout.manifest.json cannot be loaded', async () => {
		const workspace = makeWorkspaceMock({
			root: '/',
			readText: jest.fn(async () => null),
		});

		const spy = jest
			.spyOn(layoutManifest, 'loadLayoutFromWorkspace')
			.mockResolvedValue(null as never);

		await expect(
			resolveGenerationStatePath(workspace)
		).rejects.toMatchObject({
			message:
				'layout.manifest.json not found; cannot resolve apply state path.',
		});

		spy.mockRestore();
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

	it('normalises empty or malformed shapes to empty state', () => {
		expect(normaliseGenerationState(null)).toEqual(
			buildEmptyGenerationState()
		);

		const normalised = normaliseGenerationState({
			version: 1,
			resources: {
				'': { hash: null },
			},
			pluginLoader: { file: '' },
			phpIndex: { file: null },
			jsRuntime: { files: [42, ''] },
			ui: { handle: ' ', files: [{ generated: '', applied: null }] },
			blocks: { files: [{ generated: '', applied: '' }] },
		});

		expect(normalised).toEqual(buildEmptyGenerationState());
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

	it('throws when the IR layout fragment is missing', () => {
		expect(() =>
			buildGenerationManifestFromIr({
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
				resources: [],
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
				layout: undefined as unknown as typeof testLayout,
				diagnostics: [],
			})
		).toThrow(
			'IR layout fragment did not resolve layout before building generation manifest.'
		);
	});

	it('builds UI and JS runtime state when capability map and admin screens exist', () => {
		const resource = createDefaultResource();
		const ir = makeIr({
			namespace: 'demo-plugin',
			meta: makeIrMeta('demo-plugin', {
				sourcePath: 'wpk.config.ts',
				origin: 'typescript',
				namespace: 'DemoPlugin',
				sanitizedNamespace: 'demo-plugin',
			}),
			config: {
				version: 1,
				namespace: 'demo-plugin',
				resources: {},
				schemas: {},
			},
			schemas: [],
			resources: [
				{
					...resource,
					id: 'res:books',
					name: 'books',
					schemaKey: 'books',
					hash: { ...resource.hash, value: 'xyz' },
					ui: {
						admin: {
							dataviews: {
								fields: [{ id: 'title', label: 'Title' }],
								defaultView: {
									type: 'table',
									fields: ['title'],
								},
								preferencesKey: 'books/admin',
							},
						},
					},
				},
			],
			capabilities: [],
			capabilityMap: {
				definitions: [
					{
						id: 'cap:manage',
						name: 'manage',
						description: '',
					},
				],
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
			ui: {
				resources: [
					{
						resource: 'books',
						dataviews: {
							fields: [{ id: 'title', label: 'Title' }],
							defaultView: { type: 'table', fields: ['title'] },
							preferencesKey: 'books/admin',
						},
					},
				],
			},
			layout: testLayout,
			diagnostics: [],
		});

		const manifest = buildGenerationManifestFromIr(ir);
		expect(manifest.jsRuntime?.files).toEqual([
			path.posix.join(
				testLayout.resolve('js.generated'),
				'capabilities.ts'
			),
			path.posix.join(
				testLayout.resolve('js.generated'),
				'capabilities.d.ts'
			),
			path.posix.join(testLayout.resolve('js.generated'), 'index.ts'),
			path.posix.join(testLayout.resolve('js.generated'), 'index.d.ts'),
		]);

		expect(manifest.ui?.handle).toBe('wp-demo-plugin-ui');
		const files = manifest.ui?.files ?? [];
		expect(
			files.some(({ generated }) =>
				generated.endsWith('resources/books.ts')
			)
		).toBe(true);
		expect(
			files.some(({ generated }) =>
				generated.endsWith('app/books/admin/page.tsx')
			)
		).toBe(true);
		const generatedArtifacts = manifest.resources.books.artifacts.generated;
		expect(
			generatedArtifacts.some((file) =>
				file.includes('/registry/dataviews/')
			)
		).toBe(true);
		expect(
			generatedArtifacts.some((file) =>
				file.includes('/fixtures/dataviews/')
			)
		).toBe(true);
		expect(
			generatedArtifacts.some((file) =>
				file.includes('/fixtures/interactivity/')
			)
		).toBe(true);
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
