#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

interface CommandResult {
	stdout: string;
	stderr: string;
	code: number;
	signal: NodeJS.Signals | null;
	durationMs: number;
}

class CommandError extends Error {
	public readonly result: CommandResult;
	public readonly command: string;

	constructor(command: string, result: CommandResult) {
		super(`Command failed: ${command}`);
		this.result = result;
		this.command = command;
	}
}

const isInteractive = process.stdout.isTTY && !process.env.CI;
const useColor = process.stdout.isTTY && process.env.NO_COLOR !== '1';

const colors = {
	green: (text: string) => (useColor ? `\u001B[32m${text}\u001B[0m` : text),
	red: (text: string) => (useColor ? `\u001B[31m${text}\u001B[0m` : text),
	yellow: (text: string) => (useColor ? `\u001B[33m${text}\u001B[0m` : text),
	cyan: (text: string) => (useColor ? `\u001B[36m${text}\u001B[0m` : text),
	dim: (text: string) => (useColor ? `\u001B[2m${text}\u001B[0m` : text),
};

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const TYPECHECK_TARGETS = {
	core: {
		label: 'Core workspace',
		filter: '@wpkernel/core',
		packageName: '@wpkernel/core',
		directory: 'packages/core/',
	},
	cli: {
		label: 'CLI workspace',
		filter: '@wpkernel/cli',
		packageName: '@wpkernel/cli',
		directory: 'packages/cli/',
	},
	'create-wpk': {
		label: 'Create bootstrap workspace',
		filter: '@wpkernel/create-wpk',
		packageName: '@wpkernel/create-wpk',
		directory: 'packages/create-wpk/',
	},
	ui: {
		label: 'UI workspace',
		filter: '@wpkernel/ui',
		packageName: '@wpkernel/ui',
		directory: 'packages/ui/',
	},
	'php-json-ast': {
		label: 'PHP JSON AST workspace',
		filter: '@wpkernel/php-json-ast',
		packageName: '@wpkernel/php-json-ast',
		directory: 'packages/php-json-ast/',
	},
	'wp-json-ast': {
		label: 'WP JSON AST workspace',
		filter: '@wpkernel/wp-json-ast',
		packageName: '@wpkernel/wp-json-ast',
		directory: 'packages/wp-json-ast/',
	},
	'test-utils': {
		label: 'Test utils workspace',
		filter: '@wpkernel/test-utils',
		packageName: '@wpkernel/test-utils',
		directory: 'packages/test-utils/',
	},
	'e2e-utils': {
		label: 'E2E utils workspace',
		filter: '@wpkernel/e2e-utils',
		packageName: '@wpkernel/e2e-utils',
		directory: 'packages/e2e-utils/',
	},
	showcase: {
		label: 'Showcase example',
		filter: 'wp-kernel-showcase',
		packageName: 'wp-kernel-showcase',
		directory: 'examples/showcase/',
	},
} as const;

type TypecheckTargetKey = keyof typeof TYPECHECK_TARGETS;

type TypecheckTargetConfig = (typeof TYPECHECK_TARGETS)[TypecheckTargetKey];

const TYPECHECK_TARGET_ENTRIES = Object.entries(TYPECHECK_TARGETS) as Array<
	[TypecheckTargetKey, TypecheckTargetConfig]
>;

interface TypecheckDependencyGraph {
	dependents: Map<TypecheckTargetKey, Set<TypecheckTargetKey>>;
}

interface WorkspaceManifest {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

let typecheckDependencyGraphPromise: Promise<TypecheckDependencyGraph> | null =
	null;

async function readManifest(
	manifestPath: string
): Promise<WorkspaceManifest | null> {
	try {
		const raw = await readFile(manifestPath, 'utf8');
		return JSON.parse(raw) as WorkspaceManifest;
	} catch (error: unknown) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}
		throw error;
	}
}

