// precommit-utils.mjs
// utils-only: runners, spinners, git, doc detection, graph loader, quiet concurrency

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, stat } from 'fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import workspaceGraph from './workspace-graph.utils.cjs';

const {
	loadWorkspaceGraph,
	getWorkspaceByName,
	getWorkspaceDependencies,
	getWorkspaceDependents,
	findWorkspaceForFile,
} = workspaceGraph;

export { loadWorkspaceGraph };

/* -------------------------------------------------------------------------- */
/* colours / terminal                                                         */
/* -------------------------------------------------------------------------- */

const isInteractive = process.stdout.isTTY && !process.env.CI;
const useColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';

export const colors = {
	green: (text) => (useColor ? `\u001B[32m${text}\u001B[0m` : text),
	red: (text) => (useColor ? `\u001B[31m${text}\u001B[0m` : text),
	yellow: (text) => (useColor ? `\u001B[33m${text}\u001B[0m` : text),
	cyan: (text) => (useColor ? `\u001B[36m${text}\u001B[0m` : text),
	dim: (text) => (useColor ? `\u001B[2m${text}\u001B[0m` : text),
};

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/* -------------------------------------------------------------------------- */
/* command abstraction                                                         */
/* -------------------------------------------------------------------------- */

/**
 * @param {string} command
 * @param {string[]} args
 * @param {{cwd?: string, env?: NodeJS.ProcessEnv}} [options]
 * @returns {Promise<{stdout: string, stderr: string, code: number, signal: NodeJS.Signals | null, durationMs: number}>}
 */
export async function runCommand(command, args, options = {}) {
	const startedAt = performance.now();
	const child = spawn(command, args, {
		cwd: options.cwd ?? process.cwd(),
		env: { ...process.env, ...options.env },
		stdio: 'pipe',
	});

	/** @type {string[]} */
	const stdoutChunks = [];
	/** @type {string[]} */
	const stderrChunks = [];

	if (child.stdout) {
		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			stdoutChunks.push(chunk);
		});
	}
	if (child.stderr) {
		child.stderr.setEncoding('utf8');
		child.stderr.on('data', (chunk) => {
			stderrChunks.push(chunk);
		});
	}

	const [code, signal] = /** @type {[number, NodeJS.Signals | null]} */ (
		await once(child, 'close')
	);
	const durationMs = performance.now() - startedAt;

	return {
		stdout: stdoutChunks.join(''),
		stderr: stderrChunks.join(''),
		code,
		signal,
		durationMs,
	};
}

export class CommandError extends Error {
	/**
	 * @param {string} command
	 * @param {{stdout: string, stderr: string, code: number, signal: NodeJS.Signals | null, durationMs: number}} result
	 */
	constructor(command, result) {
		super(`Command failed: ${command}`);
		this.result = result;
		this.command = command;
	}
}

/* -------------------------------------------------------------------------- */
/* spinner                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @param {string} label
 */
function createSpinner(label) {
	if (!isInteractive) {
		console.log(`${colors.cyan('▶')} ${label}`);
		return {
			update: (suffix) => {
				if (suffix) {
					console.log(`${colors.dim('   ↳')} ${suffix}`);
				}
			},
			succeed: (message) => console.log(`${colors.green('✔')} ${message}`),
			fail: (message) => console.error(`${colors.red('✖')} ${message}`),
		};
	}

	let suffixText = '';
	let frameIndex = 0;
	let active = true;

	const tick = () => {
		if (!active) return;
		const frame = spinnerFrames[frameIndex];
		frameIndex = (frameIndex + 1) % spinnerFrames.length;
		const message = `${frame} ${label}${suffixText ? colors.dim(` · ${suffixText}`) : ''}`;
		process.stdout.write(`\r${message}`);
	};

	const interval = setInterval(tick, 80);
	tick();

	const clearLine = () => {
		process.stdout.write('\r');
		process.stdout.clearLine(0);
	};

	return {
		update: (suffix) => {
			suffixText = suffix ?? '';
		},
		succeed: (message) => {
			active = false;
			clearInterval(interval);
			clearLine();
			console.log(`${colors.green('✔')} ${message}`);
		},
		fail: (message) => {
			active = false;
			clearInterval(interval);
			clearLine();
			console.error(`${colors.red('✖')} ${message}`);
		},
	};
}

