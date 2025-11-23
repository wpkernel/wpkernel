import path from 'node:path';
import fs from 'node:fs/promises';
import { createNoopReporter as buildNoopReporter } from '@wpkernel/core/reporter';
import { buildWorkspace } from '../../workspace';
import type { IRResource } from '../../ir/publicTypes';
import type {
	BuilderInput,
	BuilderOutput,
	BuilderWriteAction,
} from '../../runtime/types';
import {
	buildAssetDependencies,
	createBundler,
	buildExternalList,
	buildGlobalsMap,
	buildRollupDriverArtifacts,
	normaliseAliasReplacement,
	toWordPressGlobal,
	toWordPressHandle,
} from '../bundler';
import { makeIrMeta } from '@cli-tests/ir.test-support';
import { withWorkspace as baseWithWorkspace } from '@cli-tests/builders/builder-harness.test-support';
import type { BuilderHarnessContext } from '@cli-tests/builders/builder-harness.test-support';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';

describe('createBundler', () => {
	type BundlerWorkspaceContext = BuilderHarnessContext<
		ReturnType<typeof buildWorkspace>
	>;

	const withWorkspace = (
		run: (context: BundlerWorkspaceContext) => Promise<void>
	) =>
		baseWithWorkspace(run, {
			createWorkspace: (root: string) => buildWorkspace(root),
		});

	function buildBuilderInput({
		namespace,
		sanitizedNamespace,
		workspaceRoot,
		phase,
		resources = [],
		resourceConfigs = {},
	}: {
		namespace: string;
		sanitizedNamespace: string;
		workspaceRoot: string;
		phase: 'generate' | 'apply';
		resources?: IRResource[];
		resourceConfigs?: Record<string, unknown>;
	}): BuilderInput {
		return {
			phase,
			options: {
				config: {
					version: 1,
					namespace,
					schemas: {},
					resources: resourceConfigs as Record<string, never>,
				},
				namespace,
				origin: 'wpk.config.ts',
				sourcePath: path.join(workspaceRoot, 'wpk.config.ts'),
			},
			ir: {
				meta: makeIrMeta(namespace, {
					sanitizedNamespace,
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
				}),
				config: {
					version: 1,
					namespace,
					schemas: {},
					resources: resourceConfigs as Record<string, never>,
				},
				schemas: [],
				resources,
				capabilities: [],
				capabilityMap: {
					sourcePath: undefined,
					definitions: [],
					fallback: {
						capability: 'manage_options',
						appliesTo: 'resource',
					},
					missing: [],
					unused: [],
					warnings: [],
				},
				blocks: [],
				php: {
					namespace: sanitizedNamespace,
					autoload: 'inc/',
					outputDir: loadTestLayoutSync().resolve('php.generated'),
				},
				layout: loadTestLayoutSync(),
			},
		};
	}

	it('writes rollup driver configuration and asset metadata', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const layout = loadTestLayoutSync();
			const bundlerConfigPath = layout.resolve('bundler.config');
			const bundlerAssetsPath = layout.resolve('bundler.assets');
			await workspace.writeJson(
				'package.json',
				{
					name: 'bundler-plugin',
					version: '1.2.3',
					peerDependencies: {
						'@wordpress/data': '^10.0.0',
						'@wordpress/components': '^30.0.0',
						'@wordpress/element': '^6.0.0',
						'@wordpress/dataviews': '^9.0.0',
						'@wordpress/api-fetch': '^7.0.0',
					},
				},
				{ pretty: true }
			);

			const builder = createBundler();
			const reporter = buildNoopReporter();
			const queueWrite = jest.fn<void, [BuilderWriteAction]>();
			const output: BuilderOutput = {
				actions: [],
				queueWrite,
			};

			const input = buildBuilderInput({
				namespace: 'bundler-plugin',
				sanitizedNamespace: 'bundler-plugin',
				workspaceRoot,
				phase: 'generate',
				resources: [
					makeResource({
						name: 'jobs',
						ui: {
							admin: {
								dataviews: {
									fields: [{ id: 'title', label: 'Title' }],
									defaultView: {
										type: 'table',
										fields: ['title'],
									},
									mapQuery: () => ({ search: undefined }),
								},
							},
						},
					}),
				],
			});

			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate',
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const configPath = path.join(
				workspaceRoot,
				'.wpk',
				'bundler',
				'config.json'
			);
			const assetPath = path.join(
				workspaceRoot,
				'.wpk',
				'bundler',
				'assets',
				'index.asset.json'
			);

			const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
			const assetManifest = JSON.parse(
				await fs.readFile(assetPath, 'utf8')
			);
			const updatedPkg = JSON.parse(
				await fs.readFile(
					path.join(workspaceRoot, 'package.json'),
					'utf8'
				)
			);

			expect(config.driver).toBe('rollup');
			expect(config.external).toEqual(
				expect.arrayContaining([
					'@wordpress/data',
					'@wordpress/components',
					'@wordpress/block-editor',
					'@wordpress/blocks',
					'@wordpress/hooks',
					'@wordpress/i18n',
					'@wordpress/interactivity',
					'@wordpress/api-fetch',
					'@wordpress/private-apis',
					'@wordpress/element',
				])
			);
			expect(assetManifest.dependencies).toEqual(
				expect.arrayContaining(['wp-interactivity'])
			);
			const aliasRoot = workspace.resolve('src').replace(/\\/g, '/');
			expect(config.alias).toContainEqual({
				find: '@/',
				replacement: `${aliasRoot}/`,
			});
			expect(config.alias).toContainEqual({
				find: '@wordpress/dataviews',
				replacement: '@wordpress/dataviews/wp',
			});
			expect(config.alias).toContainEqual({
				find: '@wordpress/element',
				replacement: 'react',
			});
			expect(updatedPkg.scripts).toEqual(
				expect.objectContaining({
					start: 'wpk start',
					build: 'vite build',
					generate: 'wpk generate',
					apply: 'wpk apply',
				})
			);
			expect(config.assetManifest.path).toBe('build/index.asset.json');
			expect(config.sourcemap).toEqual({
				development: true,
				production: false,
			});
			expect(config.optimizeDeps.exclude).toEqual(config.external);

			expect(assetManifest).toMatchObject({
				entry: 'index',
				version: '0.1.0',
			});
			expect(assetManifest.dependencies).toEqual(
				expect.arrayContaining([
					'wp-data',
					'wp-components',
					'wp-dataviews',
					'wp-block-editor',
					'wp-blocks',
					'wp-hooks',
					'wp-i18n',
					'wp-interactivity',
					'wp-api-fetch',
					'wp-element',
				])
			);
			expect(assetManifest.ui).toEqual(
				expect.objectContaining({
					handle: 'wp-bundler-plugin-ui',
				})
			);
			expect(updatedPkg.dependencies ?? {}).not.toHaveProperty(
				'loglayer'
			);
			expect(updatedPkg.devDependencies ?? {}).not.toHaveProperty(
				'loglayer'
			);
			expect(updatedPkg.peerDependencies ?? {}).not.toHaveProperty(
				'loglayer'
			);

			expect(output.queueWrite).toHaveBeenCalled();
			const queuedFiles = queueWrite.mock.calls.map(
				([action]) => action.file
			);
			expect(queuedFiles).toEqual(
				expect.arrayContaining([
					bundlerConfigPath,
					bundlerAssetsPath,
					'vite.config.ts',
				])
			);

			const uiApplied = layout.resolve('ui.applied');
			expect(config.input.index).toBe(
				path.posix.join(uiApplied, 'index.tsx')
			);

			const viteConfig = await workspace.readText('vite.config.ts');
			const relativeImport = path.posix
				.relative(
					path.posix.dirname('vite.config.ts'),
					bundlerConfigPath
				)
				.replace(/\\/g, '/');
			const normalizedImport =
				relativeImport.startsWith('./') ||
				relativeImport.startsWith('../')
					? relativeImport
					: `./${relativeImport}`;
			expect(viteConfig).toContain(
				`import bundlerConfig from '${normalizedImport}';`
			);
		});
	});

	it('includes UI handle metadata when dataview resources exist', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			await workspace.writeJson(
				'package.json',
				{
					name: 'bundler-plugin',
					version: '1.2.3',
				},
				{ pretty: true }
			);

			const builder = createBundler();
			const reporter = buildNoopReporter();
			const queueWrite = jest.fn<void, [BuilderWriteAction]>();
			const output: BuilderOutput = {
				actions: [],
				queueWrite,
			};

			const dataviewResource = {
				name: 'books',
				schemaKey: 'books',
				schemaProvenance: 'manual',
				routes: [],
				cacheKeys: {
					list: { segments: [], source: 'default' },
					get: { segments: [], source: 'default' },
				},
				warnings: [],
				hash: 'books-hash',
				ui: {
					admin: {
						dataviews: {},
					},
				},
			} as unknown as IRResource;

			const input = buildBuilderInput({
				namespace: 'bundler-plugin',
				sanitizedNamespace: 'bundler-plugin',
				workspaceRoot,
				phase: 'generate',
				resources: [dataviewResource],
				resourceConfigs: {
					books: {
						name: 'books',
						ui: {
							admin: {
								dataviews: {
									preferencesKey: 'books/admin',
								},
							},
						},
					},
				},
			});

			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'generate',
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const assetPath = path.join(
				workspaceRoot,
				'.wpk',
				'bundler',
				'assets',
				'index.asset.json'
			);
			const assetManifest = JSON.parse(
				await fs.readFile(assetPath, 'utf8')
			);

			expect(assetManifest.ui).toEqual({
				handle: 'wp-bundler-plugin-ui',
				asset: 'build/index.asset.json',
				script: 'build/index.js',
			});
		});
	});

	it('rolls back workspace writes when package.json cannot be parsed', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			await workspace.write('package.json', '{ invalid json');

			const builder = createBundler();
			const reporter = buildNoopReporter();
			const queueWrite = jest.fn<void, [BuilderWriteAction]>();
			const output: BuilderOutput = {
				actions: [],
				queueWrite,
			};
			const input = buildBuilderInput({
				namespace: 'bundler-plugin',
				sanitizedNamespace: 'bundler-plugin',
				workspaceRoot,
				phase: 'generate',
				resources: [
					makeResource({
						ui: {
							admin: {
								dataviews: {},
							},
						},
					}),
				],
			});

			await expect(
				builder.apply(
					{
						context: {
							workspace,
							reporter,
							phase: 'generate',
							generationState: buildEmptyGenerationState(),
						},
						input,
						output,
						reporter,
					},
					undefined
				)
			).rejects.toThrow('Failed to parse workspace package.json');

			const configExists = await workspace.exists(
				path.posix.join('.wpk', 'bundler', 'config.json')
			);
			expect(configExists).toBe(false);
			expect(output.queueWrite).not.toHaveBeenCalled();
		});
	});

	it('derives driver artifacts with sane defaults when package.json is missing', () => {
		const artifacts = buildRollupDriverArtifacts(null);
		expect(artifacts.config.external).toEqual(
			expect.arrayContaining([
				'@wordpress/data',
				'@wordpress/components',
				'@wordpress/hooks',
				'@wordpress/api-fetch',
				'@wordpress/block-editor',
				'@wordpress/blocks',
				'@wordpress/i18n',
				'@wordpress/private-apis',
			])
		);
		expect(artifacts.assetManifest.version).toBe('0.0.0');
	});

	it('preserves alias replacements that already include a trailing slash', () => {
		const artifacts = buildRollupDriverArtifacts(
			{ peerDependencies: {} },
			{ aliasRoot: './custom/' }
		);
		expect(artifacts.config.alias).toContainEqual({
			find: '@/',
			replacement: './custom/',
		});
	});

	it('skips generation outside the generate phase', async () => {
		await withWorkspace(async ({ workspace, root: workspaceRoot }) => {
			const builder = createBundler();
			const reporter = buildNoopReporter();
			const output: BuilderOutput = {
				actions: [],
				queueWrite: jest.fn(),
			};

			const input = buildBuilderInput({
				namespace: 'skip-plugin',
				sanitizedNamespace: 'SkipPlugin',
				workspaceRoot,
				phase: 'apply',
			});

			await builder.apply(
				{
					context: {
						workspace,
						reporter,
						phase: 'apply',
						generationState: buildEmptyGenerationState(),
					},
					input,
					output,
					reporter,
				},
				undefined
			);

			const configExists = await workspace.exists(
				path.posix.join('.wpk', 'bundler', 'config.json')
			);
			expect(configExists).toBe(false);
			expect(output.queueWrite).not.toHaveBeenCalled();
		});
	});
});

