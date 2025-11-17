import path from 'node:path';
import { createJsBlocksBuilder } from '../block.artifacts';
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
} from '@wpkernel/test-utils/builders/tests/ts.test-support';
import { buildWorkspace } from '../../../workspace';
import type { Workspace } from '../../../workspace';
import { makeIr } from '../../../tests/ir.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { loadTestLayout } from '../../../tests/layout.test-support';

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

function materialiseArtifacts(
	artifacts: ReturnType<typeof buildBuilderArtifacts>
): { buildOptions: BuildIrOptions; typedIr: IRv1 } {
	const buildOptions = artifacts.options as unknown as BuildIrOptions;
	const typedIr = makeIr({
		namespace: artifacts.ir.meta.namespace,
		meta: artifacts.ir.meta as any,
		config: buildOptions.config as any,
		schemas: artifacts.ir.schemas as any,
		resources: artifacts.ir.resources as any,
		capabilityMap: artifacts.ir.capabilityMap as any,
		blocks: artifacts.ir.blocks as any,
		php: artifacts.ir.php as any,
		ui: artifacts.ir.ui as any,
		diagnostics: artifacts.ir.diagnostics as any,
	});

	return { buildOptions, typedIr };
}

describe('createJsBlocksBuilder', () => {
	it('emits registrar and stubs for js-only blocks', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);
			const layout = await loadTestLayout({ cwd: workspace.root });

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
				blocks: [
					makeBlock('demo/example', blockDir, manifestPath, false),
				],
			};

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

			await expect(
				workspace.readText(
					path.join('src', 'blocks', 'example', 'view.ts')
				)
			).resolves.toContain('AUTO-GENERATED WPK STUB');
			await expect(
				workspace.readText(
					path.posix.join(
						layout.resolve('blocks.generated'),
						'auto-register.ts'
					)
				)
			).resolves.toContain('registerBlockType');

			expect(
				output.actions.map((action) => normalise(action.file)).sort()
			).toEqual([
				path.posix.join(
					layout.resolve('blocks.generated'),
					'auto-register.ts'
				),
				'src/blocks/example/view.ts',
			]);
		});
	});

	it('writes empty registrar when blocks rely on file modules', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);
			const layout = await loadTestLayout({ cwd: workspace.root });

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
				blocks: [
					makeBlock('demo/module', blockDir, manifestPath, false),
				],
			};

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

			await expect(
				workspace.readText(
					path.posix.join(
						layout.resolve('blocks.generated'),
						'auto-register.ts'
					)
				)
			).resolves.toContain(
				'No JS-only blocks require auto-registration.'
			);
			await expect(
				workspace.exists(
					path.join('src', 'blocks', 'module', 'index.js')
				)
			).resolves.toBe(false);
			expect(output.actions.map((action) => action.file)).toEqual([
				path.posix.join(
					layout.resolve('blocks.generated'),
					'auto-register.ts'
				),
			]);
		});
	});

	it('does not overwrite existing stubs when present', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);
			const layout = await loadTestLayout({ cwd: workspace.root });

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
				blocks: [
					makeBlock('demo/existing', blockDir, manifestPath, false),
				],
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
			expect(output.actions.map((action) => action.file)).toEqual([
				path.posix.join(
					layout.resolve('blocks.generated'),
					'auto-register.ts'
				),
			]);
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
				blocks: [
					makeBlock('demo/invalid', blockDir, manifestPath, false),
				],
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
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(output.actions).toHaveLength(0);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createJsBlocksBuilder: no auto-register artifacts generated.'
			);
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
				blocks: [makeBlock('demo/ssr', blockDir, manifestPath, true)],
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
						ir: irWithBlocks,
					},
					output,
					reporter,
				},
				undefined
			);

			expect(output.actions).toHaveLength(0);
			expect(reporter.debug).toHaveBeenCalledWith(
				'createJsBlocksBuilder: no JS-only blocks discovered.'
			);
		});
	});

	it('ignores non-generate phases', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);

			const { ir, options } = buildBuilderArtifacts({
				sourcePath: path.join(root, 'wpk.config.ts'),
			});

			const reporter = buildReporter();
			const output = buildOutput();

			await createJsBlocksBuilder().apply(
				{
					context: { workspace, phase: 'init', reporter },
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

			expect(output.actions).toHaveLength(0);
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
			const next = jest.fn();

			await createJsBlocksBuilder().apply(
				{
					context: { workspace, phase: 'generate', reporter },
					input: {
						phase: 'generate',
						options,
						ir: null,
					},
					output,
					reporter,
				},
				next
			);

			expect(next).toHaveBeenCalled();
			expect(output.actions).toHaveLength(0);
		});
	});

	it('uses staged contents when workspace read returns null', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const configSource = buildWPKernelConfigSource();
			await workspace.write('wpk.config.ts', configSource);
			const layout = await loadTestLayout({ cwd: workspace.root });

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
				blocks: [
					makeBlock('demo/null-read', blockDir, manifestPath, false),
				],
			};

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
				output.actions.map((action) => normalise(action.file)).sort()
			).toEqual([
				path.posix.join(
					layout.resolve('blocks.generated'),
					'auto-register.ts'
				),
				'src/blocks/null-read/view.ts',
			]);
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
				blocks: [
					makeBlock('demo/failing', blockDir, manifestPath, false),
				],
			};

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

			const resource: IRResource = {
				id: 'res:books',
				name: 'books',
				schemaKey: 'book',
				schemaProvenance: 'manual',
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

			const layout = await loadTestLayout({ cwd: workspace.root });

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

			const indexAction = output.actions.find((action) =>
				normalise(action.file).endsWith('books/index.tsx')
			);
			const viewAction = output.actions.find((action) =>
				normalise(action.file).endsWith('books/view.ts')
			);
			expect(indexAction?.contents as string).toContain(
				'AUTO-GENERATED WPK STUB'
			);
			expect(viewAction?.contents as string).toContain(
				'AUTO-GENERATED WPK STUB'
			);

			const actionFiles = output.actions
				.map((action) => normalise(action.file))
				.map((file) =>
					file.replace(
						/^\.generated\/blocks/,
						layout.resolve('blocks.generated')
					)
				)
				.sort();
			const expectedFiles = [
				path.posix.join(
					layout.resolve('blocks.generated'),
					'auto-register.ts'
				),
				path.posix.join(
					layout.resolve('blocks.generated'),
					'books/block.json'
				),
				path.posix.join(
					layout.resolve('blocks.generated'),
					'books/index.tsx'
				),
				path.posix.join(
					layout.resolve('blocks.generated'),
					'books/view.ts'
				),
			].sort();

			expect(actionFiles).toEqual(expectedFiles);

			expect(reporter.warn).toHaveBeenCalled();
			expect(reporter.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					'render template was not declared and none was found'
				)
			);
		});
	});
});
