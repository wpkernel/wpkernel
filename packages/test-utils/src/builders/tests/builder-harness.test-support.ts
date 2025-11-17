import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { Reporter } from '@wpkernel/core/reporter';
import { createReporterMock } from '../../shared/reporter.js';
import type {
	ReporterMock,
	ReporterMockOptions,
} from '../../shared/reporter.js';
import { makeWorkspaceMock } from '../../workspace.test-support.js';
import type {
	BuilderOutputLike,
	BuilderWriteActionLike,
	WorkspaceLike,
} from '../../types.js';
import { ensureLayoutManifest } from '../../layout-manifest.test-support.js';

export interface BuilderHarnessContext<
	TWorkspace extends WorkspaceLike = WorkspaceLike,
> {
	readonly workspace: TWorkspace;
	readonly root: string;
}

export interface WorkspaceFactoryOptions<
	TWorkspace extends WorkspaceLike = WorkspaceLike,
> {
	readonly createWorkspace?: (
		root: string
	) => Promise<TWorkspace> | TWorkspace;
}

export async function withWorkspace<
	TWorkspace extends WorkspaceLike = WorkspaceLike,
>(
	run: (context: BuilderHarnessContext<TWorkspace>) => Promise<void>,
	options: WorkspaceFactoryOptions<TWorkspace> = {}
): Promise<void> {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), 'builder-harness-'));
	try {
		await ensureLayoutManifest(root);
		const workspace = (await (options.createWorkspace
			? options.createWorkspace(root)
			: makeWorkspaceMock({ root }))) as TWorkspace;
		await run({ workspace, root });
	} finally {
		await fs.rm(root, { recursive: true, force: true });
	}
}

export function buildReporter(
	options?: ReporterMockOptions
): ReporterMock & Reporter {
	return createReporterMock(options);
}

export function buildOutput<
	TAction extends
		BuilderWriteActionLike = BuilderOutputLike['actions'][number],
>(): BuilderOutputLike<TAction> & {
	queueWrite: jest.Mock<void, [TAction]>;
} {
	const actions: BuilderOutputLike<TAction>['actions'] = [];
	const queueWrite = jest.fn((action: TAction) => {
		actions.push(action);
	});

	return { actions, queueWrite } as BuilderOutputLike<TAction> & {
		queueWrite: jest.Mock<void, [TAction]>;
	};
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
