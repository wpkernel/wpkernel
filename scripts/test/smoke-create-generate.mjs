#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir, mkdtemp, mkdir, rm, stat, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(
	fileURLToPath(new URL('../../', import.meta.url))
);
const artifactsDir = path.join(repoRoot, 'artifacts', 'cli-smoke');
const rawArgs = process.argv.slice(2);
const packageManagers = parsePackageManagers(rawArgs);
const cliArgs = new Set(
	rawArgs.filter((arg) => !arg.startsWith('--package-managers='))
);
const keepWorkspace = cliArgs.has('--keep-workspace');
const cleanArtifacts = cliArgs.has('--clean-artifacts');
const buildArtifacts = cliArgs.has('--build-packages');
const smokeVerbose =
	cliArgs.has('--verbose') || process.env.WPK_SMOKE_VERBOSE === '1';

await mkdir(artifactsDir, { recursive: true });

const smokeRoot = await mkdtemp(path.join(os.tmpdir(), 'wpk-smoke-'));
const projectDir = path.join(smokeRoot, 'wpk-smoke-project');

const summary = {
	projectDir,
	artifacts: [],
	projects: [],
};
const tarballs = new Map();
const REQUIRED_PACKAGES = [
	{
		name: '@wpkernel/cli',
		distFile: 'packages/cli/dist/index.js',
	},
	{
		name: '@wpkernel/create-wpk',
		distFile: 'packages/create-wpk/dist/index.js',
	},
	{
		name: '@wpkernel/php-json-ast',
		distFile: 'packages/php-json-ast/dist/index.js',
	},
	{
		name: '@wpkernel/wp-json-ast',
		distFile: 'packages/wp-json-ast/dist/index.js',
	},
];
const PACKAGE_MANAGER_TOOLS = {
	npm: {
		install: (packages) => [
			'npm',
			'install',
			'--save-dev',
			...packages,
		],
		execWpk: (args) => ['npx', '--yes', 'wpk', ...args],
	},
	pnpm: {
		install: (packages) => ['pnpm', 'add', '-D', ...packages],
		execWpk: (args) => ['pnpm', 'exec', 'wpk', ...args],
	},
	yarn: {
		install: (packages) => ['yarn', 'add', '--dev', ...packages],
		execWpk: (args) => ['yarn', 'wpk', ...args],
	},
};