/* -------------------------------------------------------------------------- */
/* tasks                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} Task
 * @property {string} title
 * @property {(ctx: {update: (suffix?: string) => void}) => Promise<{summaryLines?: string[]} | void>} run
 * @property {boolean} [enabled]
 * @property {string} [skipMessage]
 */

/**
 * @param {number} durationMs
 */
function formatDuration(durationMs) {
	if (durationMs < 1000) {
		return `${durationMs.toFixed(0)}ms`;
	}
	const seconds = durationMs / 1000;
	if (seconds < 60) {
		return `${seconds < 10 ? seconds.toFixed(1) : seconds.toFixed(0)}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remaining = seconds - minutes * 60;
	const secondsPart =
		remaining < 10 ? `0${remaining.toFixed(0)}` : `${remaining.toFixed(0)}`;
	return `${minutes}m ${secondsPart}s`;
}

/**
 * @param {Task[]} tasks
 */
export async function runTasks(tasks) {
	const runnable = [];
	for (const task of tasks) {
		if (task.enabled === false) {
			if (task.skipMessage) {
				console.log(`${colors.yellow('⏭')} ${task.skipMessage}`);
			}
		} else {
			runnable.push(task);
		}
	}

	let index = 0;
	for (const task of runnable) {
		index += 1;
		await executeTask(task, index, runnable.length);
	}
}

/**
 * @param {Task} task
 * @param {number} index
 * @param {number} total
 */
async function executeTask(task, index, total) {
	const label = `[${index}/${total}] ${task.title}`;
	const spinner = createSpinner(label);
	const start = performance.now();

	try {
		const result = await task.run({
			update: (suffix) => spinner.update(suffix),
		});
		spinner.succeed(
			`${label} (${formatDuration(performance.now() - start)})`,
		);
		if (result && result.summaryLines && result.summaryLines.length > 0) {
			for (const line of result.summaryLines) {
				console.log(`   ${colors.dim('•')} ${line}`);
			}
		}
	} catch (error) {
		spinner.fail(`${label} (${formatDuration(performance.now() - start)})`);
		if (error instanceof CommandError) {
			printCommandError(error);
		} else if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(String(error));
		}
		throw error;
	}
}

/**
 * @param {CommandError} error
 */
function printCommandError(error) {
	console.error(colors.red(`→ ${error.command}`));
	const stdout = error.result.stdout.trim();
	const stderr = error.result.stderr.trim();
	if (stdout) {
		console.error(colors.dim('── stdout ──'));
		console.error(stdout);
	}
	if (stderr) {
		console.error(colors.dim('── stderr ──'));
		console.error(stderr);
	}
}

/* -------------------------------------------------------------------------- */
/* git + docs detection                                                       */
/* -------------------------------------------------------------------------- */

/**
 * @param {string} file
 */
function normalizePath(file) {
	return file.replace(/\\/g, '/');
}

/**
 * @returns {Promise<string[]>}
 */
export async function getStagedFiles() {
	const result = await runCommand('git', [
		'diff',
		'--cached',
		'--name-only',
		'--diff-filter=ACMR',
	]);
	if (result.code !== 0) {
		throw new CommandError(
			'git diff --cached --name-only --diff-filter=ACMR',
			result,
		);
	}
	return result.stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map(normalizePath);
}

const DOC_EXTS = new Set([
	'.md',
	'.mdx',
	'.markdown',
	'.mdown',
	'.adoc',
	'.rst',
	'.txt',
]);
const DOC_NAMES = new Set([
	'changelog.md',
	'readme.md',
	'contributing.md',
	'license.md',
	'licensing.md',
	'migrating.md',
	'migration.md',
	'roadmap.md',
]);

/**
 * @param {string} file
 */
export function isDocumentationFile(file) {
	const lower = file.toLowerCase();
	const ext = path.extname(lower);
	const name = path.basename(lower);

	if (DOC_EXTS.has(ext)) return true;
	if (DOC_NAMES.has(name)) return true;
	if (lower.startsWith('docs/')) return true;
	if (/^packages\/[^/]+\/docs\//.test(lower)) return true;
	if (/^examples\/[^/]+\/docs\//.test(lower)) return true;
	return false;
}

function collectDeclaredTypeArtifacts(manifest) {
	const paths = new Set();
	const addPath = (value) => {
		if (typeof value !== 'string') return;
		const trimmed = value.trim();
		if (trimmed.length === 0) return;
		paths.add(trimmed);
	};

	if (typeof manifest.types === 'string') {
		addPath(manifest.types);
	}
	if (typeof manifest.typings === 'string') {
		addPath(manifest.typings);
	}

	const exportsField = manifest.exports;
	if (typeof exportsField === 'string') {
		if (exportsField.endsWith('.d.ts')) {
			addPath(exportsField);
		}
	} else if (exportsField && typeof exportsField === 'object') {
		const rootExport = exportsField['.'];
		if (typeof rootExport === 'string') {
			if (rootExport.endsWith('.d.ts')) {
				addPath(rootExport);
			}
		} else if (rootExport && typeof rootExport === 'object') {
			if (typeof rootExport.types === 'string') {
				addPath(rootExport.types);
			}
			if (typeof rootExport.typings === 'string') {
				addPath(rootExport.typings);
			}
		}
	}

	return Array.from(paths);
}

export async function findMissingTypeArtifacts(workspaceNames, graph) {
	if (!Array.isArray(workspaceNames) || workspaceNames.length === 0) {
		return [];
	}

	const repoRoot = graph?.root ?? process.cwd();
	const byName = new Map();
	for (const ws of graph?.workspaces ?? []) {
		byName.set(ws.name, ws);
	}

	const missing = [];
	const seen = new Set();

	for (const name of workspaceNames) {
		if (seen.has(name)) continue;
		seen.add(name);
		const ws = byName.get(name);
		if (!ws) continue;
		const pkgJsonPath = ws.packageJsonPath
			? ws.packageJsonPath
			: path.resolve(repoRoot, ws.dir, 'package.json');
		let manifest;
		try {
			const raw = await readFile(pkgJsonPath, 'utf8');
			manifest = JSON.parse(raw);
		} catch {
			continue;
		}
		const pkgDir = path.dirname(pkgJsonPath);
		const availableArtifacts = collectDeclaredTypeArtifacts(manifest);
		if (availableArtifacts.length === 0) {
			continue;
		}
		let missingPath = null;
		for (const relPath of availableArtifacts) {
			const resolved = path.resolve(pkgDir, relPath);
			try {
				const stats = await stat(resolved);
				if (!stats.isFile() || stats.size === 0) {
					missingPath = resolved;
					break;
				}
			} catch {
				missingPath = resolved;
				break;
			}
		}
		if (missingPath) {
			missing.push({
				workspace: name,
				artifact: path.relative(repoRoot, missingPath) || missingPath,
			});
		}
	}

	return missing;
}

/* -------------------------------------------------------------------------- */
/* repo-wide change detection                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Some files mean "blast radius = whole repo".
 *
 * @param {string} file
 */
export function isRepoWideChange(file) {
	// normalise
	const f = file.replace(/\\/g, '/');

	// root-wide configs
	if (
		f === 'pnpm-workspace.yaml' ||
		f === 'package.json' ||
		f === 'pnpm-lock.yaml' ||
		f === 'tsconfig.json' ||
		f.startsWith('tsconfig.') // tsconfig.base.json, tsconfig.tests.json, etc.
	) {
		return true;
	}

	// repo infra
	if (
		f.startsWith('scripts/') ||
		f.startsWith('.github/') ||
		f.startsWith('.vscode/') ||
		f.startsWith('.idea/')
	) {
		return true;
	}

	// containers / CI stuff that can affect build graph
	if (
		f === 'Dockerfile' ||
		f.startsWith('docker/') ||
		f.startsWith('.devcontainer/')
	) {
		return true;
	}

	return false;
}

/**
 * Given staged files and the precomputed graph, work out which workspaces are
 * touched and which additional workspaces depend on them.
 *
 * @param {string[]} stagedFiles
 * @param {{workspaces: Array<{name: string, dir: string, localDeps?: string[], localDependents?: string[]}>}} graph
 * @returns {{ affected: Array<{name: string, dir: string, reasons: string[]}> , filters: string[] }}
 */
export function resolveAffectedFromFiles(stagedFiles, graph) {
	/** @type {Map<string, {name: string, dir: string, reasons: string[]}>} */
	const affected = new Map();
	const queue = [];
	const markWorkspace = (ws, reason) => {
		const normalisedDir = ws.dir ? ws.dir.replace(/\\/g, '/') : '';
		if (normalisedDir.includes('/examples/')) {
			return;
		}
		const dir = ws.dir ? ws.dir.replace(/\\/g, '/') : '';
		const entry =
			affected.get(ws.name) ??
			{ name: ws.name, dir, reasons: [] };
		if (reason && !entry.reasons.includes(reason)) {
			entry.reasons.push(reason);
		}
		if (!affected.has(ws.name)) {
			affected.set(ws.name, entry);
			queue.push(ws.name);
		}
	};

	for (const file of stagedFiles) {
		const ws = findWorkspaceForFile(graph, file);
		if (!ws) continue;
		markWorkspace(ws, `${ws.name} files changed`);
	}

	const seen = new Set(queue);
	while (queue.length > 0) {
		const current = queue.shift();
		const dependents = getWorkspaceDependents(graph, current);
		for (const depName of dependents) {
			const depWs = getWorkspaceByName(graph, depName);
			if (!depWs) continue;
			markWorkspace(depWs, `${depWs.name} depends on ${current}`);
			if (!seen.has(depName)) {
				seen.add(depName);
				queue.push(depName);
			}
		}
	}

	const affectedArr = Array.from(affected.values()).sort((a, b) =>
		a.name.localeCompare(b.name),
	);
	const filters = affectedArr.map((a) => a.name);
	return { affected: affectedArr, filters };
}

export function collectWorkspaceDependencies(workspaceNames, graph) {
	if (!graph) return [];
	const deps = new Set();
	const queue = [...(workspaceNames ?? [])];
	while (queue.length > 0) {
		const current = queue.shift();
		for (const depName of getWorkspaceDependencies(graph, current)) {
			if (deps.has(depName)) continue;
			deps.add(depName);
			queue.push(depName);
		}
	}
	return Array.from(deps);
}

/**
 * Build pnpm --filter args from workspace names.
 *
 * @param {string[]} filters
 * @param {string} command
 * @returns {string[]}
 */
export function buildFilterArgs(filters, command) {
	const patterns = new Set(
		filters.map((f) => (f.endsWith('...') ? f : `${f}...`)),
	);
	return Array.from(patterns)
		.flatMap((pattern) => ['--filter', pattern])
		.concat(command);
}

/* -------------------------------------------------------------------------- */
/* quiet concurrency                                                          */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{ cmd: string, args: string[], label?: string, env?: NodeJS.ProcessEnv }} ConcurrentCommand
 */

/**
 * Run multiple commands in parallel, quietly.
 * - no streaming
 * - capture per-command stdout/stderr
 * - first failure wins
 * - others are killed best-effort
 *
 * @param {ConcurrentCommand[]} commands
 * @returns {Promise<Array<{command: ConcurrentCommand, result: {stdout: string, stderr: string, code: number, signal: NodeJS.Signals | null, durationMs: number}}>>}
 */
export async function runConcurrentQuiet(commands) {
	/** @type {Array<{command: ConcurrentCommand, child: import('node:child_process').ChildProcessWithoutNullStreams, startedAt: number, stdout: string[], stderr: string[], done: boolean}>} */
	const procs = [];

	const spawnOne = (command) => {
		const startedAt = performance.now();
		const child = spawn(command.cmd, command.args, {
			cwd: process.cwd(),
			env: { ...process.env, ...command.env },
			stdio: 'pipe',
		});

		const obj = {
			command,
			child,
			startedAt,
			stdout: [],
			stderr: [],
			done: false,
		};

		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			obj.stdout.push(chunk);
		});

		child.stderr.setEncoding('utf8');
		child.stderr.on('data', (chunk) => {
			obj.stderr.push(chunk);
		});

		return obj;
	};

	for (const cmd of commands) {
		procs.push(spawnOne(cmd));
	}

	const results = procs.map(
		(proc) =>
			new Promise((resolve) => {
				proc.child.once('close', (code, signal) => {
					proc.done = true;
					const durationMs = performance.now() - proc.startedAt;
					resolve({
						command: proc.command,
						result: {
							stdout: proc.stdout.join(''),
							stderr: proc.stderr.join(''),
							code: code ?? 0,
							signal,
							durationMs,
						},
					});
				});
				proc.child.once('error', (err) => {
					proc.done = true;
					const durationMs = performance.now() - proc.startedAt;
					resolve({
						command: proc.command,
						result: {
							stdout: '',
							stderr: err && err.stack ? String(err.stack) : String(err),
							code: 1,
							signal: null,
							durationMs,
						},
					});
				});
			}),
	);

	const settled = await Promise.all(results);

	const failed = settled.find(
		(r) => r.result.code !== 0 || r.result.signal,
	);

	if (failed) {
		// kill others
		for (const proc of procs) {
			if (!proc.done) {
				proc.child.kill('SIGINT');
				setTimeout(() => {
					if (!proc.done) {
						proc.child.kill('SIGKILL');
					}
				}, 2000).unref();
			}
		}

		const { command, result } = failed;
		const cmdString = [command.cmd, ...command.args].join(' ');
		throw new CommandError(cmdString, result);
	}

	return settled;
}

/**
 * Task wrapper around runConcurrentQuiet, so we can keep the single-spinner UX.
 *
 * @param {{ title: string, commands: ConcurrentCommand[], summaryLines?: string[] | ((results: any[]) => string[]) }} params
 * @returns {Task}
 */
export function createConcurrentTask({ title, commands, summaryLines }) {
	return {
		title,
		async run(ctx) {
			ctx.update(
				commands.map((c) => c.label ?? c.cmd).join(' + '),
			);
			const results = await runConcurrentQuiet(commands);
			return {
				summaryLines:
					typeof summaryLines === 'function'
						? summaryLines(results)
						: summaryLines,
			};
		},
	};
}

/* -------------------------------------------------------------------------- */
/* coverage extraction                                                        */
/* -------------------------------------------------------------------------- */

/**
 * @param {string} output
 * @returns {string[]}
 */
export function extractCoverageSummary(output) {
	const lines = output
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return [];
	}

	const summary = [];

	const tableHeaderIndex = lines.findLastIndex((line) =>
		/^File\s+\|/.test(line),
	);
	const allFilesIndex = lines.findLastIndex((line) =>
		line.startsWith('All files'),
	);

	if (tableHeaderIndex !== -1 && allFilesIndex !== -1) {
		const start = Math.max(tableHeaderIndex - 1, 0);
		const end = Math.min(allFilesIndex + 1, lines.length);
		const tableLines = lines.slice(start, Math.min(start + 4, end + 1));
		summary.push(...tableLines);
	}

	const testSummaryIndex = lines.findLastIndex((line) =>
		line.startsWith('Test Suites:'),
	);
	if (testSummaryIndex !== -1) {
		summary.push(
			...lines.slice(
				testSummaryIndex,
				Math.min(testSummaryIndex + 5, lines.length),
			),
		);
	}

	return summary.length > 0 ? summary : ['Coverage summary unavailable'];
}

/* -------------------------------------------------------------------------- */
/* createCommandTask                                                          */
/* -------------------------------------------------------------------------- */

/**
 * @param {{title: string, commands: Array<{cmd: string, args: string[], label?: string}>, summaryLines?: string[] | (() => string[])}} params
 * @returns {Task}
 */
export function createCommandTask({ title, commands, summaryLines }) {
	return {
		title,
		async run(ctx) {
			for (const command of commands) {
				ctx.update(command.label ?? command.cmd);
				const result = await runCommand(command.cmd, command.args);
				if (result.code !== 0) {
					throw new CommandError(
						`${command.cmd} ${command.args.join(' ')}`,
						result,
					);
				}
			}
			return {
				summaryLines:
					typeof summaryLines === 'function'
						? summaryLines()
						: summaryLines,
			};
		},
	};
}
