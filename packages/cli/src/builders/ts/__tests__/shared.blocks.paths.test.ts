import fs from 'node:fs/promises';
import path from 'node:path';
import {
	resolveBlockPath,
	toWorkspaceRelative,
} from '../../shared.blocks.paths';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';

describe('shared.blocks.paths helpers', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('returns workspace-resolved path when outside generated root', async () => {
		const layout = loadTestLayoutSync();
		const workspace = makeWorkspaceMock({
			root: '/repo',
			resolve: (...p: string[]) => path.join('/repo', ...p),
		});
		const result = await resolveBlockPath(
			workspace as any,
			'src/blocks/post/block.json',
			{
				generated: layout.resolve('blocks.generated'),
				surfaced: layout.resolve('blocks.applied'),
			}
		);
		expect(result.relative).toBe('src/blocks/post/block.json');
		expect(result.absolute).toBe(
			path.join('/repo', 'src/blocks/post/block.json')
		);
	});

	it('maps generated block to surfaced path when it exists', async () => {
		const layout = loadTestLayoutSync();
		jest.spyOn(fs, 'stat').mockResolvedValue({
			isFile: () => true,
		} as any);
		const workspace = makeWorkspaceMock({
			root: '/repo',
			resolve: (...p: string[]) => path.join('/repo', ...p),
		});
		const result = await resolveBlockPath(
			workspace as any,
			path.join(layout.resolve('blocks.generated'), 'demo/block.json'),
			{
				generated: layout.resolve('blocks.generated'),
				surfaced: layout.resolve('blocks.applied'),
			}
		);
		expect(result.relative).toBe('src/blocks/demo/block.json');
		expect(result.absolute).toBe(
			path.join('/repo', 'src/blocks/demo/block.json')
		);
	});

	it('falls back to generated path when surfaced file is missing', async () => {
		const layout = loadTestLayoutSync();
		jest.spyOn(fs, 'stat').mockRejectedValue(
			Object.assign(new Error('nope'), { code: 'ENOENT' })
		);
		const workspace = makeWorkspaceMock({
			root: '/repo',
			resolve: (...p: string[]) => path.join('/repo', ...p),
		});
		const result = await resolveBlockPath(
			workspace as any,
			path.join(layout.resolve('blocks.generated'), 'demo/block.json'),
			{
				generated: layout.resolve('blocks.generated'),
				surfaced: layout.resolve('blocks.applied'),
			}
		);
		expect(result.relative).toBe(
			path.join(layout.resolve('blocks.generated'), 'demo/block.json')
		);
	});

	it('leaves paths unchanged when generated suffix escapes root', async () => {
		const layout = loadTestLayoutSync();
		const workspace = makeWorkspaceMock({
			root: '/repo',
			resolve: (...p: string[]) => path.join('/repo', ...p),
		});
		const result = await resolveBlockPath(
			workspace as any,
			path.join(
				layout.resolve('blocks.generated'),
				'../outside/block.json'
			),
			{
				generated: layout.resolve('blocks.generated'),
				surfaced: layout.resolve('blocks.applied'),
			}
		);
		expect(result.relative).toBe(
			path.join(
				layout.resolve('blocks.generated'),
				'../outside/block.json'
			)
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