async function main() {
	let success = false;

	try {
		await ensureLocalBuildArtifacts();
		if (
			buildArtifacts ||
			process.env.WPK_SMOKE_BUILD === '1' ||
			process.env.WPK_SKIP_SMOKE_BUILD === '0'
		) {
			logStep('Building workspace packages');
			await runPnpm(['build:packages'], {
				capture: true,
				quietCapture: !smokeVerbose,
			});
		}

		logStep('Packing tarballs');
		const cliTarball = await packWorkspace('@wpkernel/cli');
		const createTarball = await packWorkspace('@wpkernel/create-wpk');
		const phpJsonAstTarball = await packWorkspace('@wpkernel/php-json-ast');
		const wpJsonAstTarball = await packWorkspace('@wpkernel/wp-json-ast');
		recordTarball('@wpkernel/cli', cliTarball);
		recordTarball('@wpkernel/create-wpk', createTarball);
		recordTarball('@wpkernel/php-json-ast', phpJsonAstTarball);
		recordTarball('@wpkernel/wp-json-ast', wpJsonAstTarball);

		for (const packageManager of packageManagers) {
			const scopedProjectDir =
				packageManagers.length === 1
					? projectDir
					: path.join(projectDir, packageManager);

			summary.projects.push({
				packageManager,
				dir: scopedProjectDir,
			});

			logStep(
				`[${packageManager}] Running create-wpk (scaffold + dependency install)`
			);
			await runLocalCreate(scopedProjectDir, packageManager);
			await initGitRepository(scopedProjectDir);
			await commitWorkspace(scopedProjectDir, 'chore: initial scaffold');

			await snapshotWorkspace(scopedProjectDir, '[smoke] bootstrap');

			logStep(
				`[${packageManager}] Installing CLI tarball and tsx inside scaffold`
			);
			const dependencyTarballs = [
				'@wpkernel/cli',
				'@wpkernel/php-json-ast',
				'@wpkernel/wp-json-ast',
			]
				.map((name) => tarballs.get(name))
				.filter((tarballPath) => typeof tarballPath === 'string');

			await runPackageManagerCommand(
				packageManager,
				'install',
				[...dependencyTarballs, 'tsx@latest'],
				{
					cwd: scopedProjectDir,
					capture: true,
					quietCapture: !smokeVerbose,
				}
			);
			if (!smokeVerbose) {
				console.log(`   ${packageManager} install completed.`);
			}

			const cliEnv = await resolveCliEnv(scopedProjectDir);

			await snapshotWorkspace(
				scopedProjectDir,
				'[smoke] install cli dependencies'
			);

			// Ensure a clean, valid repository before running the CLI.
			await resetGitRepository(scopedProjectDir, 'chore: post-install snapshot');

			logStep(`[${packageManager}] Running "wpk generate" inside scaffold`);
			await runPackageManagerCommand(
				packageManager,
				'execWpk',
				['generate'],
				{ cwd: scopedProjectDir, env: { ...process.env, ...cliEnv } }
			);
			await snapshotWorkspace(
				scopedProjectDir,
				'[smoke] post-generate'
			);

			logStep(`[${packageManager}] Running "wpk apply --yes" inside scaffold`);
			await runPackageManagerCommand(
				packageManager,
				'execWpk',
				['apply', '--yes'],
				{ cwd: scopedProjectDir, env: { ...process.env, ...cliEnv } }
			);
			await snapshotWorkspace(
				scopedProjectDir,
				'[smoke] post-apply'
			);

			// Re-initialise git to avoid any partial object state before reruns.
			await resetGitRepository(scopedProjectDir, 'chore: post-apply snapshot');

			await runPackageManagerCommand(
				packageManager,
				'execWpk',
				['generate'],
				{ cwd: scopedProjectDir, env: { ...process.env, ...cliEnv } }
			);
			await snapshotWorkspace(
				scopedProjectDir,
				'[smoke] post-generate (idempotent)'
			);

			await runPackageManagerCommand(
				packageManager,
				'execWpk',
				['apply', '--yes'],
				{ cwd: scopedProjectDir, env: { ...process.env, ...cliEnv } }
			);
			await snapshotWorkspace(
				scopedProjectDir,
				'[smoke] post-apply (idempotent)'
			);
		}

		success = true;
		logSuccess(summary);
		return summary;
	} finally {
		await cleanup(summary, success);
	}
}

async function cleanup(summary, success) {
	if (!keepWorkspace) {
		await rm(smokeRoot, { recursive: true, force: true });
	} else {
		const preserved =
			summary.projects.length > 0
				? summary.projects
				: [{ packageManager: 'default', dir: summary.projectDir }];
		console.log('\nINFO Preserved temp workspace (--keep-workspace):');
		for (const project of preserved) {
			console.log(`     - [${project.packageManager}] ${project.dir}`);
		}
	}

	if (cleanArtifacts) {
		await rm(artifactsDir, { recursive: true, force: true });
		console.log('\nINFO Removed artifacts directory (--clean-artifacts).');
	} else if (!success && summary.artifacts.length > 0) {
		console.log('\nINFO Packed tarballs are available at:');
		for (const artifact of summary.artifacts) {
			console.log(`     - ${artifact}`);
		}
	}
}

function logStep(message) {
	console.log(`\n>> ${message}`);
}

function logSuccess(summary) {
	console.log('\nSUCCESS Smoke test succeeded.');
	if (summary.projects.length > 0) {
		console.log('   Workspaces:');
		for (const project of summary.projects) {
			console.log(
				`     - [${project.packageManager}] ${project.dir}`
			);
		}
	} else {
		console.log(`   Project workspace: ${summary.projectDir}`);
	}
	console.log('   Tarballs:');
	for (const artifact of summary.artifacts) {
		console.log(`     - ${artifact}`);
	}
	console.log(
		'\nRe-run readiness manually with:\n' +
		`  cd ${summary.projects[0]?.dir ?? summary.projectDir}\n` +
		'  wpk doctor --plan quickstart\n\n' +
		'Or regenerate:\n' +
		`  cd ${summary.projects[0]?.dir ?? summary.projectDir}\n` +
		'  wpk generate\n\n' +
		'Or apply immediately:\n' +
		`  cd ${summary.projects[0]?.dir ?? summary.projectDir}\n` +
		'  wpk apply --yes\n'
	);
}

