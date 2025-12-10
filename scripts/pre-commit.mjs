#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
	getStagedFiles,
	isDocumentationFile,
	isRepoWideChange,
	loadWorkspaceGraph,
	resolveAffectedFromFiles,
	buildFilterArgs,
	runTasks,
	runCommand,
	createConcurrentTask,
	CommandError,
	colors,
	findMissingTypeArtifacts,
	collectWorkspaceDependencies,
} from './precommit-utils.mjs';

async function readRootPackageJson() {
	const abs = path.resolve(process.cwd(), 'package.json');
	const raw = await fs.readFile(abs, 'utf8');
	return JSON.parse(raw);
}

async function main() {
	const stagedFiles = await getStagedFiles();
	const hasStaged = stagedFiles.length > 0;

	// 1) doc vs non-doc
	const nonDocs = stagedFiles.filter((f) => !isDocumentationFile(f));
	const hasNonDocChanges = nonDocs.length > 0;

	// 2) repo-wide (tsconfig.*, root package.json, scripts/, etc.)
	const repoWide = stagedFiles.some((f) => isRepoWideChange(f));

	/** @type {import('./precommit-utils.mjs').Task[]} */
	const tasks = [];

	/* ---------------------------------------------------------------------- */
	/* 1) lint-staged                                                          */
	/* ---------------------------------------------------------------------- */
	tasks.push({
		title: 'Lint staged files',
		enabled: hasStaged,
		skipMessage: 'No staged files - skipping lint-staged.',
		async run(ctx) {
			ctx.update('pnpm lint-staged');
			const res = await runCommand('pnpm', ['lint-staged']);
			if (res.code !== 0) {
				throw new CommandError('pnpm lint-staged', res);
			}
			// drop the useless “could not find...” line
			const cleaned = res.stdout
				.split('\n')
				.filter(
					(line) =>
						!line.includes(
							'lint-staged could not find any staged files matching configured tasks.',
						),
				)
				.map((line) => line.trim())
				.filter(Boolean);
			return { summaryLines: cleaned.slice(-5) };
		},
	});

	/* ---------------------------------------------------------------------- */
	/* 2) figure out affected workspaces (for TYPECHECK ONLY)                  */
	/* ---------------------------------------------------------------------- */
	let filters = [];
	let graph = null;
	if (hasNonDocChanges) {
		graph = await loadWorkspaceGraph();

		if (repoWide) {
			// rule 3: repo-wide → everybody
			const nonExampleWorkspaces = graph.workspaces.filter(
				(ws) => !ws.dir.replace(/\\/g, '/').includes('/examples/')
			);
			filters = nonExampleWorkspaces.map((ws) => ws.name);
		} else {
			// rule 1: use the graph to know what to typecheck
			const { filters: f } = resolveAffectedFromFiles(nonDocs, graph);
			filters = f;
		}
	}

	if (hasNonDocChanges) {
		const baseNames = repoWide && graph ? graph.workspaces.map((ws) => ws.name) : filters;
		const namesToCheck = graph
			? collectWorkspaceDependencies(baseNames, graph)
			: [];
		tasks.push({
			title: 'Check package builds',
			enabled: (namesToCheck?.length ?? 0) > 0,
			skipMessage: 'No workspaces selected for typechecking.',
			async run() {
				if (!graph) {
					return { summaryLines: [] };
				}
				const missing = await findMissingTypeArtifacts(namesToCheck, graph);
				if (missing.length > 0) {
					const details = missing
						.map(
							(entry) =>
								`${entry.workspace} → missing ${entry.artifact}`,
						)
						.join('\n');
					throw new Error(
						`Build artifacts required for typechecks are missing:\n${details}\nRun \u0060pnpm --filter <workspace>... build\u0060 (or \u0060pnpm build:packages\u0060) before committing.`,
					);
				}
				return {
					summaryLines: [`Checked ${namesToCheck.length} workspaces`],
				};
			},
		});
	}

	/* ---------------------------------------------------------------------- */
	/* 3) typechecks (src + tests) together, fail fast                         */
	/* ---------------------------------------------------------------------- */
	if (hasNonDocChanges) {
		const srcArgs = buildFilterArgs(filters, 'typecheck');
		const testsArgs = buildFilterArgs(filters, 'typecheck:tests');

		tasks.push(
			createConcurrentTask({
				title: repoWide ? 'Typecheck (repo-wide)' : 'Typecheck (affected)',
				commands: [
					{
						cmd: 'pnpm',
						args: srcArgs,
						label: 'ts',
						env: { PRECOMMIT: '1' },
					},
					{
						cmd: 'pnpm',
						args: testsArgs,
						label: 'ts:tests',
						env: { PRECOMMIT: '1' },
					},
				],
				summaryLines: (results) =>
					results.map((r) => {
						const secs = Math.round(r.result.durationMs / 1000);
						return `${r.command.label ?? r.command.cmd} - ${secs}s`;
					}),
			}),
		);
	} else {
		tasks.push({
			title: 'Typecheck',
			enabled: false,
			skipMessage: 'Docs-only changes - skipping typechecks.',
			async run() { },
		});
	}

	/* ---------------------------------------------------------------------- */
	/* 4) tests                      */
	/* ---------------------------------------------------------------------- */
	if (hasNonDocChanges) {
		const rootPkg = await readRootPackageJson();
		const scripts = rootPkg.scripts ?? {};

		/** @type {Array<{cmd: string, args: string[], label?: string, env?: NodeJS.ProcessEnv}>} */
		const testCommands = [];

		if (typeof scripts['test:coverage'] === 'string') {
			testCommands.push({
				cmd: 'pnpm',
				args: ['test:coverage'],
				label: 'cov',
				env: { PRECOMMIT: '1' },
			});
		}
		// if (typeof scripts['test:integration'] === 'string') {
		// 	testCommands.push({
		// 		cmd: 'pnpm',
		// 		args: ['test:integration'],
		// 		label: 'int',
		// 		env: { PRECOMMIT: '1' },
		// 	});
		// }
		if (testCommands.length === 0 && typeof scripts.test === 'string') {
			testCommands.push({
				cmd: 'pnpm',
				args: ['test'],
				label: 'test',
				env: { PRECOMMIT: '1' },
			});
		}

		if (testCommands.length > 0) {
			// IMPORTANT: sequential, so timings stay close to naked runs
			tasks.push({
				title: 'Run tests (estimated 90s)',
				async run() {
					const lines = [];
					for (const t of testCommands) {
						const res = await runCommand(t.cmd, t.args, { env: t.env });
						if (res.code !== 0) {
							throw new CommandError(
								`${t.cmd} ${t.args.join(' ')}`,
								res,
							);
						}
						const secs = Math.round(res.durationMs / 1000);
						lines.push(`${t.label ?? t.cmd} - ${secs}s`);
					}
					return { summaryLines: lines };
				},
			});
		} else {
			tasks.push({
				title: 'Run tests',
				enabled: false,
				skipMessage: 'Root package.json has no test scripts.',
				async run() { },
			});
		}
	} else {
		tasks.push({
			title: 'Run tests',
			enabled: false,
			skipMessage: 'Docs-only changes - skipping tests.',
			async run() { },
		});
	}

	await runTasks(tasks);
}

main().catch((err) => {
	console.error(colors.red(err?.message ?? String(err)));
	process.exit(1);
});
