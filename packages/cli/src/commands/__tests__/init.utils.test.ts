import path from 'node:path';
import { createMockFs, type MockFs } from '@cli-tests/mocks';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';

jest.mock('node:fs/promises', () => createMockFs());
const fsMock = jest.requireMock('node:fs/promises') as MockFs;
import {
	buildComposerPackageName,
	buildPhpNamespace,
	ensureTrailingNewline,
	fileExists,
	formatPathsForTemplate,
	resolvePathAliasEntries,
	shouldPreferRegistryVersions,
	slugify,
} from '../init/utils';

describe('init utils', () => {
	afterEach(() => {
		jest.clearAllMocks();
		fsMock.files.clear();
	});

	it('slugifies values and falls back when input is empty', () => {
		expect(slugify('Demo Project')).toBe('demo-project');
		expect(slugify('   ')).toBe('wpkernel-project');
	});

	it('builds composer package name using slugified namespace', () => {
		expect(buildComposerPackageName('Acme Example')).toBe(
			'acme-example/acme-example'
		);
	});

	it('builds php namespaces with trailing separators', () => {
		expect(buildPhpNamespace('Acme Example')).toBe('AcmeExample\\\\');
		expect(buildPhpNamespace('   ')).toBe('WPKernelProject\\\\');
	});

	it('ensures output always contains a trailing newline', () => {
		expect(ensureTrailingNewline('line')).toBe('line\n');
		expect(ensureTrailingNewline('line\n')).toBe('line\n');
	});

	it('prefers registry versions when flag or env request it', () => {
		expect(
			shouldPreferRegistryVersions({ cliFlag: true, env: undefined })
		).toBe(true);
		expect(
			shouldPreferRegistryVersions({ cliFlag: false, env: undefined })
		).toBe(false);
		expect(
			shouldPreferRegistryVersions({ cliFlag: false, env: ' true ' })
		).toBe(true);
		expect(shouldPreferRegistryVersions({ cliFlag: false, env: '0' })).toBe(
			false
		);
	});

	it('checks workspace file existence and surfaces missing files', async () => {
		const workspace = makeWorkspaceMock({
			resolve: jest.fn((relative: string) =>
				path.join('/tmp/project', relative)
			),
		});

		const accessMock = fsMock.access as jest.MockedFunction<
			typeof fsMock.access
		>;
		fsMock.files.set(
			path.join('/tmp/project', 'wpk.config.ts'),
			Buffer.alloc(0)
		);
		accessMock.mockImplementation(async (target) => {
			if (!fsMock.files.has(target.toString())) {
				const error = new Error('missing') as NodeJS.ErrnoException;
				error.code = 'ENOENT';
				throw error;
			}
		});

		await expect(fileExists(workspace, 'wpk.config.ts')).resolves.toBe(
			true
		);
		await expect(fileExists(workspace, 'src/index.ts')).resolves.toBe(
			false
		);

		expect(accessMock).toHaveBeenNthCalledWith(
			1,
			path.join('/tmp/project', 'wpk.config.ts')
		);
		expect(accessMock).toHaveBeenNthCalledWith(
			2,
			path.join('/tmp/project', 'src/index.ts')
		);
	});

	it('rethrows unexpected fs errors when checking file existence', async () => {
		const workspace = makeWorkspaceMock({
			resolve: jest.fn((relative: string) =>
				path.join('/tmp/project', relative)
			),
		});

		const failure = Object.assign(new Error('permission denied'), {
			code: 'EACCES',
		});

		const accessMock = fsMock.access as jest.MockedFunction<
			typeof fsMock.access
		>;
		accessMock.mockRejectedValue(failure);

		await expect(fileExists(workspace, 'wpk.config.ts')).rejects.toBe(
			failure
		);
	});

	it('resolves repository-aware path alias entries when workspace sits in monorepo', async () => {
		const workspaceRoot = path.join('/repo', 'projects', 'demo');
		const repoRoot = '/repo';
		const accessible = new Set([
			path.join(repoRoot, 'pnpm-workspace.yaml'),
			path.join(repoRoot, 'packages', 'core', 'src', 'index.ts'),
			path.join(repoRoot, 'packages', 'core', 'src'),
			path.join(repoRoot, 'packages', 'cli', 'src', 'index.ts'),
			path.join(repoRoot, 'packages', 'cli', 'src'),
			path.join(repoRoot, 'packages', 'e2e-utils', 'src', 'index.ts'),
			path.join(repoRoot, 'packages', 'e2e-utils', 'src'),
			path.join(repoRoot, 'tests', 'test-utils'),
		]);

		const accessMock = fsMock.access as jest.MockedFunction<
			typeof fsMock.access
		>;
		for (const entry of accessible) {
			// Seed the mock fs so pathExists (stat) resolves these entries.
			fsMock.files.set(path.resolve(entry), Buffer.from('ok'));
		}
		accessMock.mockImplementation(async (target) => {
			const resolved = target.toString();
			if (accessible.has(resolved)) {
				return undefined;
			}

			const error = new Error('not found') as NodeJS.ErrnoException;
			error.code = 'ENOENT';
			throw error;
		});

		const entries = await resolvePathAliasEntries(workspaceRoot);

		expect(entries).toEqual(
			expect.arrayContaining([
				['@/*', ['./src/*']],
				['@wpkernel/core', ['../../packages/core/src/index.ts']],
				['@wpkernel/core/*', ['../../packages/core/src/*']],
				['@wpkernel/cli', ['../../packages/cli/src/index.ts']],
				['@wpkernel/cli/*', ['../../packages/cli/src/*']],
				[
					'@wpkernel/e2e-utils',
					['../../packages/e2e-utils/src/index.ts'],
				],
				['@wpkernel/e2e-utils/*', ['../../packages/e2e-utils/src/*']],
				['@test-utils/*', ['../../tests/test-utils/*']],
			])
		);
	});

	it('falls back to workspace defaults when repository markers are missing', async () => {
		const accessMock = fsMock.access as jest.MockedFunction<
			typeof fsMock.access
		>;
		accessMock.mockRejectedValue(
			Object.assign(new Error('missing'), { code: 'ENOENT' })
		);

		await expect(resolvePathAliasEntries('/tmp/project')).resolves.toEqual([
			['@/*', ['./src/*']],
		]);
	});

	it('formats template path replacements with deterministic ordering', () => {
		const formatted = formatPathsForTemplate([
			['@custom/*', ['../custom/*']],
			['@/*', ['./src/*']],
			['@wpkernel/core', ['./packages/core/src/index.ts']],
		]);

		expect(formatted).toMatchInlineSnapshot(`
"{\n                        \"@/*\": [\"./src/*\"],\n                        \"@custom/*\": [\"../custom/*\"],\n                        \"@wpkernel/core\": [\"./packages/core/src/index.ts\"]\n                }"
`);
	});

	it('prints an empty object when no path entries are available', () => {
		expect(formatPathsForTemplate([])).toBe(
			'{' + '\n                ' + '}'
		);
	});
});
