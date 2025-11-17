import path from 'node:path';
import type { FSWatcher } from 'chokidar';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import {
	assignCommandContext,
	type ReporterMock,
} from '@wpkernel/test-utils/cli';
import { buildStartCommand } from '../start';
import {
	advanceBy,
	advanceFastDebounce,
	advanceSlowDebounce,
	createStartCommandInstance,
	emitChange,
	expectEventually,
	FakeChildProcess,
	FakeWatcher,
	FAST_DEBOUNCE_MS,
	fsAccess,
	fsCp,
	fsMkdir,
	getReporterChild,
	loadWatch,
	reporterFactory,
	reporterHarness,
	setupStartCommandTest,
	spawnViteProcess,
	teardownStartCommandTest,
	watchFactory,
	runGenerate,
	withStartCommand,
} from '../tests/start.command.test-support';
import { resolveStartLayoutPaths } from '../start/layout';

describe('buildStartCommand', () => {
	beforeEach(setupStartCommandTest);
	afterEach(teardownStartCommandTest);

	it('performs initial generation and responds to fast changes', async () => {
		let watcher: FakeWatcher | undefined;
		let stdout = '';

		await withStartCommand(async (context) => {
			watcher = context.watcher;
			expect(runGenerate).toHaveBeenCalledTimes(1);

			await emitChange(context.watcher, 'wpk.config.ts');
			expect(runGenerate).toHaveBeenCalledTimes(1);

			await advanceBy(FAST_DEBOUNCE_MS - 1);
			expect(runGenerate).toHaveBeenCalledTimes(1);

			await advanceBy(1);
			expect(runGenerate).toHaveBeenCalledTimes(2);

			stdout = context.stdout.toString();
		});

		expect(watcher?.close).toHaveBeenCalledTimes(1);
		expect(stdout).toContain('[summary]');
	});

	it('uses slow debounce for schema changes and overrides fast triggers', async () => {
		await withStartCommand(async ({ watcher }) => {
			await emitChange(watcher, 'wpk.config.ts');
			await emitChange(
				watcher,
				path.join('contracts', 'job.schema.json')
			);

			await advanceFastDebounce();
			expect(runGenerate).toHaveBeenCalledTimes(1);

			await advanceSlowDebounce();
			expect(runGenerate).toHaveBeenCalledTimes(2);
		});
	});

	it('handles watcher errors without crashing', async () => {
		await withStartCommand(async ({ watcher }) => {
			watcher.emit('error', new Error('watcher failure'));
			await emitChange(watcher, 'wpk.config.ts');

			await advanceFastDebounce(1);
			expect(runGenerate).toHaveBeenCalledTimes(2);
		});
	});

	it('auto-applies PHP artifacts when enabled', async () => {
		await withStartCommand(
			async ({ command, watcher }) => {
				expect(fsMkdir).toHaveBeenCalledTimes(1);
				await expectEventually(() => {
					expect(fsCp).toHaveBeenCalledTimes(1);
				});

				await emitChange(watcher, 'wpk.config.ts');
				await advanceFastDebounce(1);

				expect(runGenerate).toHaveBeenCalledTimes(2);
				await expectEventually(() => {
					expect(fsCp).toHaveBeenCalledTimes(2);
				});
				expect(command.autoApply).toBe(true);
			},
			{ autoApply: true }
		);
	});

	it('skips auto-apply when PHP artifacts are missing', async () => {
		fsAccess.mockRejectedValueOnce(new Error('missing output'));

		await withStartCommand(
			async () => {
				// no-op: wait for command lifecycle
			},
			{ autoApply: true }
		);

		expect(fsCp).not.toHaveBeenCalled();
	});

	it('queues additional changes while a run is in progress', async () => {
		let resolveFirst: (() => void) | undefined;
		const successResult = {
			exitCode: WPK_EXIT_CODES.SUCCESS,
			summary: {
				counts: {
					written: 0,
					unchanged: 0,
					skipped: 0,
				},
				entries: [],
				dryRun: false,
			},
			output: '[summary]\n',
		};

		runGenerate.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveFirst = () => resolve(successResult);
				})
		);
		runGenerate.mockResolvedValue(successResult);

		await withStartCommand(async ({ watcher, shutdown }) => {
			await emitChange(watcher, 'wpk.config.ts');
			await advanceFastDebounce(1);
			expect(runGenerate).toHaveBeenCalledTimes(1);

			resolveFirst?.();
			await advanceFastDebounce(1);
			expect(runGenerate).toHaveBeenCalledTimes(2);

			await shutdown(['SIGINT', 'SIGTERM']);
		});
	});

	it('clears pending timers when shutting down with queued triggers', async () => {
		await withStartCommand(async ({ watcher, shutdown }) => {
			await emitChange(watcher, 'wpk.config.ts');
			await shutdown();
		});

		expect(runGenerate).toHaveBeenCalledTimes(1);
	});

	it('restarts debounce timers when repeated fast events arrive', async () => {
		await withStartCommand(async ({ watcher }) => {
			await emitChange(watcher, 'wpk.config.ts');
			await emitChange(watcher, 'wpk.config.ts');

			await advanceBy(FAST_DEBOUNCE_MS - 1);
			expect(runGenerate).toHaveBeenCalledTimes(1);

			await advanceBy(1);
			expect(runGenerate).toHaveBeenCalledTimes(2);
		});
	});

	it('retains queued triggers while generation is running', async () => {
		let resolveGeneration: ((result: unknown) => void) | null = null;
		runGenerate
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveGeneration = resolve;
					})
			)
			.mockResolvedValueOnce({
				exitCode: WPK_EXIT_CODES.SUCCESS,
				summary: {
					counts: { written: 0, unchanged: 0, skipped: 0 },
					entries: [],
					dryRun: false,
				},
				output: '[summary]\n',
			});

		await withStartCommand(
			async ({ watcher, reporterHarness: harness }) => {
				const reporter = harness.at(0)!;

				await emitChange(watcher, 'wpk.config.ts');
				await emitChange(watcher, 'wpk.config.ts');

				expect(reporter.debug).toHaveBeenCalledWith(
					'Queueing change while generation is running.',
					expect.objectContaining({
						event: 'change',
						file: 'wpk.config.ts',
						tier: 'fast',
					})
				);

				resolveGeneration?.({
					exitCode: WPK_EXIT_CODES.SUCCESS,
					summary: {
						counts: { written: 0, unchanged: 0, skipped: 0 },
						entries: [],
						dryRun: false,
					},
					output: '[summary]\n',
				});
				await advanceFastDebounce();
			}
		);
	});

	it('reports unexpected errors from the generation cycle', async () => {
		const failure = new Error('cycle failure');
		let runCycleSpy: jest.SpyInstance | undefined;

		await withStartCommand(
			async ({ reporterHarness: harness }) => {
				const reporter = harness.at(0)!;
				await expectEventually(() => {
					expect(reporter.error).toHaveBeenCalledWith(
						'Unexpected error during generation cycle.',
						expect.objectContaining({
							message: failure.message,
						})
					);
				});
			},
			{
				beforeInstantiate: (StartCommand) => {
					runCycleSpy = jest
						.spyOn(
							StartCommand.prototype as unknown as {
								runCycle: (typeof StartCommand.prototype)['runCycle'];
							},
							'runCycle'
						)
						.mockRejectedValueOnce(failure)
						.mockResolvedValue(undefined);
				},
			}
		);

		runCycleSpy?.mockRestore();
	});

	it('warns when generation completes with errors', async () => {
		const command = createStartCommandInstance();
		const reporter = reporterHarness.create();
		const generateReporter = reporterHarness.create();

		runGenerate.mockReset();
		runGenerate.mockResolvedValue({
			exitCode: WPK_EXIT_CODES.SUCCESS,
			summary: {
				counts: { written: 0, unchanged: 0, skipped: 0 },
				entries: [],
				dryRun: false,
			},
			output: '[summary]\n',
		});
		runGenerate.mockImplementationOnce(async () => ({
			exitCode: WPK_EXIT_CODES.UNEXPECTED_ERROR,
			summary: null,
			output: null,
		}));

		await (
			command as unknown as {
				runCycle: (options: {
					trigger: {
						tier: 'fast' | 'slow';
						event: string;
						file: string;
					};
					reporter: ReturnType<typeof reporterHarness.create>;
					generateReporter: ReturnType<typeof reporterHarness.create>;
				}) => Promise<void>;
			}
		).runCycle({
			trigger: {
				tier: 'fast',
				event: 'change',
				file: 'wpk.config.ts',
			},
			reporter,
			generateReporter,
		});

		expect(runGenerate).toHaveBeenCalledTimes(1);
		await expect(runGenerate.mock.results[0]?.value).resolves.toEqual(
			expect.objectContaining({
				exitCode: WPK_EXIT_CODES.UNEXPECTED_ERROR,
			})
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Generation completed with errors.',
			{ exitCode: WPK_EXIT_CODES.UNEXPECTED_ERROR }
		);
		expect(generateReporter.warn).not.toHaveBeenCalled();
	});

	it('logs errors when the generation pipeline throws', async () => {
		const command = createStartCommandInstance();
		const reporter = reporterHarness.create();
		const generateReporter = reporterHarness.create();
		const failure = new Error('pipeline failure');

		runGenerate.mockReset();
		runGenerate.mockResolvedValue({
			exitCode: WPK_EXIT_CODES.SUCCESS,
			summary: {
				counts: { written: 0, unchanged: 0, skipped: 0 },
				entries: [],
				dryRun: false,
			},
			output: '[summary]\n',
		});
		runGenerate.mockImplementationOnce(async () => {
			throw failure;
		});

		await (
			command as unknown as {
				runCycle: (options: {
					trigger: {
						tier: 'fast' | 'slow';
						event: string;
						file: string;
					};
					reporter: ReturnType<typeof reporterHarness.create>;
					generateReporter: ReturnType<typeof reporterHarness.create>;
				}) => Promise<void>;
			}
		).runCycle({
			trigger: {
				tier: 'fast',
				event: 'change',
				file: 'wpk.config.ts',
			},
			reporter,
			generateReporter,
		});

		expect(runGenerate).toHaveBeenCalledTimes(1);
		await expect(runGenerate.mock.results[0]?.value).rejects.toThrow(
			'pipeline failure'
		);
		expect(reporter.error).toHaveBeenCalledWith(
			'Generation pipeline failed to execute.',
			expect.objectContaining({ message: failure.message })
		);
	});

	it('logs watcher errors', async () => {
		let reporter: ReporterMock | undefined;

		await withStartCommand(
			async ({ watcher, reporterHarness: harness }) => {
				reporter = harness.at(0)!;
				watcher.emit('error', new Error('watch failure'));
			}
		);

		expect(reporter?.error).toHaveBeenCalledWith(
			'Watcher error.',
			expect.objectContaining({ message: 'watch failure' })
		);
	});

	it('warns when watcher close fails during shutdown', async () => {
		watchFactory.mockImplementationOnce(() => {
			const watcher = new FakeWatcher();
			watcher.close.mockRejectedValueOnce(new Error('close failure'));
			return watcher as unknown as FSWatcher;
		});

		let reporter: ReporterMock | undefined;
		await withStartCommand(async ({ reporterHarness: harness }) => {
			reporter = harness.at(0)!;
		});

		expect(reporter?.warn).toHaveBeenCalledWith(
			'Failed to close watcher.',
			expect.objectContaining({ message: 'close failure' })
		);
	});

	it('stops the Vite dev server on shutdown', async () => {
		let child: FakeChildProcess | undefined;
		await withStartCommand(async () => {
			child = spawnViteProcess.mock.results[0]!.value;
		});

		expect(child?.kill).toHaveBeenCalledWith('SIGINT');
	});

	it('passes the requested package manager to the Vite spawner', async () => {
		const command = createStartCommandInstance();
		const startCommand = command as unknown as {
			packageManagerValue: string;
		};
		startCommand.packageManagerValue = 'yarn';

		const executePromise = command.execute();
		await advanceFastDebounce();
		process.emit('SIGINT');
		await advanceFastDebounce();
		await executePromise;

		expect(spawnViteProcess).toHaveBeenCalledWith('yarn');
	});

	it('spawns Vite using the default implementation when no override is provided', async () => {
		jest.resetModules();
		const spawnMock = jest.fn(() => new FakeChildProcess());
		const generateStub = jest.fn().mockResolvedValue({
			exitCode: WPK_EXIT_CODES.SUCCESS,
			summary: {
				counts: { written: 0, unchanged: 0, skipped: 0 },
				entries: [],
				dryRun: false,
			},
			output: null,
		});
		jest.doMock('node:child_process', () => ({
			spawn: spawnMock,
			execFile: jest.fn(),
		}));

		const { buildStartCommand: importBuildStartCommand } = await import(
			'../start'
		);

		const StartCommand = importBuildStartCommand({
			loadWatch,
			buildReporter: reporterFactory,
			runGenerate: generateStub,
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
		});

		const command = new StartCommand();
		assignCommandContext(command);

		const executePromise = command.execute();
		await advanceFastDebounce();
		process.emit('SIGINT');
		await advanceFastDebounce();
		await executePromise;

		expect(spawnMock).toHaveBeenCalledWith(
			'npm',
			['exec', 'vite'],
			expect.objectContaining({ cwd: process.cwd() })
		);

		jest.resetModules();
		jest.dontMock('node:child_process');
		jest.unmock('node:child_process');
	});

	it('logs debug output when the Vite dev server is already stopped', async () => {
		spawnViteProcess.mockImplementationOnce(() => {
			const child = new FakeChildProcess();
			child.kill.mockImplementation(() => {
				queueMicrotask(() => child.emit('exit', 0, null));
				return false;
			});
			return child;
		});

		let reporter: ReporterMock | undefined;
		await withStartCommand(async ({ reporterHarness: harness }) => {
			reporter = harness.at(0)!;
		});

		const viteReporter = getReporterChild(reporter!, 'vite');
		expect(viteReporter.debug).toHaveBeenCalledWith(
			'Vite dev server already stopped.'
		);
	});

	it('warns when the Vite dev server requires SIGTERM to exit', async () => {
		spawnViteProcess.mockImplementationOnce(() => {
			const child = new FakeChildProcess();
			let sigintHandled = false;
			child.kill.mockImplementation((signal?: NodeJS.Signals) => {
				if (signal === 'SIGINT') {
					sigintHandled = true;
					return true;
				}
				if (signal === 'SIGTERM' && sigintHandled) {
					child.killed = true;
					queueMicrotask(() => child.emit('exit', 0, signal ?? null));
					return true;
				}
				return false;
			});
			return child;
		});

		let reporter: ReporterMock | undefined;
		await withStartCommand(async ({ reporterHarness: harness }) => {
			reporter = harness.at(0)!;
			process.emit('SIGINT');
			await advanceBy(2000);
		});

		const viteReporter = getReporterChild(reporter!, 'vite');
		expect(viteReporter.warn).toHaveBeenCalledWith(
			'Vite dev server did not exit, sending SIGTERM.'
		);
		const child = spawnViteProcess.mock.results[0]!.value;
		expect(child.kill).toHaveBeenCalledWith('SIGTERM');
	});

	it('skips killing the Vite dev server when it already exited', async () => {
		spawnViteProcess.mockImplementationOnce(() => {
			const child = new FakeChildProcess();
			child.killed = true;
			queueMicrotask(() => child.emit('exit', 0, null));
			return child;
		});

		await withStartCommand(async () => {
			// allow command to run
		});

		const child = spawnViteProcess.mock.results[0]!.value;
		expect(child.kill).not.toHaveBeenCalled();
	});

	it('logs Vite process errors', async () => {
		let reporter: ReporterMock | undefined;
		await withStartCommand(async ({ reporterHarness: harness }) => {
			reporter = harness.at(0)!;
			const child = spawnViteProcess.mock.results[0]!.value;
			child.emit('error', new Error('vite crash'));
		});

		const viteReporter = getReporterChild(reporter!, 'vite');
		expect(viteReporter.error).toHaveBeenCalledWith(
			'Vite dev server error.',
			expect.objectContaining({
				error: expect.objectContaining({ message: 'vite crash' }),
			})
		);
	});

	it('returns error exit code when Vite fails to launch', async () => {
		const error = new Error('spawn failure');
		spawnViteProcess.mockImplementation(() => {
			throw error;
		});

		const StartCommand = buildStartCommand({
			loadWatch,
			spawnViteProcess,
			buildReporter: reporterFactory,
			runGenerate,
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
		});

		const command = new StartCommand();
		assignCommandContext(command);

		const exitCode = await command.execute();
		expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
		expect(loadWatch).not.toHaveBeenCalled();
	});

	it('reports when auto-apply fails to copy artifacts', async () => {
		const copyError = new Error('copy failure');
		fsCp.mockRejectedValueOnce(copyError);

		let reporter: ReporterMock | undefined;
		await withStartCommand(
			async ({ reporterHarness: harness }) => {
				reporter = harness.at(0)!;
			},
			{ autoApply: true }
		);

		const applyReporter = getReporterChild(reporter!, 'apply');
		const generateReporter = getReporterChild(reporter!, 'generate');

		expect(applyReporter.warn).toHaveBeenCalledWith(
			'Failed to auto-apply PHP artifacts.',
			expect.objectContaining({ message: copyError.message })
		);
		expect(generateReporter.warn).toHaveBeenCalledWith(
			'Failed to auto-apply PHP artifacts.',
			expect.objectContaining({ message: copyError.message })
		);
	});

	it('formats workspace-relative paths when auto-applying artifacts', async () => {
		const layoutPaths = await resolveStartLayoutPaths();
		const realResolve = path.resolve.bind(path);
		const resolveSpy = jest
			.spyOn(path, 'resolve')
			.mockImplementation((...segments: string[]) => {
				if (
					segments[0] === process.cwd() &&
					segments[1] === layoutPaths.phpGenerated
				) {
					return process.cwd();
				}
				if (
					segments[0] === process.cwd() &&
					segments[1] === layoutPaths.phpTargetDir
				) {
					return path.join(process.cwd(), layoutPaths.phpTargetDir);
				}

				return realResolve(...segments);
			});

		const StartCommand = buildStartCommand({
			loadWatch,
			spawnViteProcess,
			buildReporter: reporterFactory,
			runGenerate,
			fileSystem: {
				access: fsAccess,
				mkdir: fsMkdir,
				cp: fsCp,
			},
		});

		const command = new StartCommand();
		assignCommandContext(command);
		const reporter = reporterHarness.create();
		const generateReporter = reporterHarness.create();

		await (
			command as unknown as {
				autoApplyPhpArtifacts: (
					reporterMock: ReturnType<typeof reporterHarness.create>,
					generateReporterMock: ReturnType<
						typeof reporterHarness.create
					>
				) => Promise<void>;
			}
		).autoApplyPhpArtifacts(reporter, generateReporter);

		expect(reporter.info).toHaveBeenCalledWith(
			'Applied generated PHP artifacts.',
			expect.objectContaining({ source: '.', target: 'inc' })
		);

		resolveSpy.mockRestore();
	});

	describe('chokidar resolution', () => {
		const scenarios = [
			{
				title: 'loads chokidar.watch when exported at the top level',
				mock: () => ({ watch: jest.fn(() => new FakeWatcher()) }),
			},
			{
				title: 'loads chokidar from the module default export when it is a function',
				mock: () => ({
					__esModule: true,
					default: jest.fn(() => new FakeWatcher()),
				}),
			},
			{
				title: 'loads chokidar watch from the module default object when available',
				mock: () => ({
					__esModule: true,
					default: { watch: jest.fn(() => new FakeWatcher()) },
				}),
			},
		] as const;

		it.each(scenarios)('%s', async ({ mock }) => {
			jest.resetModules();
			const mocked = mock();
			jest.doMock('chokidar', () => mocked);

			const { buildStartCommand: importBuildStartCommand } = await import(
				'../start'
			);

			const StartCommand = importBuildStartCommand({
				buildReporter: () => reporterHarness.create(),
				runGenerate,
				fileSystem: {
					access: fsAccess,
					mkdir: fsMkdir,
					cp: fsCp,
				},
				spawnViteProcess: () => new FakeChildProcess(),
			});

			const command = new StartCommand();
			assignCommandContext(command);

			const executePromise = command.execute();
			await advanceFastDebounce();
			process.emit('SIGINT');
			await advanceFastDebounce();
			await executePromise;

			const watchSpy = (() => {
				if ('watch' in mocked) {
					return (mocked as { watch: jest.Mock }).watch;
				}
				const value = (mocked as { default: unknown }).default;
				if (typeof value === 'function') {
					return value as jest.Mock;
				}
				if (value && typeof value === 'object' && 'watch' in value) {
					return (value as { watch: jest.Mock }).watch;
				}
				throw new Error('Expected chokidar watch spy.');
			})();
			expect(watchSpy).toHaveBeenCalled();

			jest.resetModules();
		});

		it('throws a developer error when chokidar does not expose a watch function', async () => {
			jest.resetModules();
			jest.doMock('chokidar', () => ({}));

			const { buildStartCommand: importBuildStartCommand } = await import(
				'../start'
			);

			const spawnProcess = jest
				.fn(() => new FakeChildProcess())
				.mockName('child-process');

			const StartCommand = importBuildStartCommand({
				buildReporter: () => reporterHarness.create(),
				runGenerate,
				fileSystem: {
					access: fsAccess,
					mkdir: fsMkdir,
					cp: fsCp,
				},
				spawnViteProcess: spawnProcess,
			});

			const command = new StartCommand();
			assignCommandContext(command);

			await expect(command.execute()).rejects.toMatchObject({
				message:
					'Unable to resolve chokidar.watch for CLI start command.',
			});

			const spawnedProcess = spawnProcess.mock.results[0]
				?.value as unknown as FakeChildProcess;

			expect(spawnedProcess.kill).toHaveBeenCalledWith('SIGINT');

			jest.resetModules();
		});

		it('reuses the cached chokidar module between start command invocations', async () => {
			jest.resetModules();
			const watchSpy = jest
				.fn(() => new FakeWatcher())
				.mockName('cached-watch');
			jest.doMock('chokidar', () => ({ watch: watchSpy }));

			const { buildStartCommand: importBuildStartCommand } = await import(
				'../start'
			);

			const StartCommand = importBuildStartCommand({
				buildReporter: () => reporterHarness.create(),
				runGenerate,
				fileSystem: {
					access: fsAccess,
					mkdir: fsMkdir,
					cp: fsCp,
				},
				spawnViteProcess: () => new FakeChildProcess(),
			});

			const firstCommand = new StartCommand();
			assignCommandContext(firstCommand);
			const firstExecution = firstCommand.execute();
			await advanceFastDebounce();
			process.emit('SIGINT');
			await advanceFastDebounce();
			await firstExecution;

			const secondCommand = new StartCommand();
			assignCommandContext(secondCommand);
			const secondExecution = secondCommand.execute();
			await advanceFastDebounce();
			process.emit('SIGINT');
			await advanceFastDebounce();
			await secondExecution;

			expect(watchSpy).toHaveBeenCalledTimes(2);

			jest.resetModules();
		});
	});
});