async function packWorkspace(workspaceName) {
	const { stdout } = await runPnpm(
		['--filter', workspaceName, 'pack', '--pack-destination', artifactsDir],
		{
			cwd: repoRoot,
			capture: true,
			quietCapture: !smokeVerbose,
			env: {
				...process.env,
				PNPM_LOG_LEVEL: 'silent',
			},
		}
	);

	const tarballPath = extractTarballFromStdout(stdout);
	if (tarballPath) {
		return tarballPath;
	}

	const candidates = (await readdir(artifactsDir)).filter((file) =>
		file.endsWith('.tgz')
	);

	if (candidates.length === 0) {
		throw new Error(`pnpm pack produced no tarball for ${workspaceName}`);
	}

	const withTime = await Promise.all(
		candidates.map(async (file) => {
			const filePath = path.join(artifactsDir, file);
			const fileStat = await stat(filePath);
			return { filePath, mtime: fileStat.mtimeMs };
		})
	);

	withTime.sort((a, b) => b.mtime - a.mtime);
	return withTime[0]?.filePath ?? path.join(artifactsDir, candidates[0]);
}

function recordTarball(name, tarballPath) {
	tarballs.set(name, tarballPath);
	summary.artifacts.push(tarballPath);
}

async function runPnpm(args, options = {}) {
	return runCommand('pnpm', args, options);
}

async function runNode(scriptPath, args = [], options = {}) {
	return runCommand(process.execPath, [scriptPath, ...args], options);
}

function runCommand(command, args, options = {}) {
	const {
		cwd = repoRoot,
		env = process.env,
		capture = false,
		quietCapture = false,
	} = options;

	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env,
			stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
		});
		let stdout = '';

		if (capture && child.stdout) {
			child.stdout.on('data', (chunk) => {
				const value = chunk.toString();
				stdout += value;
				if (!quietCapture) {
					process.stdout.write(value);
				}
			});
		}

		child.on('error', (error) => {
			reject(error);
		});

		child.on('close', (code, signal) => {
			if (code === 0) {
				resolve(capture ? { stdout } : {});
				return;
			}

			const reason =
				typeof code === 'number'
					? `exit code ${code}`
					: signal
						? `signal ${signal}`
						: 'unknown failure';
			reject(
				new Error(
					`Command "${command} ${args.join(' ')}" failed with ${reason}`
				)
			);
		});
	});
}

async function ensureLocalBuildArtifacts() {
	const missing = [];
	for (const pkg of REQUIRED_PACKAGES) {
		const candidate = path.join(repoRoot, pkg.distFile);
		try {
			await access(candidate);
		} catch {
			missing.push({ pkg: pkg.name, file: candidate });
		}
	}

	if (missing.length === 0) {
		return;
	}

	const messages = missing
		.map((entry) => ` - ${entry.pkg}: ${entry.file}`)
		.join('\n');
	throw new Error(
		`Required build artifacts are missing:\n${messages}\nRun "pnpm build:packages" (or the relevant package builds) before running the smoke test.`
	);
}

async function runLocalCreate(scopedProjectDir, packageManager) {
	const createScript = path.join(
		repoRoot,
		'packages/create-wpk/dist/index.js'
	);
	await runNode(
		createScript,
		[scopedProjectDir, '--', '--package-manager', packageManager],
		{ cwd: repoRoot }
	);
}

async function runPackageManagerCommand(
	packageManager,
	commandKind,
	args,
	options
) {
	const tools = PACKAGE_MANAGER_TOOLS[packageManager];
	if (!tools) {
		throw new Error(`Unsupported package manager: ${packageManager}`);
	}

	const buildArgs =
		commandKind === 'install'
			? tools.install(args)
			: tools.execWpk(args);

	return runCommand(
		buildArgs[0],
		buildArgs.slice(1),
		options
	);
}

function extractTarballFromStdout(stdout = '') {
	const lines = stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.reverse();

	for (const line of lines) {
		if (line.endsWith('.tgz')) {
			return path.isAbsolute(line)
				? line
				: path.join(artifactsDir, line);
		}
	}

	return undefined;
}

const gitIdentity = {
	name: process.env.WPK_SMOKE_GIT_NAME ?? 'WPK Smoke Test',
	email: process.env.WPK_SMOKE_GIT_EMAIL ?? 'smoke@wpkernel.dev',
};

