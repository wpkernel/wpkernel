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
} from '../test-support/php-builder.test-support';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';
import { makeResource, makeRoute } from '../test-support/fixtures.test-support';
import { loadTestLayoutSync } from '../../../tests/layout.test-support';

describe('createPhpPluginLoaderHelper', () => {
	it('skips when no IR is available', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPluginLoaderHelper();
		const next = jest.fn();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir: null }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			next
		);

		expect(next).toHaveBeenCalledTimes(1);
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
			php: {
				namespace: 'Demo\\Plugin',
				autoload: 'inc/',
				outputDir: loadTestLayoutSync().resolve('php.generated'),
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
		expect(entry?.file).toBe(
			context.workspace.resolve(
				path.posix.join(ir.php.outputDir, 'plugin.php')
			)
		);
		expect(entry?.docblock).toEqual([]);
		expect(entry?.metadata).toEqual({ kind: 'plugin-loader' });
		expect(entry?.program).toMatchSnapshot('plugin-loader-program');
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
		ir.ui = {
			resources: [
				{
					resource: 'books',
					preferencesKey: 'books/admin',
					menu: { slug: 'books', title: 'Books' },
				},
			],
		};

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
			php: {
				namespace: 'Acme\\Demo\\Plugin',
				autoload: 'src/php/',
				outputDir: loadTestLayoutSync().resolve('php.generated'),
			},
			resources: [
				makeResource({
					name: 'jobs',
					routes: [makeRoute({ path: '/kernel/v1/jobs' })],
				}),
			],
		});

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
		expect(entry?.file).toBe(
			context.workspace.resolve(
				path.posix.join(ir.php.outputDir, 'plugin.php')
			)
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
		const next = jest.fn();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			next
		);

		expect(readText).toHaveBeenCalledWith('plugin.php');
		expect(context.reporter.info).toHaveBeenCalledWith(
			'createPhpPluginLoaderHelper: skipping generation because plugin.php exists and appears user-owned.'
		);
		expect(next).toHaveBeenCalledTimes(1);
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

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		expect(readText).toHaveBeenCalledWith('plugin.php');
		const entry = getPhpBuilderChannel(context)
			.pending()
			.find((candidate) => candidate.metadata.kind === 'plugin-loader');

		expect(entry).toBeDefined();
	});
});