describe('bundler helper exports', () => {
	it('creates a deduplicated external list from package dependencies', () => {
		const externals = buildExternalList({
			peerDependencies: {
				'@wordpress/data': '^10.0.0',
			},
			dependencies: {
				'@wordpress/data': '^10.0.0',
				'@wordpress/components': '^30.0.0',
				'@wordpress/api-fetch': '^7.0.0',
				'@wordpress/private-apis': '^1.0.0',
				lodash: '^4.17.21',
			},
		});

		expect(externals).toEqual(
			expect.arrayContaining([
				'@wordpress/components',
				'@wordpress/data',
				'@wordpress/hooks',
				'@wordpress/api-fetch',
				'@wordpress/private-apis',
			])
		);
		expect(new Set(externals).size).toBe(externals.length);
	});

	it('maps externals to WordPress and React globals', () => {
		const globals = buildGlobalsMap([
			'@wordpress/api-fetch',
			'@wordpress/data',
			'react',
			'react-dom',
			'react/jsx-runtime',
			'react/jsx-dev-runtime',
			'lodash',
		]);

		expect(globals['@wordpress/api-fetch']).toBe('wp.apiFetch');
		expect(globals['@wordpress/data']).toBe('wp.data');
		expect(globals.react).toBe('React');
		expect(globals['react-dom']).toBe('ReactDOM');
		expect(globals['react/jsx-runtime']).toBe('React');
		expect(globals['react/jsx-dev-runtime']).toBe('React');
		expect(globals).not.toHaveProperty('lodash');
	});

	it('derives WordPress asset dependencies including react shims', () => {
		const dependencies = buildAssetDependencies([
			'@wordpress/data',
			'@wordpress/hooks',
			'@wordpress/private-apis',
		]);

		expect(dependencies).toEqual([
			'wp-data',
			'wp-hooks',
			'wp-private-apis',
		]);
	});

	it('formats WordPress globals and handles trailing slashes for aliases', () => {
		expect(toWordPressGlobal('api-fetch')).toBe('wp.apiFetch');
		expect(toWordPressGlobal('block-editor')).toBe('wp.blockEditor');
		expect(toWordPressGlobal('block--editor')).toBe('wp.blockEditor');
		expect(toWordPressHandle('api-fetch')).toBe('wp-api-fetch');

		expect(normaliseAliasReplacement('./src')).toBe('./src/');
		expect(normaliseAliasReplacement('./src/')).toBe('./src/');
	});
});
