import path from 'node:path';
import { createJsBlocksBuilder } from '../blocks-auto-register';
import type {
	IRResource,
	IRSchema,
	IRv1,
	BuildIrOptions,
	IRBlock,
	IRHashProvenance,
} from '../../../ir/publicTypes';
import {
	withWorkspace as baseWithWorkspace,
	buildWPKernelConfigSource,
	buildBuilderArtifacts,
	buildReporter,
	buildOutput,
	normalise,
	type BuilderHarnessContext,
} from '@cli-tests/builders/ts.test-support';
import { buildWorkspace } from '../../../workspace';
import type { Workspace } from '../../../workspace';
import { makeIr } from '@cli-tests/ir.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root: string) => buildWorkspace(root),
	});

const makeBlockHash = (label: string): IRHashProvenance => ({
	algo: 'sha256',
	inputs: ['key', 'directory', 'hasRender', 'manifestSource'],
	value: label,
});

const makeBlock = (
	key: string,
	directory: string,
	manifestSource: string,
	hasRender: boolean
): IRBlock => ({
	id: `blk:${key}`,
	hash: makeBlockHash(`${key}-hash`),
	key,
	directory,
	hasRender,
	manifestSource,
});

function attachBlockPlan(ir: IRv1, workspace: Workspace, block: IRBlock): void {
	const appliedDir = workspace.resolve(block.directory);
	const generatedRoot = ir.layout.resolve('blocks.generated');
	const dirName = path.posix.basename(block.directory);
	const generatedDir = path.posix.join(generatedRoot, dirName);

	ir.artifacts.blocks[block.id] = {
		key: block.key,
		appliedDir,
		generatedDir,
		jsonPath: workspace.resolve(block.manifestSource),
		tsEntry: path.posix.join(appliedDir, 'index.tsx'),
		tsView: path.posix.join(appliedDir, 'view.tsx'),
		tsHelper: path.posix.join(appliedDir, 'view.ts'),
		mode: block.hasRender ? 'ssr' : 'js',
		phpRenderPath: block.hasRender
			? path.posix.join(appliedDir, 'render.php')
			: undefined,
	};
}

function materialiseArtifacts(
	artifacts: ReturnType<typeof buildBuilderArtifacts>
): { buildOptions: BuildIrOptions; typedIr: IRv1 } {
	const buildOptions = artifacts.options as unknown as BuildIrOptions;
	const typedIr = makeIr({
		namespace: artifacts.ir.meta.namespace,
		meta: artifacts.ir.meta as any,
		// config: buildOptions.config as any,
		schemas: artifacts.ir.schemas as any,
		resources: artifacts.ir.resources as any,
		capabilityMap: artifacts.ir.capabilityMap as any,
		blocks: artifacts.ir.blocks as any,
		php: artifacts.ir.php as any,
		ui: artifacts.ir.ui as any,
		diagnostics: artifacts.ir.diagnostics as any,
	});

	typedIr.artifacts.js = {
		capabilities: {
			modulePath: path.posix.join(
				typedIr.layout.resolve('js.generated'),
				'capabilities.ts'
			),
			declarationPath: path.posix.join(
				typedIr.layout.resolve('js.generated'),
				'capabilities.d.ts'
			),
		},
		index: {
			modulePath: path.posix.join(
				typedIr.layout.resolve('js.generated'),
				'index.ts'
			),
			declarationPath: path.posix.join(
				typedIr.layout.resolve('js.generated'),
				'index.d.ts'
			),
		},
		uiRuntimePath: path.posix.join(
			typedIr.layout.resolve('ui.generated'),
			'runtime.ts'
		),
		uiEntryPath: path.posix.join(
			typedIr.layout.resolve('ui.generated'),
			'index.tsx'
		),
		blocksRegistrarPath: path.posix.join(
			typedIr.layout.resolve('blocks.generated'),
			'auto-register.ts'
		),
	};

	return { buildOptions, typedIr };
}