async function snapshotWorkspace(cwd, message) {
	const status = await readGitStatus(cwd);
	if (status === null || status.trim().length === 0) {
		return;
	}

	const gitAddOptions = {
		cwd,
		capture: true,
		quietCapture: true,
	};
	await runGit(['add', '--all'], gitAddOptions);

	const gitCommitOptions = {
		cwd,
		capture: true,
		quietCapture: !smokeVerbose,
		env: {
			...process.env,
			GIT_AUTHOR_NAME: gitIdentity.name,
			GIT_AUTHOR_EMAIL: gitIdentity.email,
			GIT_COMMITTER_NAME: gitIdentity.name,
			GIT_COMMITTER_EMAIL: gitIdentity.email,
		},
	};

	await runGit(['commit', '--quiet', '--no-verify', '-m', message], {
		...gitCommitOptions,
	});

	if (smokeVerbose) {
		console.log(`   git snapshot: ${message}`);
	}
}

async function readGitStatus(cwd) {
	try {
		const { stdout } = await runGit(['status', '--porcelain'], {
			cwd,
			capture: true,
			quietCapture: true,
		});
		return stdout;
	} catch {
		return null;
	}
}

function runGit(args, options = {}) {
	return runCommand('git', args, options);
}

async function initGitRepository(cwd) {
	// Always re-init to ensure .git exists and is consistent.
	await runGit(['init'], { cwd, capture: true, quietCapture: true });
	await runGit(
		['config', 'user.name', gitIdentity.name],
		{ cwd, capture: true, quietCapture: true }
	);
	await runGit(
		['config', 'user.email', gitIdentity.email],
		{ cwd, capture: true, quietCapture: true }
	);
	// Seed an initial commit so future git status calls don't error on missing objects.
	await runGit(['add', '--all'], { cwd, capture: true, quietCapture: true });
	await runGit(
		['commit', '--quiet', '--no-verify', '--allow-empty', '-m', 'chore: initial scaffold'],
		{
			cwd,
			capture: true,
			quietCapture: !smokeVerbose,
		}
	).catch(() => {
		// If commit fails (shouldn't), leave repository initialised to avoid fatal git errors.
	});
}

async function resetGitRepository(cwd, message) {
	await rm(path.join(cwd, '.git'), { recursive: true, force: true });
	await initGitRepository(cwd);
	await runGit(['add', '--all'], {
		cwd,
		capture: true,
		quietCapture: true,
	});
	await runGit(
		['commit', '--quiet', '--no-verify', '--allow-empty', '-m', message],
		{
			cwd,
			capture: true,
			quietCapture: !smokeVerbose,
		}
	).catch(() => undefined);
}

main().catch((error) => {
	console.error('\nERROR Smoke test failed.');
	console.error(error);
	process.exitCode = 1;
});

function parsePackageManagers(args) {
	const entry = args.find((arg) =>
		arg.startsWith('--package-managers=')
	);
	const supported = ['npm', 'pnpm', 'yarn'];

	if (!entry) {
		return ['npm'];
	}

	const [, value = ''] = entry.split('=');
	const candidates = value
		.split(',')
		.map((item) => item.trim().toLowerCase())
		.filter((item) => item.length > 0);

	if (candidates.length === 0) {
		return ['npm'];
	}

	if (candidates.includes('all')) {
		return supported;
	}

	const invalid = candidates.filter(
		(candidate) => !supported.includes(candidate)
	);
	if (invalid.length > 0) {
		throw new Error(
			`Unsupported package managers: ${invalid.join(', ')}. Expected one of ${supported.join(', ')} or "all".`
		);
	}

	return Array.from(new Set(candidates));
}
async function resolveCliEnv(workspaceRoot) {
	const cliRoot = await resolveCliPackageRoot(workspaceRoot);
	const autoloadPath = path.join(cliRoot, 'vendor', 'autoload.php');
	await access(autoloadPath);
	return {
		WPK_PHP_AUTOLOAD: autoloadPath,
	};
}

async function resolveCliPackageRoot(workspaceRoot) {
	const requireFromWorkspace = createRequire(
		path.join(workspaceRoot, 'package.json')
	);
	const cliPackageJson = requireFromWorkspace.resolve(
		'@wpkernel/cli/package.json'
	);
	return path.dirname(cliPackageJson);
}
