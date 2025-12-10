import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { buildWorkspace } from '../filesystem';

async function withWorkspace<T>(run: (root: string) => Promise<T>): Promise<T> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-test-'));
	try {
		return await run(root);
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

describe('filesystem workspace', () => {
	it('reads and writes files relative to the workspace root', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await workspace.write('nested/file.txt', 'hello world');
			const contents = await workspace.readText('nested/file.txt');
			expect(contents).toBe('hello world');
			expect(await workspace.exists('nested/file.txt')).toBe(true);
		});
	});

	it('rolls back transactional changes', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			workspace.begin('tx');
			await workspace.write('rollback.txt', 'temporary');
			const manifest = await workspace.rollback('tx');

			expect(manifest.writes).toContain('rollback.txt');
			expect(await workspace.exists('rollback.txt')).toBe(false);
		});
	});

	it('exposes dry-run manifests without persisting writes', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			const { manifest } = await workspace.dryRun(async () => {
				await workspace.write('one.txt', '1');
				await workspace.write('two.txt', '2');
			});

			expect(manifest.writes).toEqual(['one.txt', 'two.txt']);
			expect(await workspace.exists('one.txt')).toBe(false);
			expect(await workspace.exists('two.txt')).toBe(false);
		});
	});

	it('performs simple three-way merges and signals conflicts', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await workspace.write('merge.txt', 'current');

			const clean = await workspace.threeWayMerge(
				'merge.txt',
				'base',
				'current',
				'incoming'
			);
			expect(clean).toBe('conflict');
			const merged = await workspace.readText('merge.txt');
			expect(merged).toContain('<<<<<<< CURRENT');
			expect(merged).toContain('>>>>>>> INCOMING');

			const cleanResult = await workspace.threeWayMerge(
				'merge.txt',
				'incoming',
				'incoming',
				'incoming'
			);
			expect(cleanResult).toBe('clean');
		});
	});

	it('commits transactional changes and exposes manifests', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			workspace.begin('commit-test');
			await workspace.writeJson(
				'data.json',
				{ ok: true },
				{ pretty: true }
			);
			const manifest = await workspace.commit('commit-test');

			expect(manifest.writes).toContain('data.json');
			const raw = await workspace.readText('data.json');
			expect(raw).toContain(`{
  "ok": true
}`);
		});
	});

	it('removes directories recursively and restores them on rollback', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await workspace.write('nested/dir/file.txt', 'present');
			workspace.begin('remove');
			await workspace.rm('nested', { recursive: true });
			const manifest = await workspace.rollback('remove');

			expect(manifest.deletes).toContain('nested');
			const restored = await workspace.readText('nested/dir/file.txt');
			expect(restored).toBe('present');
		});
	});

	it('provides tmpDir helpers', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			const tmp = await workspace.tmpDir('next-workspace-');
			expect(typeof tmp).toBe('string');
			expect(tmp.length).toBeGreaterThan(0);
		});
	});

	it('supports glob matching and resolution utilities', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await workspace.write('glob/target.txt', 'ok');
			await workspace.write('glob/other.md', 'skip');

			const matches = await workspace.glob('glob/*.txt');
			expect(matches.some((entry) => entry.endsWith('target.txt'))).toBe(
				true
			);
			expect(workspace.resolve('glob')).toBe(path.join(root, 'glob'));
		});
	});

	it('writes buffers and respects ensureDir overrides', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			const buffer = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
			await workspace.write('bin/file.dat', buffer);
			const disk = await workspace.read('bin/file.dat');
			expect(disk).toEqual(buffer);

			await expect(
				workspace.write('bin/nested/file.txt', 'data', {
					ensureDir: false,
				})
			).rejects.toHaveProperty('code', 'ENOENT');
		});
	});

	it('handles deletes for missing paths without throwing', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await expect(
				workspace.rm('does-not-exist.txt')
			).resolves.toBeUndefined();
		});
	});

	it('rolls back dry-run scopes when the callback throws', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await expect(
				workspace.dryRun(async () => {
					await workspace.write('transient.txt', 'temp');
					throw new Error('boom');
				})
			).rejects.toThrow('boom');

			expect(await workspace.exists('transient.txt')).toBe(false);
		});
	});

	it('guards against mismatched commit labels', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			workspace.begin('expected');
			await expect(workspace.commit('other')).rejects.toThrow(
				/Attempted to commit transaction/
			);
		});
	});

	it('throws when committing or rolling back without an active transaction', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);

			await expect(workspace.commit()).rejects.toThrow(
				/Attempted to commit workspace transaction/
			);
			await expect(workspace.rollback()).rejects.toThrow(
				/Attempted to rollback workspace transaction/
			);
		});
	});

	it('guards against mismatched rollback labels', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await workspace.write('data.txt', 'original');
			workspace.begin('expected');
			await workspace.write('data.txt', 'mutated');

			await expect(workspace.rollback('other')).rejects.toThrow(
				/Attempted to rollback transaction/
			);

			// File stays mutated because rollback is aborted.
			const persisted = await workspace.readText('data.txt');
			expect(persisted).toBe('mutated');
		});
	});

	it('preserves original content when writing the same file multiple times in a transaction', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await workspace.write('repeat.txt', 'original');

			workspace.begin('multi-write');
			await workspace.write('repeat.txt', 'first-change');
			await workspace.write('repeat.txt', 'second-change');
			const manifest = await workspace.rollback('multi-write');

			expect(manifest.writes).toEqual(['repeat.txt']);
			const restored = await workspace.readText('repeat.txt');
			expect(restored).toBe('original');
		});
	});

	it('treats base equalities as clean outcomes in three-way merges', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await workspace.write('merge-base.txt', 'current');

			const baseMatchesCurrent = await workspace.threeWayMerge(
				'merge-base.txt',
				'shared',
				'shared',
				'incoming'
			);
			expect(baseMatchesCurrent).toBe('clean');
			expect(await workspace.readText('merge-base.txt')).toBe('incoming');

			const baseMatchesIncoming = await workspace.threeWayMerge(
				'merge-base.txt',
				'incoming',
				'retained',
				'incoming'
			);
			expect(baseMatchesIncoming).toBe('clean');
			expect(await workspace.readText('merge-base.txt')).toBe('retained');
		});
	});

	it('treats trimmed matches as clean merges when whitespace differs', async () => {
		await withWorkspace(async (root) => {
			const workspace = buildWorkspace(root);
			await workspace.write('merge-trim.txt', 'value\n');

			const status = await workspace.threeWayMerge(
				'merge-trim.txt',
				'base',
				'value\n',
				'value'
			);

			expect(status).toBe('clean');
			expect(await workspace.readText('merge-trim.txt')).toBe('value\n');
		});
	});
});
