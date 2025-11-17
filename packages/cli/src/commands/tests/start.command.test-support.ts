import { EventEmitter } from 'node:events';
import type * as fs from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type { FSWatcher } from 'chokidar';
import type { Command } from 'clipanion';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	assignCommandContext,
	createCommandReporterHarness,
	flushAsync,
	type CommandReporterHarness,
	type ReporterMock,
	type MemoryStream,
} from '@wpkernel/test-utils/cli';
import { buildStartCommand, type FileSystem } from '../start';
import type { PackageManager } from '../init/types';
import type { GenerateRunner } from '../start/generate-runner';
import type { GenerateResult } from '../generate/types';
import { loadTestLayoutSync } from '../../tests/layout.test-support';
import path from 'node:path';

export const FAST_DEBOUNCE_MS = 200;
export const SLOW_DEBOUNCE_MS = 600;

export const fsAccess: jest.MockedFunction<typeof fs.access> = jest.fn();
export const fsMkdir: jest.MockedFunction<typeof fs.mkdir> = jest.fn();
export const fsCp: jest.MockedFunction<typeof fs.cp> = jest.fn();

// Use a typeof import so we keep inferred arg types without triggering lint
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type WatchFactory = ReturnType<(typeof import('chokidar'))['watch']>;

export const loadWatch = jest.fn<Promise<WatchFactory>, []>();
export const watchFactory = jest.fn<
	ReturnType<WatchFactory>,
	Parameters<WatchFactory>
>();
export const spawnViteProcess = jest.fn<
	ChildProcessWithoutNullStreams,
	[PackageManager]
>();
export const runGenerate: jest.MockedFunction<GenerateRunner> = jest.fn();

export const reporterHarness = createCommandReporterHarness();
export const reporterFactory = reporterHarness.factory;

export interface StartCommandTestContext {
	readonly command: StartCommandInstance;
	readonly watcher: FakeWatcher;
	readonly stdout: MemoryStream;
	readonly reporterHarness: CommandReporterHarness;
	readonly shutdown: (
		signals?: NodeJS.Signals | readonly NodeJS.Signals[]
	) => Promise<void>;
}

export function setupStartCommandTest(): void {
	jest.useFakeTimers();
	fsAccess.mockResolvedValue(undefined);
	fsMkdir.mockResolvedValue(undefined);
	fsCp.mockResolvedValue(undefined);
	runGenerate.mockResolvedValue({
		exitCode: WPK_EXIT_CODES.SUCCESS,
		summary: {
			counts: { written: 0, unchanged: 0, skipped: 0 },
			entries: [],
			dryRun: false,
		},
		output: '[summary]\n',
	} satisfies GenerateResult);
	loadWatch.mockResolvedValue(watchFactory);
	watchFactory.mockImplementation(
		() => new FakeWatcher() as unknown as FSWatcher
	);
	spawnViteProcess.mockImplementation(
		() =>
			new FakeChildProcess() as unknown as ChildProcessWithoutNullStreams
	);
	reporterHarness.reset();
}

export function teardownStartCommandTest(): void {
	jest.useRealTimers();
	jest.clearAllMocks();
}

export async function withStartCommand(
	run: (context: StartCommandTestContext) => Promise<void> | void,
	options: StartCommandOptions = {}
): Promise<void> {
	const { command, watcher, stdout, executePromise } =
		await buildCommand(options);
	let hasShutdown = false;

	const shutdown = async (
		signals?: NodeJS.Signals | readonly NodeJS.Signals[]
	): Promise<void> => {
		if (hasShutdown) {
			return;
		}
		hasShutdown = true;
		await shutdownCommand(executePromise, signals);
	};

	try {
		await run({
			command,
			watcher,
			stdout,
			reporterHarness,
			shutdown,
		});
	} finally {
		await shutdown();
	}
}

export function createStartCommandInstance(
	overrides: Partial<StartCommandDependencies> = {}
) {
	const fileSystem: FileSystem = {
		access: fsAccess,
		mkdir: fsMkdir,
		cp: fsCp,
	};

	const StartCommand = buildStartCommand({
		loadWatch,
		spawnViteProcess,
		buildReporter: reporterFactory,
		runGenerate,
		fileSystem,
		...overrides,
	}) as StartCommandConstructor;

	const command = new StartCommand();
	assignCommandContext(command);
	return command;
}

