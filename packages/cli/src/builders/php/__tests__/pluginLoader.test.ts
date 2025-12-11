import path from 'node:path';
import { createPhpPluginLoaderHelper } from '../entry.plugin';
import {
	AUTO_GUARD_BEGIN,
	resetPhpAstChannel,
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '@wpkernel/wp-json-ast';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
	seedArtifacts,
} from '../test-support/php-builder.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	makeResource,
	makeRoute,
} from '@cli-tests/builders/fixtures.test-support';

describe('createPhpPluginLoaderHelper', () => {
	it('skips when no IR is available', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir: null }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('queues a plugin loader program with generated controllers', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr({
			meta: {
				sanitizedNamespace: 'demo-plugin',
				origin: 'wpk.config.ts',
			},
			resources: [
				makeResource({
					name: 'books',
					routes: [makeRoute({ path: '/kernel/v1/books' })],
				}),
				makeResource({
					name: 'authors',
					routes: [makeRoute({ path: '/kernel/v1/authors' })],
				}),
			],
		});
		await seedArtifacts(ir, context.reporter);

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
		expect(path.posix.basename(entry?.file ?? '')).toBe(
			path.posix.basename(ir.artifacts?.php?.pluginLoaderPath ?? '')
		);
		expect(entry?.docblock).toEqual([]);
		expect(entry?.metadata).toEqual({ kind: 'plugin-loader' });
		expect(entry?.program).toMatchSnapshot('plugin-loader-program');
	});

	it('derives content model registration from wp-post storage', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr({
			meta: {
				sanitizedNamespace: 'acme-demo',
				origin: 'wpk.config.ts',
				namespace: 'acme-demo',
			},
			resources: [
				makeResource({
					name: 'job',
					storage: {
						mode: 'wp-post',
						postType: 'acme_job',
						statuses: ['closed'],
						supports: ['title', 'editor'],
						taxonomies: {
							acme_job_department: {
								taxonomy: 'acme_job_department',
								hierarchical: false,
								register: true,
							},
						},
					},
					ui: {
						admin: {
							view: 'dataviews',
							dataviews: {
								screen: {
									menu: { slug: 'acme-jobs', title: 'Jobs' },
								},
								fields: [],
								defaultView: { layout: 'table', columns: [] },
							},
						},
					},
					routes: [makeRoute({ path: '/kernel/v1/jobs' })],
				}),
			],
		});
		await seedArtifacts(ir, context.reporter);

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
		expect(entry?.program).toMatchSnapshot(
			'plugin-loader-program-with-content-model'
		);
	});

	it('emits UI asset registration when dataview metadata exists', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr({
			meta: {
				sanitizedNamespace: 'demo-plugin',
				origin: 'wpk.config.ts',
				namespace: 'demo-plugin',
			},
			resources: [
				makeResource({
					name: 'books',
					routes: [makeRoute({ path: '/kernel/v1/books' })],
				}),
			],
		});
		const runtime = ir.artifacts.runtime.runtime;
		ir.artifacts.surfaces = {
			'res:books': {
				resource: 'books',
				appDir: runtime.applied,
				generatedAppDir: runtime.generated,
				pagePath: path.join(runtime.applied, 'books/page.tsx'),
				formPath: path.join(runtime.applied, 'books/form.tsx'),
				configPath: path.join(runtime.applied, 'books/config.tsx'),
				menu: { slug: 'books', title: 'Books' },
			},
		};
		ir.ui = {
			resources: [
				{
					resource: 'books',
					menu: { slug: 'books', title: 'Books' },
				},
			],
			loader: {
				handle: 'wp-demo-plugin-ui',
				assetPath: 'build/index.asset.json',
				scriptPath: 'build/index.js',
				localizationObject: 'wpKernelUISettings',
				namespace: 'demo-plugin',
			},
		};
		await seedArtifacts(ir, context.reporter);

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
		expect(entry?.program).toMatchSnapshot('plugin-loader-program-with-ui');
	});

	it('respects custom namespace structures', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr({
			meta: {
				sanitizedNamespace: 'acme-demo',
				origin: 'acme.config.ts',
			},
			resources: [
				makeResource({
					name: 'jobs',
					routes: [makeRoute({ path: '/kernel/v1/jobs' })],
				}),
			],
		});
		await seedArtifacts(ir, context.reporter);

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
		expect(path.posix.basename(entry?.file ?? '')).toBe(
			path.posix.basename(ir.artifacts?.php?.pluginLoaderPath ?? '')
		);
		expect(entry?.program).toMatchSnapshot(
			'plugin-loader-program-custom-namespace'
		);
	});

	it('skips generation when plugin.php exists without the auto-guard', async () => {
		const readText = jest
			.fn()
			.mockResolvedValue('<?php\n// user plugin loader');
		const workspace = makeWorkspaceMock({ readText });
		const context = createPipelineContext({ workspace });
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr();
		await seedArtifacts(ir, context.reporter);

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		expect(readText).toHaveBeenCalledWith(
			ir.artifacts?.php?.pluginLoaderPath
		);
		expect(context.reporter.info).toHaveBeenCalledWith(
			expect.stringContaining('skipping generation because')
		);
		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('queues a new loader when the existing plugin.php contains the auto-guard', async () => {
		const readText = jest
			.fn()
			.mockResolvedValue(`<?php\n// ${AUTO_GUARD_BEGIN}\n`);
		const workspace = makeWorkspaceMock({ readText });
		const context = createPipelineContext({ workspace });
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const ir = createMinimalIr();
		await seedArtifacts(ir, context.reporter);

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		expect(readText).toHaveBeenCalledWith(
			ir.artifacts?.php?.pluginLoaderPath
		);
		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
	});
});