function collectWorkspaceDependencyNames(
	manifest: WorkspaceManifest
): string[] {
	const dependencySections = [
		'dependencies',
		'devDependencies',
		'peerDependencies',
		'optionalDependencies',
	] as const;

	const names = new Set<string>();

	for (const section of dependencySections) {
		const dependencies = manifest[section];
		if (!dependencies) {
			continue;
		}

		for (const dependencyName of Object.keys(dependencies)) {
			names.add(dependencyName);
		}
	}

	return [...names];
}

async function buildTypecheckDependencyGraph(): Promise<TypecheckDependencyGraph> {
	const dependents = new Map<TypecheckTargetKey, Set<TypecheckTargetKey>>();
	const packageToTargetKey = new Map<string, TypecheckTargetKey>();

	for (const [key, target] of TYPECHECK_TARGET_ENTRIES) {
		dependents.set(key, new Set());
		packageToTargetKey.set(target.packageName, key);
	}

	for (const [key, target] of TYPECHECK_TARGET_ENTRIES) {
		const manifestPath = path.join(target.directory, 'package.json');
		const manifest = await readManifest(manifestPath);
		if (!manifest) {
			continue;
		}

		const dependencyNames = collectWorkspaceDependencyNames(manifest);

		for (const dependencyName of dependencyNames) {
			const dependencyKey = packageToTargetKey.get(dependencyName);
			if (!dependencyKey) {
				continue;
			}

			const dependentSet = dependents.get(dependencyKey);
			if (!dependentSet) {
				continue;
			}

			dependentSet.add(key);
		}
	}

	return { dependents };
}

async function getTypecheckDependencyGraph(): Promise<TypecheckDependencyGraph> {
	if (!typecheckDependencyGraphPromise) {
		typecheckDependencyGraphPromise = buildTypecheckDependencyGraph();
	}

	return typecheckDependencyGraphPromise;
}

interface Spinner {
	update: (suffix?: string) => void;
	succeed: (message: string) => void;
	fail: (message: string) => void;
}

function createSpinner(label: string): Spinner {
	if (!isInteractive) {
		console.log(`${colors.cyan('▶')} ${label}`);
		return {
			update: (suffix?: string) => {
				if (suffix) {
					console.log(`${colors.dim('   ↳')} ${suffix}`);
				}
			},
			succeed: (message: string) => {
				console.log(`${colors.green('✔')} ${message}`);
			},
			fail: (message: string) => {
				console.error(`${colors.red('✖')} ${message}`);
			},
		};
	}

	let suffixText = '';
	let frameIndex = 0;
	let active = true;

	const tick = () => {
		if (!active) {
			return;
		}
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
		update: (suffix?: string) => {
			suffixText = suffix ?? '';
		},
		succeed: (message: string) => {
			active = false;
			clearInterval(interval);
			clearLine();
			console.log(`${colors.green('✔')} ${message}`);
		},
		fail: (message: string) => {
			active = false;
			clearInterval(interval);
			clearLine();
			console.error(`${colors.red('✖')} ${message}`);
		},
	};
}

async function runCommand(
	command: string,
	args: string[],
	options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<CommandResult> {
	const startedAt = performance.now();
	const child = spawn(command, args, {
		cwd: options.cwd ?? process.cwd(),
		env: { ...process.env, ...options.env },
		stdio: 'pipe',
	});

	const stdoutChunks: string[] = [];
	const stderrChunks: string[] = [];

	if (child.stdout) {
		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk: string) => {
			stdoutChunks.push(chunk);
		});
	}

	if (child.stderr) {
		child.stderr.setEncoding('utf8');
		child.stderr.on('data', (chunk: string) => {
			stderrChunks.push(chunk);
		});
	}

	const [code, signal] = (await once(child, 'close')) as [
		number,
		NodeJS.Signals | null,
	];
	const durationMs = performance.now() - startedAt;

	const stdout = stdoutChunks.join('');
	const stderr = stderrChunks.join('');

	return { stdout, stderr, code, signal, durationMs };
}