export async function emitChange(
	watcher: FakeWatcher,
	file: string,
	event: 'add' | 'change' = 'change'
): Promise<void> {
	watcher.emit('all', event, file);
	await flushAsync({ runAllTimers: true });
}

export async function advanceBy(milliseconds: number): Promise<void> {
	await jest.advanceTimersByTimeAsync(milliseconds);
	await flushAsync({ runAllTimers: true });
}

export const advanceFastDebounce = (offset = 0): Promise<void> =>
	advanceBy(FAST_DEBOUNCE_MS + offset);

export const advanceSlowDebounce = (offset = 0): Promise<void> =>
	advanceBy(SLOW_DEBOUNCE_MS + offset);

export async function expectEventually(assertion: () => void): Promise<void> {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		try {
			assertion();
			return;
		} catch (error) {
			if (attempt === 4) {
				throw error;
			}
			await flushAsync({ runAllTimers: true });
		}
	}
}

export function getReporterChild(
	reporter: ReporterMock,
	namespace: string
): ReporterMock {
	const index = reporter.child.mock.calls.findIndex(
		([label]) => label === namespace
	);
	if (index === -1) {
		throw new Error(`Reporter child ${namespace} not found`);
	}
	return reporter.child.mock.results[index]!.value as ReporterMock;
}

type StartCommandOptions = {
	readonly autoApply?: boolean;
	readonly beforeInstantiate?: (
		StartCommand: ReturnType<typeof buildStartCommand>
	) => void;
} & Partial<StartCommandDependencies>;

type StartCommandDependencies = Parameters<typeof buildStartCommand>[0];

type StartCommandInstance = Command & { autoApply: boolean };
type StartCommandConstructor = new () => StartCommandInstance;

export class FakeWatcher extends EventEmitter {
	close = jest.fn(async () => {
		this.emit('close');
	});
}

export class FakeChildProcess extends EventEmitter {
	stdin = new PassThrough();
	stdout = new PassThrough();
	stderr = new PassThrough();
	killed = false;

	kill = jest.fn((signal?: NodeJS.Signals) => {
		if (this.killed) {
			return false;
		}
		this.killed = true;
		queueMicrotask(() => {
			this.emit('exit', 0, signal ?? null);
		});
		return true;
	});
}

async function buildCommand({
	autoApply = false,
	beforeInstantiate,
	...overrides
}: StartCommandOptions = {}) {
	const fileSystem: FileSystem = {
		access: fsAccess,
		mkdir: fsMkdir,
		cp: fsCp,
	};

	const StartCommand = buildStartCommand({
		loadWatch,
		spawnViteProcess,
		buildReporter: reporterFactory,
		runGenerate,
		fileSystem,
		...overrides,
	}) as StartCommandConstructor;

	const layout = loadTestLayoutSync();
	const defaultLayoutPaths = (() => {
		try {
			return {
				phpGenerated: layout.resolve('php.generated'),
				phpTargetDir: path.posix.dirname(
					layout.resolve('controllers.applied')
				),
			};
		} catch {
			return {
				phpGenerated: layout.resolve('php.generated'),
				phpTargetDir: 'inc',
			};
		}
	})();

	(
		StartCommand.prototype as unknown as {
			resolveLayoutPaths: jest.Mock<
				Promise<typeof defaultLayoutPaths>,
				[]
			>;
		}
	).resolveLayoutPaths = jest.fn(async () => defaultLayoutPaths);

	beforeInstantiate?.(StartCommand);

	const command = new StartCommand();
	command.autoApply = autoApply;
	const { stdout } = assignCommandContext(command);

	const executePromise = command.execute() as Promise<number>;
	await flushAsync({ runAllTimers: true });

	const watcher = watchFactory.mock.results[0]
		?.value as unknown as FakeWatcher;
	if (!watcher) {
		throw new Error('Expected watcher to be created');
	}

	return { command, watcher, stdout, executePromise };
}

async function shutdownCommand(
	executePromise: Promise<number>,
	signals?: NodeJS.Signals | readonly NodeJS.Signals[]
): Promise<void> {
	let normalized: readonly NodeJS.Signals[];
	if (signals) {
		normalized = Array.isArray(signals) ? signals : [signals];
	} else {
		normalized = ['SIGINT'];
	}

	for (const signal of normalized) {
		process.emit(signal);
	}
	await flushAsync({ runAllTimers: true });
	await executePromise;
}
