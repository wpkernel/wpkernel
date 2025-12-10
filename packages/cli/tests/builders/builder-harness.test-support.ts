import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { Reporter } from '@wpkernel/core/reporter';
import { createReporterMock } from '../reporter.js';
import type { ReporterMock, ReporterMockOptions } from '../reporter.js';
import { makeWorkspaceMock } from '../workspace.test-support.js';
import type { WorkspaceMockOptions } from '../workspace.test-support.js';
import type { Workspace } from '../../src/workspace/types.js';
import type { BuilderOutput } from '../../src/runtime/types.js';
import { ensureLayoutManifest } from '../layout-manifest.test-support.js';

export interface BuilderHarnessContext<
	TWorkspace extends Workspace = Workspace,
> {
	readonly workspace: TWorkspace;
	readonly root: string;
}

export interface WorkspaceFactoryOptions<
	TWorkspace extends Workspace = Workspace,
> {
	readonly createWorkspace?: (
		root: string
	) => Promise<TWorkspace> | TWorkspace;
}

export async function withWorkspace<TWorkspace extends Workspace = Workspace>(
	run: (context: BuilderHarnessContext<TWorkspace>) => Promise<void>,
	options: WorkspaceFactoryOptions<TWorkspace> = {}
): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-harness-'));
	const previousCwd = process.cwd();
	try {
		await ensureLayoutManifest(root);
		process.chdir(root);
		const workspace = (await (options.createWorkspace
			? options.createWorkspace(root)
			: makeWorkspaceMock({
					root,
				} as WorkspaceMockOptions<TWorkspace>))) as Awaited<TWorkspace>;
		await run({ workspace, root });
	} finally {
		process.chdir(previousCwd);
		await fs.rm(root, { recursive: true, force: true });
	}
}

export function buildReporter(
	options?: ReporterMockOptions
): ReporterMock & Reporter {
	return createReporterMock(options);
}

type BuilderWriteAction = BuilderOutput['actions'][number];

export function buildOutput<
	TAction extends BuilderWriteAction = BuilderWriteAction,
>(): BuilderOutput & { queueWrite: jest.Mock<void, [TAction]> } {
	const actions: BuilderOutput['actions'] = [];
	const queueWrite = jest.fn((action: TAction) => {
		actions.push(action);
	});

	return {
		actions,
		queueWrite,
	} as BuilderOutput & { queueWrite: jest.Mock<void, [TAction]> };
}

export function normalise(candidate: string): string {
	return candidate.split(path.sep).join('/');
}

export function prefixRelative(candidate: string): string {
	if (candidate.startsWith('.')) {
		return candidate;
	}

	return `./${candidate}`;
}
