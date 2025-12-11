import fs from 'node:fs/promises';
import path from 'node:path';
import {
	resolveBlockPath,
	toWorkspaceRelative,
	resolveBlockRoots,
} from '../../shared.blocks.paths';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { makeIr } from '@cli-tests/ir.test-support';

describe('shared.blocks.paths helpers', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	function makeRoots() {
		const ir = makeIr();
		// Ensure block artifacts exist so resolveBlockRoots returns non-null.
		ir.artifacts.blocks = {
			demo: {
				key: 'demo',
				appliedDir: ir.artifacts.blockRoots.applied,
				generatedDir: ir.artifacts.blockRoots.generated,
				jsonPath: '',
				tsEntry: '',
				tsView: '',
				tsHelper: '',
				mode: 'js',
				phpRenderPath: undefined,
			},
		};
		return resolveBlockRoots(ir)!;
	}

	it('returns workspace-resolved path when outside generated root', async () => {
		const roots = makeRoots();
		const workspace = makeWorkspaceMock({
			root: '/repo',
			resolve: (...p: string[]) => path.join('/repo', ...p),
		});
		const result = await resolveBlockPath(
			workspace as any,
			'src/blocks/post/block.json',
			{
				generated: roots.generated,
				surfaced: roots.surfaced,
			}
		);
		expect(result.relative).toBe('src/blocks/post/block.json');
		expect(result.absolute).toBe(
			path.join('/repo', 'src/blocks/post/block.json')
		);
	});

	it('maps generated block to surfaced path when it exists', async () => {
		const roots = makeRoots();
		jest.spyOn(fs, 'stat').mockResolvedValue({
			isFile: () => true,
		} as any);
		const workspace = makeWorkspaceMock({
			root: '/repo',
			resolve: (...p: string[]) => path.join('/repo', ...p),
		});
		const result = await resolveBlockPath(
			workspace as any,
			path.join(roots.generated, 'demo/block.json'),
			{
				generated: roots.generated,
				surfaced: roots.surfaced,
			}
		);
		const expectedRelative = path.posix.join(
			roots.surfaced,
			'demo/block.json'
		);
		expect(result.relative).toBe(expectedRelative);
		expect(result.absolute).toBe(path.join('/repo', expectedRelative));
	});

	it('falls back to generated path when surfaced file is missing', async () => {
		const roots = makeRoots();
		jest.spyOn(fs, 'stat').mockRejectedValue(
			Object.assign(new Error('nope'), { code: 'ENOENT' })
		);
		const workspace = makeWorkspaceMock({
			root: '/repo',
			resolve: (...p: string[]) => path.join('/repo', ...p),
		});
		const result = await resolveBlockPath(
			workspace as any,
			path.join(roots.generated, 'demo/block.json'),
			{
				generated: roots.generated,
				surfaced: roots.surfaced,
			}
		);
		expect(result.relative).toBe(
			path.join(roots.generated, 'demo/block.json')
		);
	});

	it('leaves paths unchanged when generated suffix escapes root', async () => {
		const roots = makeRoots();
		const workspace = makeWorkspaceMock({
			root: '/repo',
			resolve: (...p: string[]) => path.join('/repo', ...p),
		});
		const result = await resolveBlockPath(
			workspace as any,
			path.join(roots.generated, '../outside/block.json'),
			{
				generated: roots.generated,
				surfaced: roots.surfaced,
			}
		);
		expect(result.relative).toBe(
			path.join(roots.generated, '../outside/block.json')
		);
	});

	it('toWorkspaceRelative normalises separators and root', () => {
		const workspace = makeWorkspaceMock({ root: '/repo' });
		expect(toWorkspaceRelative(workspace as any, '/repo')).toBe('.');
		expect(
			toWorkspaceRelative(
				workspace as any,
				path.join('/repo', 'blocks', 'auto-register.ts')
			).replace(/\\/g, '/')
		).toBe('blocks/auto-register.ts');
	});
});
