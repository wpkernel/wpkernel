import os from 'node:os';
import path from 'node:path';
import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

type PackMetadata = {
	readonly filename: string;
	readonly files: ReadonlyArray<{ readonly path: string }>;
};

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(
	__dirname,
	'..',
	'..',
	'..',
	'..',
	'..',
	'..',
	'..'
);

describe('php-json-ast tarball audit', () => {
	jest.setTimeout(120_000);

	it('includes the pretty-print asset in the packed tarball', async () => {
		const packDestination = await mkdtemp(
			path.join(os.tmpdir(), 'wpk-php-json-ast-pack-')
		);
		const distDir = path.join(
			PROJECT_ROOT,
			'packages',
			'php-json-ast',
			'dist'
		);
		const distEntry = path.join(distDir, 'index.js');
		let createdDist = false;

		try {
			await access(distEntry).catch(
				async (error: NodeJS.ErrnoException) => {
					if (error?.code !== 'ENOENT') {
						throw error;
					}

					await mkdir(distDir, { recursive: true });
					await writeFile(distEntry, 'export {};\n', 'utf8');
					createdDist = true;
				}
			);

			const { stdout } = await execFileAsync(
				'pnpm',
				[
					'--filter',
					'@wpkernel/php-json-ast',
					'pack',
					'--pack-destination',
					packDestination,
					'--json',
				],
				{
					cwd: PROJECT_ROOT,
					env: { ...process.env, CI: '1' },
				}
			);

			const payload = stdout.trim();
			expect(payload.length).toBeGreaterThan(0);

			const metadata = JSON.parse(payload) as PackMetadata;

			expect(metadata.filename).toBeTruthy();
			expect(Array.isArray(metadata.files)).toBe(true);

			const fileListing = metadata.files.map((entry) => entry.path);
			expect(fileListing).toContain('php/pretty-print.php');
			expect(fileListing).toContain('php/ingest-program.php');

			const tarballPath = path.isAbsolute(metadata.filename)
				? metadata.filename
				: path.join(packDestination, metadata.filename);

			const { stdout: tarOutput } = await execFileAsync('tar', [
				'-tf',
				tarballPath,
			]);
			const tarEntries = tarOutput
				.trim()
				.split('\n')
				.filter((value) => value.length > 0);

			expect(tarEntries).toContain('package/php/pretty-print.php');
			expect(tarEntries).toContain('package/php/ingest-program.php');
			expect(tarEntries).toContain('package/dist/index.js');
		} finally {
			if (createdDist) {
				await rm(distDir, { recursive: true, force: true });
			}
			await rm(packDestination, { recursive: true, force: true });
		}
	});
});
