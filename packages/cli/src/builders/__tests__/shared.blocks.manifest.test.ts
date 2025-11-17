import path from 'node:path';
import {
	withWorkspace as baseWithWorkspace,
	type BuilderHarnessContext,
} from '@wpkernel/test-utils/builders/tests/ts.test-support';
import { buildWorkspace } from '../../workspace';
import type { Workspace } from '../../workspace';
import type { IRBlock, IRHashProvenance } from '../../ir/publicTypes';
import { collectBlockManifests } from '../shared.blocks.manifest';
import { loadTestLayout } from '../../tests/layout.test-support';

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

const withWorkspace = (
	run: (context: BuilderHarnessContext<Workspace>) => Promise<void>
) =>
	baseWithWorkspace(run, {
		createWorkspace: (root: string) => buildWorkspace(root),
	});

describe('collectBlockManifests', () => {
	it('returns manifest entries and render metadata for blocks with declared render files', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const layout = await loadTestLayout({ cwd: workspace.root });
			const blockDir = path.join('src', 'blocks', 'example');
			const manifestPath = path.join(blockDir, 'block.json');
			const renderPath = path.join(blockDir, 'render.php');

			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/example',
						title: 'Example Block',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'file:./index.js',
						render: 'file:./render.php',
					},
					null,
					2
				)
			);
			await workspace.write(renderPath, '<?php echo "render";\n');

			const block = makeBlock(
				'demo/example',
				blockDir,
				manifestPath,
				true
			);

			const result = await collectBlockManifests({
				workspace,
				blocks: [block],
				roots: {
					generated: layout.resolve('blocks.generated'),
					surfaced: layout.resolve('blocks.applied'),
				},
			});

			const processed = result.get(block.key);
			expect(processed).toBeDefined();
			expect(processed?.warnings).toEqual([]);
			expect(processed?.manifestEntry).toEqual({
				directory: 'src/blocks/example',
				manifest: 'src/blocks/example/block.json',
				render: 'src/blocks/example/render.php',
			});
			expect(processed?.renderPath).toEqual({
				absolutePath: path.join(root, renderPath),
				relativePath: 'src/blocks/example/render.php',
			});
			expect(processed?.renderStub).toBeUndefined();
			expect(processed?.registrar.variableName).toBe('demoExample');
		});
	});

	it('creates render stubs when declared file is missing', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const layout = await loadTestLayout({ cwd: workspace.root });
			const blockDir = path.join('src', 'blocks', 'stub');
			const manifestPath = path.join(blockDir, 'block.json');

			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/stub',
						title: 'Stub Block',
						icon: 'admin-site',
						category: 'widgets',
						editorScript: 'file:./index.js',
						render: 'file:./render.php',
					},
					null,
					2
				)
			);

			const block = makeBlock('demo/stub', blockDir, manifestPath, true);

			const result = await collectBlockManifests({
				workspace,
				blocks: [block],
				roots: {
					generated: layout.resolve('blocks.generated'),
					surfaced: layout.resolve('blocks.applied'),
				},
			});
			const processed = result.get(block.key);
			expect(processed?.renderStub).toBeDefined();
			expect(processed?.renderStub?.target.absolutePath).toBe(
				path.join(root, blockDir, 'render.php')
			);
			expect(processed?.renderStub?.target.relativePath).toBe(
				'src/blocks/stub/render.php'
			);
			expect(processed?.warnings).toContain(
				'Block "demo/stub": render file declared in manifest was missing; created stub at src/blocks/stub/render.php.'
			);
		});
	});

	it('creates fallback stubs when manifest omits render metadata', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const layout = await loadTestLayout({ cwd: workspace.root });
			const blockDir = path.join('src', 'blocks', 'fallback');
			const manifestPath = path.join(blockDir, 'block.json');

			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/fallback',
						title: 'Fallback Block',
						icon: 'welcome-view-site',
						category: 'widgets',
						editorScript: 'file:./index.js',
					},
					null,
					2
				)
			);

			const block = makeBlock(
				'demo/fallback',
				blockDir,
				manifestPath,
				true
			);

			const result = await collectBlockManifests({
				workspace,
				blocks: [block],
				roots: {
					generated: layout.resolve('blocks.generated'),
					surfaced: layout.resolve('blocks.applied'),
				},
			});
			const processed = result.get(block.key);
			expect(processed?.renderStub?.target.absolutePath).toBe(
				path.join(root, blockDir, 'render.php')
			);
			expect(processed?.manifestEntry?.render).toBe(
				'src/blocks/fallback/render.php'
			);
			expect(processed?.warnings).toContain(
				'Block "demo/fallback": render template was not declared and none was found; created stub at src/blocks/fallback/render.php.'
			);
		});
	});

	it('omits render metadata when manifest declares a PHP callback', async () => {
		await withWorkspace(async ({ workspace }) => {
			const layout = await loadTestLayout({ cwd: workspace.root });
			const blockDir = path.join('src', 'blocks', 'callback');
			const manifestPath = path.join(blockDir, 'block.json');

			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/callback',
						title: 'Callback Block',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'file:./index.js',
						render: 'demo_callback_render',
					},
					null,
					2
				)
			);

			const block = makeBlock(
				'demo/callback',
				blockDir,
				manifestPath,
				true
			);

			const result = await collectBlockManifests({
				workspace,
				blocks: [block],
				roots: {
					generated: layout.resolve('blocks.generated'),
					surfaced: layout.resolve('blocks.applied'),
				},
			});
			const processed = result.get(block.key);
			expect(processed?.manifestEntry).toEqual({
				directory: 'src/blocks/callback',
				manifest: 'src/blocks/callback/block.json',
			});
			expect(processed?.renderPath).toBeUndefined();
			expect(processed?.renderStub).toBeUndefined();
		});
	});

	it('refreshes cached manifest data when the manifest file changes', async () => {
		await withWorkspace(async ({ workspace }) => {
			const layout = await loadTestLayout({ cwd: workspace.root });
			const blockDir = path.join('src', 'blocks', 'cache');
			const manifestPath = path.join(blockDir, 'block.json');

			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/cache',
						title: 'Initial Title',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'file:./index.js',
					},
					null,
					2
				)
			);

			const block = makeBlock('demo/cache', blockDir, manifestPath, true);

			const first = await collectBlockManifests({
				workspace,
				blocks: [block],
				roots: {
					generated: layout.resolve('blocks.generated'),
					surfaced: layout.resolve('blocks.applied'),
				},
			});

			expect(first.get(block.key)?.manifestObject?.title).toBe(
				'Initial Title'
			);

			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/cache',
						title: 'Updated Title',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'file:./index.js',
					},
					null,
					2
				)
			);

			const second = await collectBlockManifests({
				workspace,
				blocks: [block],
				roots: {
					generated: layout.resolve('blocks.generated'),
					surfaced: layout.resolve('blocks.applied'),
				},
			});

			expect(second.get(block.key)?.manifestObject?.title).toBe(
				'Updated Title'
			);
		});
	});

	it('refreshes cached render data when a render file materialises', async () => {
		await withWorkspace(async ({ workspace, root }) => {
			const layout = await loadTestLayout({ cwd: workspace.root });
			const blockDir = path.join('src', 'blocks', 'render');
			const manifestPath = path.join(blockDir, 'block.json');
			const renderPath = path.join(blockDir, 'render.php');

			await workspace.write(
				manifestPath,
				JSON.stringify(
					{
						name: 'demo/render',
						title: 'Render Cache',
						icon: 'smiley',
						category: 'widgets',
						editorScript: 'file:./index.js',
						render: 'file:./render.php',
					},
					null,
					2
				)
			);

			const block = makeBlock(
				'demo/render',
				blockDir,
				manifestPath,
				true
			);

			const first = await collectBlockManifests({
				workspace,
				blocks: [block],
				roots: {
					generated: layout.resolve('blocks.generated'),
					surfaced: layout.resolve('blocks.applied'),
				},
			});
			const firstProcessed = first.get(block.key);
			expect(firstProcessed?.renderStub?.target.absolutePath).toBe(
				path.join(root, renderPath)
			);
			expect(firstProcessed?.warnings).toContain(
				'Block "demo/render": render file declared in manifest was missing; created stub at src/blocks/render/render.php.'
			);

			await workspace.write(renderPath, '<?php echo "render";\n');

			const second = await collectBlockManifests({
				workspace,
				blocks: [block],
				roots: {
					generated: layout.resolve('blocks.generated'),
					surfaced: layout.resolve('blocks.applied'),
				},
			});
			const secondProcessed = second.get(block.key);
			expect(secondProcessed?.renderStub).toBeUndefined();
			expect(secondProcessed?.warnings).not.toContain(
				'Block "demo/render": render file declared in manifest was missing; created stub at src/blocks/render/render.php.'
			);
			expect(secondProcessed?.renderPath).toEqual({
				absolutePath: path.join(root, renderPath),
				relativePath: 'src/blocks/render/render.php',
			});
		});
	});
});
