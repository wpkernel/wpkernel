import os from 'node:os';
import path from 'node:path';
import type { Workspace, FileManifest } from '../../src/workspace/types';
import {
	makeWorkspaceMock,
	type WorkspaceMockOptions,
} from '../workspace.test-support.js';

export interface CommandWorkspaceHarnessOptions {
	readonly root?: string;
	readonly files?: Record<string, Buffer | string>;
	readonly manifestFactory?: () => FileManifest;
}

export interface CommandWorkspaceHarness<
	TWorkspace extends Workspace = Workspace,
> {
	readonly workspace: TWorkspace;
	readonly files: Map<string, Buffer>;
	readonly resolve: (file: string) => string;
	readonly get: (file: string) => Buffer | undefined;
	readonly getText: (file: string) => string | null;
	readonly has: (file: string) => boolean;
}

function normaliseBuffer(value: Buffer | string): Buffer {
	return Buffer.isBuffer(value)
		? Buffer.from(value)
		: Buffer.from(value, 'utf8');
}

export function createCommandWorkspaceHarness<
	TWorkspace extends Workspace = Workspace,
>(
	options: CommandWorkspaceHarnessOptions = {}
): CommandWorkspaceHarness<TWorkspace> {
	const root =
		options.root ??
		path.join(
			os.tmpdir(),
			`wpk-cli-workspace-${Math.random().toString(16).slice(2)}`
		);
	const files = new Map<string, Buffer>();

	if (options.files) {
		for (const [relativePath, value] of Object.entries(options.files)) {
			const resolved = path.resolve(root, relativePath);
			files.set(resolved, normaliseBuffer(value));
		}
	}

	const resolvePath = (file: string) =>
		path.isAbsolute(file) ? path.normalize(file) : path.resolve(root, file);

	const manifestFactory: () => FileManifest =
		options.manifestFactory ?? (() => ({ writes: [], deletes: [] }));

	const read = jest.fn(
		async (file: string) => files.get(resolvePath(file)) ?? null
	);
	const readText = jest.fn(async (file: string) => {
		const buffer = files.get(resolvePath(file));
		return buffer ? buffer.toString('utf8') : null;
	});
	const write = jest.fn(async (file: string, data: Buffer | string) => {
		files.set(resolvePath(file), normaliseBuffer(data));
	});
	const writeJson = jest.fn(
		async (
			file: string,
			value: unknown,
			jsonOptions?: { pretty?: boolean }
		) => {
			const spacing = jsonOptions?.pretty ? 2 : undefined;
			const serialised = JSON.stringify(value, null, spacing);
			files.set(resolvePath(file), Buffer.from(serialised, 'utf8'));
		}
	);
	const exists = jest.fn(async (file: string) =>
		files.has(resolvePath(file))
	);
	const rm = jest.fn(async (file: string) => {
		files.delete(resolvePath(file));
	});
	const glob = jest.fn(async () =>
		Array.from(files.keys()).map((entry) => path.relative(root, entry))
	);
	const threeWayMerge = jest.fn(async () => 'clean' as const);
	const begin = jest.fn();
	const commit = jest.fn(async () => manifestFactory());
	const rollback = jest.fn(async () => manifestFactory());
	const dryRun = jest.fn(async <T>(fn: () => Promise<T>) => ({
		result: await fn(),
		manifest: manifestFactory(),
	}));
	const tmpDir = jest.fn(async (prefix = 'workspace-') =>
		path.join(
			root,
			'.tmp',
			`${prefix}${Math.random().toString(16).slice(2)}`
		)
	);
	const resolve = (...parts: string[]) => path.resolve(root, ...parts);

	const workspace = makeWorkspaceMock({
		root,
		cwd: () => root,
		read,
		readText,
		write,
		writeJson,
		exists,
		rm,
		glob,
		threeWayMerge,
		begin,
		commit,
		rollback,
		dryRun,
		tmpDir,
		resolve,
	} as WorkspaceMockOptions<Workspace>) as TWorkspace;

	const get = (file: string) => files.get(resolvePath(file));
	const getText = (file: string) => {
		const buffer = files.get(resolvePath(file));
		return buffer ? buffer.toString('utf8') : null;
	};
	const has = (file: string) => files.has(resolvePath(file));

	return {
		workspace,
		files,
		resolve: resolvePath,
		get,
		getText,
		has,
	};
}
