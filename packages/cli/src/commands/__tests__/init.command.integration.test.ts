import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@cli-tests/cli';
import { createWorkspaceRunner } from '@cli-tests/workspace.test-support';
import { buildInitCommand } from '../init';

const TMP_PREFIX = path.join(os.tmpdir(), 'wpk-next-init-command-');

const withWorkspace = createWorkspaceRunner({ prefix: TMP_PREFIX });

async function createCommand(workspace: string) {
	const moduleUrl = pathToFileURL(
		path.join(__dirname, '../../../templates/init/wpk.config.ts')
	).href;
	(globalThis as { __WPK_CLI_MODULE_URL__?: string }).__WPK_CLI_MODULE_URL__ =
		moduleUrl;

	const InitCommand = buildInitCommand();
	const command = new InitCommand();
	const { stdout, stderr, context } = assignCommandContext(command, {
		cwd: workspace,
	});

	return { command, stdout, stderr, context };
}

describe('InitCommand', () => {
	afterEach(() => {
		delete (globalThis as { __WPK_CLI_MODULE_URL__?: string })
			.__WPK_CLI_MODULE_URL__;
	});

	it('scaffolds project files with recommended defaults', async () => {
		await withWorkspace(async (workspace) => {
			const { command, stdout } = await createCommand(workspace);
			command.name = 'jobs-plugin';

			const exit = await command.execute();
			expect(exit).toBe(WPK_EXIT_CODES.SUCCESS);
			const summary = stdout.toString();
			expect(summary).toContain(
				'created plugin scaffold for jobs-plugin'
			);
			expect(summary).toContain('created wpk.config.ts');
			expect(summary).toContain('created src/index.ts');
			expect(summary).toContain('created tsconfig.json');
			expect(summary).toContain('created jsconfig.json');
			expect(summary).toContain('created eslint.config.js');
			expect(summary).toContain('created vite.config.ts');
			expect(summary).toContain('created package.json');
			expect(summary).toContain('created composer.json');
			expect(summary).toContain('created plugin.php');
			expect(summary).toContain('created inc/.gitkeep');

			const wpkConfig = await fs.readFile(
				path.join(workspace, 'wpk.config.ts'),
				'utf8'
			);
			expect(wpkConfig).toContain("namespace: 'jobs-plugin'");
			expect(wpkConfig).toContain(
				'WPKernel configuration for your project.'
			);

			const indexFile = await fs.readFile(
				path.join(workspace, 'src/index.ts'),
				'utf8'
			);
			expect(indexFile).toContain('bootstrapKernel');
			expect(indexFile).toContain('registerGeneratedBlocks');

			const tsconfig = JSON.parse(
				await fs.readFile(path.join(workspace, 'tsconfig.json'), 'utf8')
			);
			expect(tsconfig.compilerOptions).toMatchObject({
				moduleResolution: 'Bundler',
				strict: true,
				jsxImportSource: 'react',
			});
			expect(tsconfig.compilerOptions.paths).toEqual({
				'@/*': ['./src/*'],
			});

			const jsconfig = JSON.parse(
				await fs.readFile(path.join(workspace, 'jsconfig.json'), 'utf8')
			);
			expect(jsconfig.compilerOptions.paths).toEqual({
				'@/*': ['./src/*'],
			});

			const packageJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'package.json'), 'utf8')
			);
			expect(packageJson).toMatchObject({
				name: 'jobs-plugin',
				private: true,
				type: 'module',
				scripts: {
					start: 'wpk start',
					build: 'wpk build',
					generate: 'wpk generate',
					apply: 'wpk apply',
				},
			});
			expect(packageJson.devDependencies).toMatchObject({
				'@wpkernel/cli': expect.any(String),
				tsx: expect.any(String),
			});

			const composerJson = JSON.parse(
				await fs.readFile(path.join(workspace, 'composer.json'), 'utf8')
			);
			expect(composerJson).toMatchObject({
				name: 'jobs-plugin/jobs-plugin',
				autoload: {
					'psr-4': {
						'JobsPlugin\\': 'inc/',
					},
				},
			});

			const pluginLoader = await fs.readFile(
				path.join(workspace, 'plugin.php'),
				'utf8'
			);
			expect(pluginLoader).toContain('Plugin Name: Jobs Plugin');
			expect(pluginLoader).toContain('function bootstrap_wpk(): void');
		});
	});

	it('fails when files already exist without --force', async () => {
		await withWorkspace(async (workspace) => {
			await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
			await fs.writeFile(
				path.join(workspace, 'wpk.config.ts'),
				'export {};\n',
				'utf8'
			);

			const { command, stderr } = await createCommand(workspace);

			const exit = await command.execute();

			expect(exit).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			expect(stderr.toString()).toContain('Conflicting files');
		});
	});
});
