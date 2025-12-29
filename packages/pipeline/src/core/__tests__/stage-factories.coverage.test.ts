import {
	createHelpersProgram,
	makeCommitStage,
	makeHelperStageFactory,
} from '../runner/stage-factories';
import type {
	Helper,
	HelperApplyOptions,
	PipelinePaused,
	PipelineReporter,
} from '../types';
import type { PipelineRollback } from '../rollback';
import type { RegisteredHelper } from '../dependency-graph';

describe('stage-factories coverage', () => {
	it('createHelpersProgram handles missing rollback registration', async () => {
		const helper: Helper<unknown, unknown, unknown, PipelineReporter> = {
			key: 'h1',
			kind: 'test',
			mode: 'extend',
			priority: 1,
			dependsOn: [],
			apply: (_args, next) => next?.(),
		};
		const entries: RegisteredHelper<typeof helper>[] = [
			{ helper, id: 'test:h1#0', index: 0 },
		];
		const steps: string[] = [];
		const program = createHelpersProgram({
			getOrder: () => entries,
			makeArgs: () => () =>
				({
					context: {},
					input: undefined,
					output: undefined,
					reporter: {},
				}) as HelperApplyOptions<
					unknown,
					unknown,
					unknown,
					PipelineReporter
				>,
			invoke: ({ helper: invokeHelper, args, next }) =>
				invokeHelper.apply(args, next) as unknown as void,
			recordStep: (entry) => steps.push(entry.id),
			onVisited: (state, visited) => {
				steps.push(`visited:${visited.size}`);
				return state;
			},
		});

		const result = await program({ count: 1 });
		expect(result).toEqual({ count: 1 });
		expect(steps).toEqual(['test:h1#0', 'visited:1']);
	});

	it('createHelpersProgram returns sync result when handlers are sync', () => {
		const helper: Helper<unknown, unknown, unknown, PipelineReporter> = {
			key: 'h-sync',
			kind: 'sync',
			mode: 'extend',
			priority: 1,
			dependsOn: [],
			apply: () => undefined,
		};
		const entries: RegisteredHelper<typeof helper>[] = [
			{ helper, id: 'sync:h-sync#0', index: 0 },
		];
		const program = createHelpersProgram({
			getOrder: () => entries,
			makeArgs: () => () =>
				({
					context: {},
					input: undefined,
					output: undefined,
					reporter: {},
				}) as HelperApplyOptions<
					unknown,
					unknown,
					unknown,
					PipelineReporter
				>,
			invoke: ({ helper: invokeHelper, args, next }) =>
				invokeHelper.apply(args, next) as unknown as void,
			recordStep: () => undefined,
			onVisited: (state) => state,
		});

		const result = program({ count: 1 });
		expect(result && typeof (result as Promise<unknown>).then).not.toBe(
			'function'
		);
	});

	it('createHelpersProgram registers rollbacks from async invocations', async () => {
		const rollback: PipelineRollback = {
			key: 'rb',
			run: () => undefined,
		};
		const helper: Helper<unknown, unknown, unknown, PipelineReporter> = {
			key: 'h2',
			kind: 'test',
			mode: 'extend',
			priority: 1,
			dependsOn: [],
			apply: (_args, next) => next?.(),
		};
		const entries: RegisteredHelper<typeof helper>[] = [
			{ helper, id: 'test:h2#0', index: 0 },
		];
		const rollbacks: PipelineRollback[] = [];
		const program = createHelpersProgram({
			getOrder: () => entries,
			makeArgs: () => () =>
				({
					context: {},
					input: undefined,
					output: undefined,
					reporter: {},
				}) as HelperApplyOptions<
					unknown,
					unknown,
					unknown,
					PipelineReporter
				>,
			invoke: () =>
				Promise.resolve({ rollback }) as unknown as Promise<void>,
			recordStep: () => undefined,
			onVisited: (state) => state,
			registerRollback: (_helper, result) => {
				if (
					result &&
					typeof result === 'object' &&
					'rollback' in result
				) {
					rollbacks.push(
						(result as { rollback: PipelineRollback }).rollback
					);
				}
			},
		});

		await program({ count: 2 });
		expect(rollbacks).toEqual([rollback]);
	});

	it('makeCommitStage rolls back on commit error', async () => {
		const commitStage = makeCommitStage({
			isHalt: (value: unknown): value is { __halt: true } =>
				Boolean(
					value && typeof value === 'object' && '__halt' in value
				),
			commit: () => {
				throw new Error('commit failed');
			},
			rollbackToHalt: (_state, error) => ({
				__halt: true,
				error,
			}),
		});

		const result = await commitStage({ count: 1 });
		expect(result).toEqual({
			__halt: true,
			error: expect.any(Error),
		});
	});

	it('makeHelperStageFactory short-circuits paused state', () => {
		const paused: PipelinePaused<{ value: number }> = {
			__paused: true,
			snapshot: {
				stageIndex: 0,
				state: { value: 1 },
				createdAt: Date.now(),
			},
		};
		const stageFactory = makeHelperStageFactory({
			pushStep: () => undefined,
			toRollbackContext: (state) => ({ context: (state as any).context }),
			halt: () => ({ __halt: true }),
			isHalt: (value: unknown): value is { __halt: true } =>
				Boolean(
					value && typeof value === 'object' && '__halt' in value
				),
		});

		const stage = stageFactory('test', {
			getOrder: () => [],
			makeArgs: () => () =>
				({
					context: {},
					input: undefined,
					output: undefined,
					reporter: {},
				}) as HelperApplyOptions<
					unknown,
					unknown,
					unknown,
					PipelineReporter
				>,
			onVisited: (state) => state,
		});

		const result = stage(paused as unknown as { value: number });
		expect(result).toBe(paused);
	});
});