function formatDuration(durationMs: number): string {
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

interface TaskContext {
	update: (suffix?: string) => void;
}

interface TaskResult {
	summaryLines?: string[];
}

interface Task {
	title: string;
	run: (ctx: TaskContext) => Promise<TaskResult | void>;
	enabled?: boolean;
	skipMessage?: string;
}

function normalizePath(file: string): string {
	return file.replace(/\\/g, '/');
}

async function getStagedFiles(): Promise<string[]> {
	const result = await runCommand('git', [
		'diff',
		'--cached',
		'--name-only',
		'--diff-filter=ACMR',
	]);

	if (result.code !== 0) {
		throw new CommandError(
			'git diff --cached --name-only --diff-filter=ACMR',
			result
		);
	}

	return result.stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map(normalizePath);
}

const DOCUMENTATION_FILE_EXTENSIONS = new Set([
	'.md',
	'.mdx',
	'.markdown',
	'.mdown',
	'.adoc',
	'.rst',
	'.txt',
]);

const DOCUMENTATION_FILENAMES = new Set([
	'changelog.md',
	'readme.md',
	'contributing.md',
	'license.md',
	'licensing.md',
	'migrating.md',
	'migration.md',
	'roadmap.md',
]);

function isDocumentationFile(file: string): boolean {
	const lowercased = file.toLowerCase();
	const ext = path.extname(lowercased);
	const filename = path.basename(lowercased);

	if (DOCUMENTATION_FILE_EXTENSIONS.has(ext)) {
		return true;
	}

	if (DOCUMENTATION_FILENAMES.has(filename)) {
		return true;
	}

	if (lowercased.startsWith('docs/')) {
		return true;
	}

	if (/^packages\/[^/]+\/docs\//.test(lowercased)) {
		return true;
	}

	if (/^examples\/[^/]+\/docs\//.test(lowercased)) {
		return true;
	}

	return false;
}

type RegisterTarget = (
	key: string,
	label: string,
	filter: string,
	reason: string
) => void;

function hasChangesForTarget(
	files: string[],
	target: TypecheckTargetConfig
): boolean {
	return files.some((file) => file.startsWith(target.directory));
}

interface DependencyQueueEntry {
	current: TypecheckTargetKey;
	origin: TypecheckTargetKey;
	depth: number;
}

function collectTouchedTargets(
	stagedFiles: string[],
	registerTarget: RegisterTarget
): Set<TypecheckTargetKey> {
	const touchedTargets = new Set<TypecheckTargetKey>();

	for (const [key, target] of TYPECHECK_TARGET_ENTRIES) {
		if (!hasChangesForTarget(stagedFiles, target)) {
			continue;
		}

		touchedTargets.add(key);
		registerTarget(
			key,
			target.label,
			target.filter,
			`${target.label} files changed`
		);
	}

	return touchedTargets;
}

function createInitialDependencyQueue(
	origins: Set<TypecheckTargetKey>
): DependencyQueueEntry[] {
	return [...origins].map((origin) => ({
		current: origin,
		origin,
		depth: 0,
	}));
}

function markOriginVisited(
	visitedByOrigin: Map<TypecheckTargetKey, Set<TypecheckTargetKey>>,
	dependent: TypecheckTargetKey,
	origin: TypecheckTargetKey
): boolean {
	const seenOrigins =
		visitedByOrigin.get(dependent) ?? new Set<TypecheckTargetKey>();
	if (seenOrigins.has(origin)) {
		return false;
	}

	seenOrigins.add(origin);
	visitedByOrigin.set(dependent, seenOrigins);
	return true;
}

function registerDependencyReason(
	dependent: TypecheckTargetKey,
	origin: TypecheckTargetKey,
	depth: number,
	registerTarget: RegisterTarget
): void {
	const dependentTarget = TYPECHECK_TARGETS[dependent];
	const originTarget = TYPECHECK_TARGETS[origin];
	const verb = depth === 0 ? 'depends on' : 'transitively depends on';
	const reason = `${dependentTarget.label} ${verb} ${originTarget.label}`;

	registerTarget(
		dependent,
		dependentTarget.label,
		dependentTarget.filter,
		reason
	);
}

function propagateDependencyTargets(
	dependencyGraph: TypecheckDependencyGraph,
	queue: DependencyQueueEntry[],
	visitedByOrigin: Map<TypecheckTargetKey, Set<TypecheckTargetKey>>,
	registerTarget: RegisterTarget
): void {
	while (queue.length > 0) {
		const { current, origin, depth } = queue.shift()!;
		const dependents = dependencyGraph.dependents.get(current);
		if (!dependents) {
			continue;
		}

		for (const dependent of dependents) {
			if (!markOriginVisited(visitedByOrigin, dependent, origin)) {
				continue;
			}

			registerDependencyReason(dependent, origin, depth, registerTarget);
			queue.push({ current: dependent, origin, depth: depth + 1 });
		}
	}
}

async function populateTypecheckTargets(
	stagedFiles: string[],
	registerTarget: RegisterTarget
): Promise<void> {
	const touchedTargets = collectTouchedTargets(stagedFiles, registerTarget);
	if (touchedTargets.size === 0) {
		return;
	}

	const dependencyGraph = await getTypecheckDependencyGraph();
	const queue = createInitialDependencyQueue(touchedTargets);
	const visitedByOrigin = new Map<
		TypecheckTargetKey,
		Set<TypecheckTargetKey>
	>();

	propagateDependencyTargets(
		dependencyGraph,
		queue,
		visitedByOrigin,
		registerTarget
	);
}

interface ResolvedTypecheckTarget {
	key: string;
	label: string;
	filter: string;
	reasons: string[];
}

function registerResolvedTarget(
	collection: Map<string, ResolvedTypecheckTarget>,
	key: string,
	label: string,
	filter: string,
	reason: string
): void {
	const entry =
		collection.get(key) ??
		({
			key,
			label,
			filter,
			reasons: [],
		} satisfies ResolvedTypecheckTarget);

	if (!entry.reasons.includes(reason)) {
		entry.reasons.push(reason);
	}

	collection.set(key, entry);
}

async function resolveTypecheckTargets(
	stagedFiles: string[]
): Promise<ResolvedTypecheckTarget[]> {
	const resolvedTargets = new Map<string, ResolvedTypecheckTarget>();

	await populateTypecheckTargets(
		stagedFiles,
		(key, label, filter, reason) => {
			registerResolvedTarget(resolvedTargets, key, label, filter, reason);
		}
	);

	const orderedTargets = Array.from(resolvedTargets.values());
	orderedTargets.sort((a, b) => a.label.localeCompare(b.label));
	return orderedTargets;
}

function buildFilterArgs(filters: string[], command: string): string[] {
	const patterns = new Set(
		filters.map((filter) =>
			filter.endsWith('...') ? filter : `${filter}...`
		)
	);

	return Array.from(patterns)
		.flatMap((pattern) => ['--filter', pattern])
		.concat(command);
}

function buildTypecheckSummaryLines(
	targets: ResolvedTypecheckTarget[]
): string[] {
	return targets.flatMap((target) =>
		target.reasons.map((reason) => `• ${target.label}: ${reason}`)
	);
}

async function buildTypecheckTasks(stagedFiles: string[]): Promise<Task[]> {
	const targets = await resolveTypecheckTargets(stagedFiles);

	if (targets.length === 0) {
		return [
			{
				title: 'Typecheck',
				enabled: false,
				skipMessage:
					'No package changes detected - skipping typechecks.',
				run: async () => {},
			},
		];
	}

	const filters = targets.map((target) => target.filter);
	const summaryLines = () => buildTypecheckSummaryLines(targets);

	return [
		createCommandTask({
			title: 'Typecheck affected workspaces',
			summaryLines,
			commands: [
				{
					cmd: 'pnpm',
					args: buildFilterArgs(filters, 'typecheck'),
					label: 'typecheck',
				},
				{
					cmd: 'pnpm',
					args: buildFilterArgs(filters, 'typecheck:tests'),
					label: 'typecheck:tests',
				},
			],
		}),
	];
}

interface CommandDescriptor {
	cmd: string;
	args: string[];
	label?: string;
}

function createCommandTask({
	title,
	commands,
	summaryLines,
}: {
	title: string;
	commands: CommandDescriptor[];
	summaryLines?: string[] | (() => string[]);
}): Task {
	return {
		title,
		async run(ctx) {
			for (const command of commands) {
				ctx.update(command.label);
				const result = await runCommand(command.cmd, command.args);
				if (result.code !== 0) {
					throw new CommandError(
						`${command.cmd} ${command.args.join(' ')}`,
						result
					);
				}
			}

			return {
				summaryLines:
					typeof summaryLines === 'function'
						? summaryLines()
						: summaryLines,
			} satisfies TaskResult;
		},
	};
}

async function runTasks(tasks: Task[]): Promise<void> {
	const runnableTasks: Task[] = [];

	for (const task of tasks) {
		if (isTaskEnabled(task)) {
			runnableTasks.push(task);
			continue;
		}

		logSkippedTask(task);
	}

	let index = 0;
	for (const task of runnableTasks) {
		index += 1;
		await executeTask(task, index, runnableTasks.length);
	}
}

function logSkippedTask(task: Task): void {
	if (task.skipMessage) {
		console.log(`${colors.yellow('⏭')} ${task.skipMessage}`);
	}
}

function isTaskEnabled(task: Task): boolean {
	return task.enabled !== false;
}

async function executeTask(
	task: Task,
	index: number,
	total: number
): Promise<void> {
	const label = `[${index}/${total}] ${task.title}`;
	const spinner = createSpinner(label);
	const start = performance.now();

	let result: TaskResult | void;

	try {
		result = (await task.run({
			update: (suffix?: string) => spinner.update(suffix),
		})) as TaskResult | void;
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

	const durationLabel = `${label} (${formatDuration(performance.now() - start)})`;
	spinner.succeed(durationLabel);

	if (result?.summaryLines && result.summaryLines.length > 0) {
		for (const line of result.summaryLines) {
			console.log(`   ${colors.dim('•')} ${line}`);
		}
	}
}

function printCommandError(error: CommandError): void {
	console.error(colors.red(`→ ${error.command}`));
	const stdout = error.result.stdout.trim();
	const stderr = error.result.stderr.trim();

	if (stdout.length > 0) {
		console.error(colors.dim('── stdout ──'));
		console.error(stdout);
	}

	if (stderr.length > 0) {
		console.error(colors.dim('── stderr ──'));
		console.error(stderr);
	}
}

function extractCoverageSummary(output: string): string[] {
	const lines = output
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return [];
	}

	const summary: string[] = [];

	const tableHeaderIndex = lines.findLastIndex((line) =>
		/^File\s+\|/.test(line)
	);
	const allFilesIndex = lines.findLastIndex((line) =>
		line.startsWith('All files')
	);

	if (tableHeaderIndex !== -1 && allFilesIndex !== -1) {
		const start = Math.max(tableHeaderIndex - 1, 0);
		const end = Math.min(allFilesIndex + 1, lines.length);
		const tableLines = lines.slice(start, Math.min(start + 4, end + 1));
		summary.push(...tableLines);
	}

	const testSummaryIndex = lines.findLastIndex((line) =>
		line.startsWith('Test Suites:')
	);
	if (testSummaryIndex !== -1) {
		summary.push(
			...lines.slice(
				testSummaryIndex,
				Math.min(testSummaryIndex + 5, lines.length)
			)
		);
	}

	return summary.length > 0 ? summary : ['Coverage summary unavailable'];
}

async function main() {
	const stagedFiles = await getStagedFiles();

	const hasStagedFiles = stagedFiles.length > 0;
	const nonDocumentationFiles = stagedFiles.filter(
		(file) => !isDocumentationFile(file)
	);
	const hasNonDocumentationChanges = nonDocumentationFiles.length > 0;
	const documentationOnlyChanges =
		hasStagedFiles && !hasNonDocumentationChanges;

	const tasks: Task[] = [];

	tasks.push({
		title: 'Lint staged files',
		enabled: hasStagedFiles && !documentationOnlyChanges,
		skipMessage: hasStagedFiles
			? 'Documentation-only changes detected - skipping lint-staged.'
			: 'No staged files detected - skipping lint-staged.',
		async run(ctx) {
			ctx.update('lint-staged');
			const result = await runCommand('pnpm', ['lint-staged']);
			if (result.code !== 0) {
				throw new CommandError('pnpm lint-staged', result);
			}

			const summaryLines: string[] = [];
			const trimmed = result.stdout.trim();
			if (trimmed.length > 0) {
				const lines = trimmed.split('\n').slice(-5);
				summaryLines.push(...lines);
			}
			return { summaryLines } satisfies TaskResult;
		},
	});

	if (hasNonDocumentationChanges) {
		tasks.push(...(await buildTypecheckTasks(nonDocumentationFiles)));

		tasks.push({
			title: 'Run tests with coverage',
			async run(ctx) {
				ctx.update('jest --coverage');
				const result = await runCommand('pnpm', ['test:coverage']);
				if (result.code !== 0) {
					throw new CommandError('pnpm test:coverage', result);
				}

				return {
					summaryLines: extractCoverageSummary(result.stdout),
				} satisfies TaskResult;
			},
		});

		tasks.push({
			title: 'Run integration test suites',
			async run(ctx) {
				ctx.update('jest integration');
				const result = await runCommand('pnpm', ['test:integration']);
				if (result.code !== 0) {
					throw new CommandError('pnpm test:integration', result);
				}
			},
		});
	} else {
		tasks.push({
			title: 'Typecheck',
			enabled: false,
			skipMessage:
				'Documentation-only changes detected - skipping typechecks.',
			async run() {},
		});

		tasks.push({
			title: 'Run tests with coverage',
			enabled: false,
			skipMessage:
				'Documentation-only changes detected - skipping coverage tests.',
			async run() {},
		});

		tasks.push({
			title: 'Run integration test suites',
			enabled: false,
			skipMessage:
				'Documentation-only changes detected - skipping integration tests.',
			async run() {},
		});
	}

	tasks.push({
		title: 'Format workspace',
		async run(ctx) {
			ctx.update('pnpm format');
			const result = await runCommand('pnpm', ['format']);
			if (result.code !== 0) {
				throw new CommandError('pnpm format', result);
			}

			const summaryLines: string[] = [];
			const trimmed = result.stdout.trim();
			if (trimmed.length > 0) {
				summaryLines.push(...trimmed.split('\n').slice(-5));
			}

			const normalizedSummary = result.stderr
				.trim()
				.split('\n')
				.filter(Boolean)
				.slice(-3);
			summaryLines.push(...normalizedSummary);

			return { summaryLines } satisfies TaskResult;
		},
	});

	tasks.push({
		title: 'Finalize staged changes',
		async run(ctx) {
			ctx.update('git add --update');
			const result = await runCommand('git', ['add', '--update']);
			if (result.code !== 0) {
				throw new CommandError('git add --update', result);
			}
		},
	});

	await runTasks(tasks);
}

main().catch(() => {
	process.exitCode = 1;
});
