import fs from 'node:fs/promises';
import path from 'node:path';
import { type ChildProcessWithoutNullStreams } from 'node:child_process';
import type * as chokidarModule from 'chokidar';
import { Command, Option } from 'clipanion';
import { createReporterCLI as buildReporter } from '../utils/reporter.js';
import type { Reporter } from '@wpkernel/core/reporter';
import {
	WPK_NAMESPACE,
	WPK_EXIT_CODES,
	WPK_CONFIG_SOURCES,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import { serialiseError } from './internal/serialiseError';
import { COMMAND_HELP } from '../cli/help';
import { loadChokidarWatch } from './start/chokidar';
import { resolveStartLayoutPaths, type StartLayoutPaths } from './start/layout';
import {
	createGenerateRunner,
	type GenerateRunner,
} from './start/generate-runner';
import {
	defaultSpawnViteProcess,
	launchViteDevServer as launchViteDevServerHelper,
	stopViteDevServer as stopViteDevServerHelper,
	type ViteHandle,
} from './start/vite';
import {
	detectTier,
	normaliseForLog,
	prioritiseQueued,
	type Trigger,
	type ChangeTier,
	toWorkspaceRelativePath,
} from './start/helpers';
import {
	parsePackageManager,
	defaultPackageManager,
} from './start/package-manager';
import type { PackageManager } from './init/types';
import { resolveCommandCwd } from './init/command-runtime';

type WatchFn = typeof chokidarModule.watch;

/**
 * File system operations interface for start command.
 *
 * @category Commands
 * @public
 */
export interface FileSystem {
	readonly access: typeof fs.access;
	readonly mkdir: typeof fs.mkdir;
	readonly cp: typeof fs.cp;
}

/**
 * Defines the dependencies required by the `start` command.
 *
 * @category Commands
 */
interface BuildStartCommandDependencies {
	/** Function to dynamically load the `chokidar.watch` function. */
	readonly loadWatch: () => Promise<WatchFn>;
	/** Function to build a reporter instance. */
	readonly buildReporter: typeof buildReporter;
	/** Function to run the generate workflow. */
	readonly runGenerate: GenerateRunner;
	/** File system utility functions. */
	readonly fileSystem: FileSystem;
	/** Function to spawn the Vite development server process. */
	readonly spawnViteProcess: (
		packageManager: PackageManager
	) => ChildProcessWithoutNullStreams;
}

/**
 * Options for building the `start` command, allowing for dependency injection.
 *
 * @category Commands
 */
export interface BuildStartCommandOptions {
	/** Optional: Custom function to load the `chokidar.watch` function. */
	readonly loadWatch?: () => Promise<WatchFn>;
	/** Optional: Custom reporter builder function. */
	readonly buildReporter?: typeof buildReporter;
	/** Optional: Custom generate runner function. */
	readonly runGenerate?: GenerateRunner;
	/** Optional: Partial file system utility functions for testing. */
	readonly fileSystem?: Partial<FileSystem>;
	/** Optional: Custom function to spawn the Vite development server process. */
	readonly spawnViteProcess?: (
		packageManager: PackageManager
	) => ChildProcessWithoutNullStreams;
}

const WPK_CONFIG_BASE = WPK_CONFIG_SOURCES.WPK_CONFIG_TS.replace(/\.ts$/, '');

const WATCH_PATTERNS = [
	WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
	WPK_CONFIG_SOURCES.WPK_CONFIG_JS,
	`${WPK_CONFIG_BASE}.cjs`,
	`${WPK_CONFIG_BASE}.mjs`,
	`${WPK_CONFIG_BASE}.mts`,
	`${WPK_CONFIG_BASE}.cts`,
	`${WPK_CONFIG_BASE}.json`,
	'contracts/**/*',
	'schemas/**/*',
	'src/resources/**/*',
	'blocks/**/*',
];

const IGNORED_PATTERNS = ['**/.git/**', '**/node_modules/**', '**/build/**'];

const FAST_DEBOUNCE_MS = 200;
const SLOW_DEBOUNCE_MS = 600;

function mergeDependencies(
	options: BuildStartCommandOptions
): BuildStartCommandDependencies {
	const fileSystem: FileSystem = {
		access: fs.access,
		mkdir: fs.mkdir,
		cp: fs.cp,
		...options.fileSystem,
	} satisfies FileSystem;

	return {
		loadWatch: options.loadWatch ?? loadChokidarWatch,
		buildReporter: options.buildReporter ?? buildReporter,
		runGenerate: options.runGenerate ?? createGenerateRunner(),
		fileSystem,
		spawnViteProcess: options.spawnViteProcess ?? defaultSpawnViteProcess,
	} satisfies BuildStartCommandDependencies;
}

function buildReporterNamespace(): string {
	return `${WPK_NAMESPACE}.cli.start`;
}

/**
 * Builds the `start` command for the CLI.
 *
 * This command initiates a watch mode for wpk sources, regenerating artifacts
 * on changes and running a Vite development server. It supports debouncing
 * changes and optionally auto-applying generated PHP artifacts.
 *
 * @category Commands
 * @param    options - Options for building the start command, including dependencies.
 * @returns The `Command` class for the start command.
 */
export function buildStartCommand(
	options: BuildStartCommandOptions = {}
): new () => Command {
	const dependencies = mergeDependencies(options);

	class NextStartCommand extends Command {
		static override paths = [['start']];

		static override usage = Command.Usage({
			description: COMMAND_HELP.start.description,
			details: COMMAND_HELP.start.details,
			examples: COMMAND_HELP.start.examples,
		});

		verbose = Option.Boolean('--verbose,-v', false);
		autoApply = Option.Boolean('--auto-apply,-a', false);
		private readonly packageManagerValue = Option.String(
			'--package-manager,-p,-pm',
			{
				description:
					'Package manager used to start the dev server (default: npm).',
				required: false,
			}
		);

		#loadWatch = dependencies.loadWatch;
		#reporterFactory = dependencies.buildReporter;
		#fileSystem = dependencies.fileSystem;
		#spawnViteProcess = dependencies.spawnViteProcess;
		#runGenerate = dependencies.runGenerate;
		#layoutPaths: StartLayoutPaths | null = null;

		get packageManager(): PackageManager {
			return (
				parsePackageManager(this.packageManagerValue) ??
				defaultPackageManager()
			);
		}

		override async execute(): Promise<WPKExitCode> {
			const reporter = this.#reporterFactory({
				namespace: buildReporterNamespace(),
				level: this.verbose ? 'debug' : 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});
			const generateReporter = reporter.child('generate');
			const viteReporter = reporter.child('vite');

			const viteHandle = await this.launchViteDevServer(viteReporter);
			if (!viteHandle) {
				return WPK_EXIT_CODES.UNEXPECTED_ERROR;
			}

			let watcher: ReturnType<WatchFn>;
			try {
				const watch = await this.#loadWatch();
				watcher = watch(WATCH_PATTERNS, {
					cwd: process.cwd(),
					ignoreInitial: true,
					ignored: IGNORED_PATTERNS,
				});
			} catch (error) {
				reporter.error(
					'Failed to initialise file watcher.',
					serialiseError(error)
				);
				await this.stopViteDevServer(viteHandle, viteReporter, {
					awaitExit: false,
				});
				throw error;
			}

			const timers: Partial<Record<ChangeTier, NodeJS.Timeout>> = {};
			const pending: Partial<Record<ChangeTier, Trigger>> = {};
			let running = false;
			let queued: Trigger | null = null;
			let exitResolved = false;

			const clearTimers = () => {
				for (const key of Object.keys(timers) as ChangeTier[]) {
					const timer = timers[key];
					if (timer) {
						clearTimeout(timer);
						timers[key] = undefined;
					}
				}
				for (const key of Object.keys(pending) as ChangeTier[]) {
					pending[key] = undefined;
				}
			};

			const exitCode = await new Promise<WPKExitCode>((resolve) => {
				const resolveOnce = (code: WPKExitCode) => {
					if (exitResolved) {
						return;
					}
					exitResolved = true;
					resolve(code);
				};

				const cleanupSignals = () => {
					process.removeListener('SIGINT', signalHandler);
					process.removeListener('SIGTERM', signalHandler);
				};

				const shutdown = async (reason: string) => {
					reporter.info('Stopping start workflow.', { reason });
					clearTimers();
					try {
						await watcher.close();
					} catch (error) {
						reporter.warn(
							'Failed to close watcher.',
							serialiseError(error)
						);
					}

					await this.stopViteDevServer(viteHandle, viteReporter);

					cleanupSignals();
					resolveOnce(WPK_EXIT_CODES.SUCCESS);
				};

				const signalHandler = () => {
					reporter.info('Received shutdown signal.');
					void shutdown('signal');
				};

				process.once('SIGINT', signalHandler);
				process.once('SIGTERM', signalHandler);

				watcher.on('all', (event, filePath) => {
					const tier = detectTier(filePath);
					const trigger: Trigger = {
						tier,
						event,
						file: normaliseForLog(filePath),
					};
					scheduleTrigger(trigger);
				});

				watcher.on('error', (error) => {
					reporter.error('Watcher error.', serialiseError(error));
				});

				const scheduleTrigger = (trigger: Trigger) => {
					if (trigger.tier === 'slow' && timers.fast) {
						clearTimeout(timers.fast);
						timers.fast = undefined;
						pending.fast = undefined;
					}

					pending[trigger.tier] = trigger;

					const delay =
						trigger.tier === 'slow'
							? SLOW_DEBOUNCE_MS
							: FAST_DEBOUNCE_MS;
					if (timers[trigger.tier]) {
						clearTimeout(timers[trigger.tier]!);
					} else if (running) {
						reporter.debug(
							'Queueing change while generation is running.',
							{
								event: trigger.event,
								file: trigger.file,
								tier: trigger.tier,
							}
						);
					} else {
						reporter.info(
							'Change detected. Scheduling regeneration.',
							{
								event: trigger.event,
								file: trigger.file,
								tier: trigger.tier,
							}
						);
					}

					timers[trigger.tier] = setTimeout(() => {
						timers[trigger.tier] = undefined;
						const pendingTrigger = pending[trigger.tier];
						pending[trigger.tier] = undefined;
						if (pendingTrigger) {
							queueRun(pendingTrigger);
						}
					}, delay);
				};

				const queueRun = (trigger: Trigger) => {
					if (running) {
						queued = prioritiseQueued(queued, trigger);
						reporter.debug(
							'Generation already running, retaining latest trigger.',
							{
								event: trigger.event,
								file: trigger.file,
								tier: trigger.tier,
							}
						);
						return;
					}

					running = true;
					void this.runCycle({
						trigger,
						reporter,
						generateReporter,
					})
						.catch((error) => {
							reporter.error(
								'Unexpected error during generation cycle.',
								serialiseError(error)
							);
						})
						.finally(() => {
							running = false;
							if (queued) {
								const next = queued;
								queued = null;
								queueRun(next);
							}
						});
				};

				queueRun({
					tier: 'slow',
					event: 'initial',
					file: WPK_CONFIG_SOURCES.WPK_CONFIG_TS,
				});
			});

			return exitCode;
		}

		private async runCycle({
			trigger,
			reporter,
			generateReporter,
		}: {
			trigger: Trigger;
			reporter: Reporter;
			generateReporter: Reporter;
		}): Promise<void> {
			reporter.info('Regenerating artifacts.', {
				event: trigger.event,
				file: trigger.file,
				tier: trigger.tier,
			});

			const cwd = resolveCommandCwd(this.context);

			let exitCode: WPKExitCode;
			let output: string | null | undefined;
			try {
				const result = await this.#runGenerate({
					reporter: generateReporter,
					verbose: this.verbose,
					cwd,
					allowDirty: false,
				});
				exitCode = result.exitCode;
				output = result.output;
			} catch (error) {
				reporter.error(
					'Generation pipeline failed to execute.',
					serialiseError(error)
				);
				return;
			}

			if (exitCode !== WPK_EXIT_CODES.SUCCESS) {
				reporter.warn('Generation completed with errors.', {
					exitCode,
				});
				return;
			}

			if (output) {
				this.context.stdout.write(output);
			}

			reporter.info('Generation completed successfully.');

			if (this.autoApply) {
				await this.autoApplyPhpArtifacts(
					reporter.child('apply'),
					generateReporter
				);
			}
		}

		private async autoApplyPhpArtifacts(
			reporter: Reporter,
			generateReporter: Reporter
		): Promise<void> {
			const layoutPaths = await this.resolveLayoutPaths();
			const sourceDir = path.resolve(
				process.cwd(),
				layoutPaths.phpGenerated
			);
			const targetDir = path.resolve(
				process.cwd(),
				layoutPaths.phpTargetDir
			);

			try {
				await this.#fileSystem.access(sourceDir);
			} catch {
				reporter.debug('No PHP artifacts to apply.', {
					sourceDir: toWorkspaceRelativePath(sourceDir),
				});
				return;
			}

			try {
				await this.#fileSystem.mkdir(targetDir, { recursive: true });
				await this.#fileSystem.cp(sourceDir, targetDir, {
					recursive: true,
				});
				reporter.info('Applied generated PHP artifacts.', {
					source: toWorkspaceRelativePath(sourceDir),
					target: toWorkspaceRelativePath(targetDir),
				});
			} catch (error) {
				reporter.warn(
					'Failed to auto-apply PHP artifacts.',
					serialiseError(error)
				);
				generateReporter.warn(
					'Failed to auto-apply PHP artifacts.',
					serialiseError(error)
				);
			}
		}

		private async resolveLayoutPaths(): Promise<StartLayoutPaths> {
			if (this.#layoutPaths) {
				return this.#layoutPaths;
			}

			const resolved = await resolveStartLayoutPaths();
			this.#layoutPaths = resolved;
			return resolved;
		}

		protected createViteDevProcess(): ChildProcessWithoutNullStreams {
			return this.#spawnViteProcess(this.packageManager);
		}

		private async launchViteDevServer(
			reporter: Reporter
		): Promise<ViteHandle | null> {
			return launchViteDevServerHelper(
				() => this.createViteDevProcess(),
				reporter
			);
		}

		private async stopViteDevServer(
			handle: ViteHandle,
			reporter: Reporter,
			stopOptions: { awaitExit?: boolean } = {}
		): Promise<void> {
			await stopViteDevServerHelper(handle, reporter, stopOptions);
		}
	}

	return NextStartCommand;
}

export { detectTier, prioritiseQueued } from './start/helpers';
export type { ChangeTier, Trigger } from './start/helpers';
