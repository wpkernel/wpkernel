import { makeResumablePipeline } from '../makeResumablePipeline';
import type {
	PipelinePaused,
	PipelineRunState,
	Helper,
	PipelineReporter,
	PipelineDiagnostic,
	ResumablePipeline,
} from '../types';
import type { AgnosticState } from '../runner/types';

type PauseRunOptions = Record<string, never>;
type PauseUserState = { count: number };
type PauseContext = { reporter: PipelineReporter };
type PauseDiagnostic = PipelineDiagnostic;
type PausePipelineState = AgnosticState<
	PauseRunOptions,
	PauseUserState,
	PauseContext,
	PipelineReporter,
	PauseDiagnostic
>;
type PausePipeline = ResumablePipeline<
	PauseRunOptions,
	PipelineRunState<PauseUserState, PauseDiagnostic>,
	PauseContext,
	PipelineReporter,
	PausePipelineState
>;

describe('makeResumablePipeline coverage', () => {
	it('waits for async extension registration before run', async () => {
		const warn = jest.fn();
		const createContext = jest.fn(() => ({ reporter: { warn } }));
		let resolveRegistration: (() => void) | undefined;

		const pipeline = makeResumablePipeline({
			helperKinds: [],
			createContext,
			createState: () => ({}),
		});

		pipeline.extensions.use({
			key: 'async-ext',
			register: () =>
				new Promise((resolve) => {
					resolveRegistration = () => resolve(undefined);
				}),
		});

		const runPromise = pipeline.run({});
		expect(createContext).not.toHaveBeenCalled();

		resolveRegistration?.();
		await runPromise;

		expect(createContext).toHaveBeenCalled();
	});

	it('replays diagnostics to reporter when onDiagnostic is not provided', async () => {
		const warn = jest.fn();
		const reporter = { warn };

		const pipeline = makeResumablePipeline({
			helperKinds: ['thing'],
			createContext: () => ({ reporter }),
			createState: () => ({}),
		});

		const helperBase: Helper<unknown, unknown, unknown, PipelineReporter> =
			{
				key: 'dup',
				kind: 'thing',
				mode: 'override',
				priority: 1,
				dependsOn: [],
				apply: () => undefined,
			};

		pipeline.use(helperBase);

		try {
			pipeline.use({
				...helperBase,
				priority: 2,
			});
		} catch {
			// Ignore expected conflict error.
		}

		await pipeline.run({});

		expect(warn).toHaveBeenCalledWith(
			'Pipeline diagnostic reported.',
			expect.any(Object)
		);
	});

	it('handles async pause stage and resume', async () => {
		const reporter: PipelineReporter = {};
		const pipeline: PausePipeline = makeResumablePipeline<
			PauseRunOptions,
			PauseContext,
			PipelineReporter,
			PauseUserState,
			PauseDiagnostic
		>({
			helperKinds: [],
			createContext: () => ({ reporter }),
			createState: () => ({ count: 0 }),
			createStages: (deps: any) => [
				(state: any) => {
					if (!state.resumeInput) {
						return Promise.resolve(
							deps.runnerEnv.pause(state, { pauseKind: 'async' })
						);
					}
					return {
						...state,
						userState: { count: state.userState.count + 1 },
					};
				},
				deps.finalizeResult,
			],
		});

		const initial = (await pipeline.run(
			{}
		)) as PipelinePaused<PausePipelineState>;
		expect(initial.__paused).toBe(true);
		expect(initial.snapshot.pauseKind).toBe('async');

		const resumed = (await pipeline.resume(initial.snapshot, {
			done: true,
		})) as PipelineRunState<{ count: number }>;
		expect(resumed.artifact.count).toBe(1);
	});

	it('handles sync pause stage and sync resume', () => {
		const reporter: PipelineReporter = {};
		const pipeline: PausePipeline = makeResumablePipeline<
			PauseRunOptions,
			PauseContext,
			PipelineReporter,
			PauseUserState,
			PauseDiagnostic
		>({
			helperKinds: [],
			createContext: () => ({ reporter }),
			createState: () => ({ count: 0 }),
			createStages: (deps: any) => [
				(state: any) => {
					if (!state.resumeInput) {
						return deps.runnerEnv.pause(state, {
							pauseKind: 'sync',
						});
					}
					return {
						...state,
						userState: { count: state.userState.count + 1 },
					};
				},
				deps.finalizeResult,
			],
		});

		const initial = pipeline.run({}) as PipelinePaused<PausePipelineState>;
		expect(initial.__paused).toBe(true);
		expect(initial.snapshot.pauseKind).toBe('sync');

		const resumed = pipeline.resume(initial.snapshot, {
			done: true,
		}) as PipelineRunState<{ count: number }>;
		expect(resumed.artifact.count).toBe(1);
	});

	it('uses createRunResult when provided', async () => {
		const pipeline = makeResumablePipeline<
			Record<string, never>,
			{ reporter: PipelineReporter },
			PipelineReporter,
			{ value: string },
			PipelineDiagnostic,
			string
		>({
			helperKinds: [],
			createContext: () => ({ reporter: {} }),
			createState: () => ({ value: 'ok' }),
			createRunResult: ({ artifact }) => `result:${artifact.value}`,
		});

		const result = await pipeline.run({});

		expect(result).toBe('result:ok');
	});

	it('warns when extension hooks are ignored by stages', async () => {
		const warn = jest.fn();
		const pipeline = makeResumablePipeline({
			helperKinds: [],
			createContext: () => ({ reporter: { warn } }),
			createState: () => ({}),
		});

		pipeline.extensions.use({
			key: 'ignored-ext',
			register: () => () => undefined,
		});

		await pipeline.run({});

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('will be ignored')
		);
	});

	it('uses onDiagnostic when provided', async () => {
		const onDiagnostic = jest.fn();
		const reporter = { warn: jest.fn() };

		const pipeline = makeResumablePipeline({
			helperKinds: ['conflict'],
			createContext: () => ({ reporter }),
			createState: () => ({}),
			onDiagnostic,
		});

		const helperBase: Helper<unknown, unknown, unknown, PipelineReporter> =
			{
				key: 'dup',
				kind: 'conflict',
				mode: 'override',
				priority: 1,
				dependsOn: [],
				apply: () => undefined,
			};

		pipeline.use(helperBase);
		try {
			pipeline.use({ ...helperBase, priority: 2 });
		} catch {
			// Expected conflict.
		}

		await pipeline.run({});

		expect(onDiagnostic).toHaveBeenCalled();
	});

	it('defaults createState when none is provided', async () => {
		const pipeline = makeResumablePipeline({
			helperKinds: [],
			createContext: () => ({ reporter: {} }),
		});

		const result = (await pipeline.run({})) as PipelineRunState<
			Record<string, unknown>
		>;

		expect(result.artifact).toEqual({});
	});

	it('reports extension rollback failures', async () => {
		const warn = jest.fn();
		const onExtensionRollbackError = jest.fn();

		const pipeline = makeResumablePipeline({
			helperKinds: [],
			createContext: () => ({ reporter: { warn } }),
			createState: () => ({ draft: true }),
			extensions: {
				lifecycles: ['after-fragments'],
			},
			onExtensionRollbackError,
			createStages: (deps: any) => [
				deps.makeLifecycleStage('after-fragments'),
				deps.finalizeResult,
			],
		});

		pipeline.extensions.use({
			key: 'rollback-hook',
			register: () => ({
				lifecycle: 'after-fragments',
				hook: () => ({
					rollback: () => {
						throw new Error('rollback failure');
					},
				}),
			}),
		});

		pipeline.extensions.use({
			key: 'throwing-hook',
			register: () => ({
				lifecycle: 'after-fragments',
				hook: () => {
					throw new Error('hook failure');
				},
			}),
		});

		await expect(
			Promise.resolve().then(() => pipeline.run({}))
		).rejects.toThrow('hook failure');
		expect(onExtensionRollbackError).toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith(
			'Pipeline extension rollback failed.',
			expect.any(Object)
		);
	});

	it('reports helper rollback failures', async () => {
		const warn = jest.fn();

		const pipeline = makeResumablePipeline({
			helperKinds: ['test'],
			createContext: () => ({ reporter: { warn } }),
			createState: () => ({}),
		});

		pipeline.use({
			key: 'with-rollback',
			kind: 'test',
			mode: 'extend',
			priority: 10,
			dependsOn: [],
			apply: () => ({
				rollback: {
					key: 'rollback',
					run: () => {
						throw new Error('rollback failed');
					},
				},
			}),
		});

		pipeline.use({
			key: 'thrower',
			kind: 'test',
			mode: 'extend',
			priority: 1,
			dependsOn: [],
			apply: () => {
				throw new Error('helper failed');
			},
		});

		await expect(
			Promise.resolve().then(() => pipeline.run({}))
		).rejects.toThrow('helper failed');
		expect(warn).toHaveBeenCalledWith(
			'Helper rollback failed',
			expect.any(Object)
		);
	});

	it('handles async run errors and async resume errors', async () => {
		const reporter: PipelineReporter = {};
		const pipeline: PausePipeline = makeResumablePipeline<
			PauseRunOptions,
			PauseContext,
			PipelineReporter,
			PauseUserState,
			PauseDiagnostic
		>({
			helperKinds: [],
			createContext: () => ({ reporter }),
			createState: () => ({ count: 0 }),
			createStages: (deps: any) => [
				(state: any) => {
					if (!state.resumeInput) {
						return deps.runnerEnv.pause(state, {
							pauseKind: 'stop',
						});
					}
					return Promise.reject(new Error('resume failed'));
				},
				deps.finalizeResult,
			],
		});

		const paused = (await pipeline.run(
			{}
		)) as PipelinePaused<PausePipelineState>;
		await expect(
			pipeline.resume(paused.snapshot, { resume: true })
		).rejects.toThrow('resume failed');
	});
});
