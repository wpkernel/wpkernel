import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import { resolveFromWorkspace, toWorkspaceRelative } from '../path';

describe('utils/path', () => {
	it('resolveFromWorkspace resolves relative to process.cwd()', () => {
		const segs = ['packages', 'cli', 'README.md'];
		const expected = path.resolve(process.cwd(), ...segs);
		expect(resolveFromWorkspace(process.cwd(), ...segs)).toBe(expected);
	});

	it('toWorkspaceRelative returns workspace-relative path for internal paths', () => {
		const fileInWorkspace = path.join(
			process.cwd(),
			'packages',
			'cli',
			'README.md'
		);
		const rel = toWorkspaceRelative(process.cwd(), fileInWorkspace);
		// should be relative and not start with '..'
		expect(rel).not.toMatch(/^\.\./);
		expect(rel).toMatch(/packages\/cli\/README\.md$/);
	});

	it('toWorkspaceRelative returns absolute path when target is outside workspace', async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), 'wpk-path-test-')
		);
		const outsideFile = path.join(tmpDir, 'outside.txt');
		await fs.writeFile(outsideFile, 'x', 'utf8');

		try {
			const res = toWorkspaceRelative(process.cwd(), outsideFile);
			expect(res).toBe(outsideFile);
		} finally {
			await fs.rm(tmpDir, { recursive: true, force: true });
		}
	});

	it('toWorkspaceRelative returns "." when target is the workspace root', () => {
		const res = toWorkspaceRelative(process.cwd(), process.cwd());
		expect(res).toBe('.');
	});
});
