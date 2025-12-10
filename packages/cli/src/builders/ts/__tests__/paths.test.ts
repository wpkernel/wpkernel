import path from 'node:path';
import { toWorkspaceRelative } from '../../shared.blocks.paths';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';

describe('shared.blocks.paths', () => {
	it('normalises relative paths against workspace root', () => {
		const workspace = makeWorkspaceMock({ root: '/project' });
		expect(
			toWorkspaceRelative(workspace as any, '/project/src/file.ts')
		).toBe('src/file.ts');
		expect(toWorkspaceRelative(workspace as any, 'src/file.ts')).toBe(
			'src/file.ts'
		);
	});

	it('returns "." when resolving workspace root', () => {
		const workspace = makeWorkspaceMock({ root: '/project' });
		expect(toWorkspaceRelative(workspace as any, '/project')).toBe('.');
		expect(toWorkspaceRelative(workspace as any, '.')).toBe('.');
	});

	it('handles different separators consistently', () => {
		const workspace = makeWorkspaceMock({ root: 'C:\\repo' });
		const absolute = path.join('C:\\repo', 'blocks', 'auto-register.ts');
		expect(
			toWorkspaceRelative(workspace as any, absolute).replace(/\\/g, '/')
		).toContain('blocks/auto-register.ts');
	});
});