describe('createJsBlocksBuilder', () => {
	it('emits registrar and stubs for js-only blocks', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'example');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/example',
						title: 'Example Block',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'build/editor.js',
						viewScriptModule: 'file:./view.ts',
					},
					null,
					2
				)
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});
			const irWithBlocks: IRv1 = {
				...typedIr,
				blocks: [],
			};
			const exampleBlock = makeBlock(
				'demo/example',
				blockDir,
				manifestPath,
				false
			);
			irWithBlocks.blocks = [exampleBlock];
			attachBlockPlan(irWithBlocks, workspace, exampleBlock);

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createJsBlocksBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			const files = output.actions.map((action) =>
				normalise(action.file)
			);
			expect(files).toEqual(
				expect.arrayContaining([
					expect.stringContaining('auto-register.ts'),
					expect.stringContaining('blocks/example/view.ts'),
				])
			);
		});
	});

	it('writes empty registrar when blocks rely on file modules', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'module');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/module',
						title: 'Module Block',
						icon: 'smiley',
						category: 'widgets',
						editorScriptModule: 'file:./index.js',
					},
					null,
					2
				)
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});
			const irWithBlocks: IRv1 = {
				...typedIr,
				blocks: [],
			};
			const moduleBlock = makeBlock(
				'demo/module',
				blockDir,
				manifestPath,
				false
			);
			irWithBlocks.blocks = [moduleBlock];
			attachBlockPlan(irWithBlocks, workspace, moduleBlock);

			const reporter = buildReporter();
			const output = buildOutput();
			const builder = createJsBlocksBuilder();

			await builder.apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			const registrar = output.actions.find((action) =>
				normalise(action.file).includes('auto-register.ts')
			);
			expect(registrar).toBeDefined();
			expect(registrar?.contents as string).toContain(
				'No JS-only blocks require auto-registration.'
			);
		});
	});

	it('does not overwrite existing stubs when present', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'existing');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/existing',
						title: 'Existing Block',
						icon: 'admin-site',
						category: 'widgets',
						editorScriptModule: 'file:./index.tsx',
					},
					null,
					2
				)
			);
			await workspace.write(
				path.join(blockDir, 'index.tsx'),
				'// pre-existing editor implementation\n'
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});
			const irWithBlocks: IRv1 = {
				...typedIr,
				blocks: [],
			};
			const existingBlock = makeBlock(
				'demo/existing',
				blockDir,
				manifestPath,
				false
			);
			irWithBlocks.blocks = [existingBlock];
			attachBlockPlan(irWithBlocks, workspace, existingBlock);

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			await expect(
				workspace.readText(
					path.join('src', 'blocks', 'existing', 'index.tsx')
				)
			).resolves.toContain('pre-existing');
			expect(
				output.actions.map((action) => normalise(action.file))
			).toEqual(
				expect.arrayContaining([
					expect.stringContaining('auto-register.ts'),
				])
			);
		});
	});

	it('skips generation when manifest cannot be processed', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'invalid');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(manifestPath, '{ invalid json');

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});
			const irWithBlocks: IRv1 = {
				...typedIr,
				blocks: [],
			};
			const invalidBlock = makeBlock(
				'demo/invalid',
				blockDir,
				manifestPath,
				false
			);
			irWithBlocks.blocks = [invalidBlock];
			attachBlockPlan(irWithBlocks, workspace, invalidBlock);

			const reporter = buildReporter();
			const output = buildOutput();

			await expect(
				createJsBlocksBuilder().apply(
					{
						context: {
							workspace,
							phase: 'generate',
							reporter,
							generationState: buildEmptyGenerationState(),
						},
						input: {
							phase: 'generate',
							options: buildOptions,
							ir: irWithBlocks,
						},
						output,
						reporter,
					},
					undefined
				)
			).rejects.toThrow();
			expect(reporter.debug).not.toHaveBeenCalled();
		});
	});

	it('logs debug when no JS-only blocks are present', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'ssr');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/ssr',
						title: 'SSR Block',
						icon: 'smiley',
						category: 'widgets',
						render: 'file:./render.php',
					},
					null,
					2
				)
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});
			const irWithBlocks: IRv1 = {
				...typedIr,
				blocks: [],
			};
			const ssrBlock = makeBlock(
				'demo/ssr',
				blockDir,
				manifestPath,
				true
			);
			irWithBlocks.blocks = [ssrBlock];
			attachBlockPlan(irWithBlocks, workspace, ssrBlock);

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(output.actions.length).toBe(0);
			expect(reporter.debug).toHaveBeenCalled();
		});
	});

	it('ignores non-generate phases', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const dummyBlock = makeBlock(
				'demo/ignore',
				path.join('src', 'blocks', 'ignore'),
				path.join('src', 'blocks', 'ignore', 'block.json'),
				false
			);
			ir.blocks = [dummyBlock];
			attachBlockPlan(ir, workspace, dummyBlock);

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: {
						workspace,
						phase: 'init',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'init',
						options,
						ir,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(output.actions.length).toBeGreaterThanOrEqual(0);
			expect(reporter.debug).not.toHaveBeenCalled();
		});
	});

	it('skips when IR is missing', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const { options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: {
						workspace,
						phase: 'init',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options,
						ir: null,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(output.actions).toHaveLength(0);
		});
	});

	it('uses staged contents when workspace read returns null', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'null-read');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/null-read',
						title: 'Null Read Block',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'build/editor.js',
						viewScriptModule: 'file:./view.ts',
					},
					null,
					2
				)
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});
			const irWithBlocks: IRv1 = {
				...typedIr,
				blocks: [],
			};
			const nullReadBlock = makeBlock(
				'demo/null-read',
				blockDir,
				manifestPath,
				false
			);
			irWithBlocks.blocks = [nullReadBlock];
			attachBlockPlan(irWithBlocks, workspace, nullReadBlock);

			const reporter = buildReporter();
			const output = buildOutput();
			const originalRead = workspace.read.bind(workspace);
			const stubRelative = normalise(
				path.join('src', 'blocks', 'null-read', 'view.ts')
			);
			let intercepted = false;
			const readSpy = jest
				.spyOn(workspace, 'read')
				.mockImplementation(async (file) => {
					const candidate = normalise(String(file));
					if (!intercepted && candidate.endsWith(stubRelative)) {
						intercepted = true;
						return null;
					}

					return originalRead(file);
				});

			await createJsBlocksBuilder().apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			readSpy.mockRestore();
			expect(intercepted).toBe(true);

			expect(
				output.actions.map((action) => normalise(action.file))
			).toEqual(
				expect.arrayContaining([
					expect.stringContaining('auto-register.ts'),
					expect.stringContaining('blocks/null-read/view.ts'),
				])
			);
			await expect(
				workspace.exists(
					path.join('src', 'blocks', 'null-read', 'view.ts')
				)
			).resolves.toBe(true);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createJsBlocksBuilder: emitted block stubs.',
				expect.objectContaining({ files: expect.any(Array) })
			);
		});
	});

	it('rolls back stub writes when a filesystem error occurs', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const blockDir = path.join('src', 'blocks', 'failing');
			const manifestPath = path.join(blockDir, 'block.json');
			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/failing',
						title: 'Failing Block',
						icon: 'smiley',
						category: 'widgets',
						editorScriptModule: 'file:./index.tsx',
					},
					null,
					2
				)
			);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});
			const irWithBlocks: IRv1 = {
				...typedIr,
				blocks: [],
			};
			const failingBlock = makeBlock(
				'demo/failing',
				blockDir,
				manifestPath,
				false
			);
			irWithBlocks.blocks = [failingBlock];
			attachBlockPlan(irWithBlocks, workspace, failingBlock);

			const reporter = buildReporter();
			const output = buildOutput();
			const writeSpy = jest
				.spyOn(workspace, 'write')
				.mockImplementationOnce(async () => {
					throw new Error('stub failure');
				});
			const rollbackSpy = jest.spyOn(workspace, 'rollback');

			await expect(
				createJsBlocksBuilder().apply(
					{
						context: {
							workspace,
							phase: 'generate',
							reporter,
							generationState: buildEmptyGenerationState(),
						},
						input: {
							phase: 'generate',
							options: buildOptions,
							ir: irWithBlocks,
						},
						output,
						reporter,
					},
					undefined
				)
			).rejects.toThrow('stub failure');

			expect(rollbackSpy).toHaveBeenCalled();
			writeSpy.mockRestore();
			rollbackSpy.mockRestore();
		});
	});

	it('derives manifests and stubs for resources without explicit blocks', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});
			const { buildOptions, typedIr } = materialiseArtifacts({
				ir,
				options,
			});
			const placeholderBlock = makeBlock(
				'demo/placeholder',
				path.join('src', 'blocks', 'placeholder'),
				path.join('src', 'blocks', 'placeholder', 'block.json'),
				true
			);
			typedIr.blocks = [placeholderBlock];
			attachBlockPlan(typedIr, workspace, placeholderBlock);

			const resource: IRResource = {
				id: 'res:books',
				name: 'books',
				schemaKey: 'book',
				schemaProvenance: 'manual',
				controllerClass:
					'Acme\\Books\\Generated\\Rest\\BooksController',
				routes: [
					{
						method: 'GET',
						path: '/kernel/v1/books',
						capability: undefined,
						hash: {
							algo: 'sha256',
							inputs: ['method', 'path'],
							value: 'list',
						},
						transport: 'remote',
					},
				],
				cacheKeys: {
					list: { segments: ['books', 'list'], source: 'config' },
					get: { segments: ['books', 'get'], source: 'config' },
				},
				identity: undefined,
				storage: undefined,
				queryParams: undefined,
				ui: undefined,
				blocks: { mode: 'js' },
				hash: {
					algo: 'sha256',
					inputs: ['resource'],
					value: 'books-resource',
				},
				warnings: [],
			};

			const schema: IRSchema = {
				id: 'sch:book',
				key: 'book',
				sourcePath: 'schemas/book.json',
				hash: {
					algo: 'sha256',
					inputs: ['schema'],
					value: 'schema-book',
				},
				schema: {
					type: 'object',
					properties: {
						title: { type: 'string', description: 'Title' },
						status: { enum: ['draft', 'publish'] },
					},
				},
				provenance: 'manual',
			};

			const irWithResource: IRv1 = {
				...typedIr,
				resources: [resource],
				schemas: [schema],
			};

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: {
						workspace,
						phase: 'generate',
						reporter,
						generationState: buildEmptyGenerationState(),
					},
					input: {
						phase: 'generate',
						options: buildOptions,
						ir: irWithResource,
					},
					output,
					reporter,
				},
				undefined
			);

			const manifestAction = output.actions.find((action) =>
				normalise(action.file).endsWith('books/block.json')
			);
			expect(manifestAction).toBeDefined();
			const parsed = JSON.parse(
				(manifestAction?.contents as string) ?? '{}'
			);
			expect(parsed).toMatchObject({
				name: 'demo-namespace/books',
				editorScriptModule: 'file:./index.tsx',
				viewScriptModule: 'file:./view.ts',
			});

			const stubContents = output.actions
				.map((action) => (action.contents as string) ?? '')
				.join('\n');
			expect(stubContents).toContain('AUTO-GENERATED WPK STUB');

			const actionFiles = output.actions
				.map((action) => normalise(action.file))
				.sort();
			expect(actionFiles).toEqual(
				expect.arrayContaining([
					expect.stringContaining('auto-register.ts'),
					expect.stringContaining('books/block.json'),
					expect.stringContaining('books/view.ts'),
				])
			);
		});
	});
});
