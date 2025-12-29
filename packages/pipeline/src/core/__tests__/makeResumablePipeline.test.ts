import { makeResumablePipeline } from '../makeResumablePipeline';
import type {
	PipelineDiagnostic,
	PipelinePaused,
	PipelineReporter,
	PipelineRunState,
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

describe('makeResumablePipeline', () => {
	const mockReporter: PipelineReporter = { warn: jest.fn() };
	const mockContext: PauseContext = { reporter: mockReporter };

	it('pauses and resumes with snapshot state', async () => {
		const pipeline: PausePipeline = makeResumablePipeline<
			PauseRunOptions,
			PauseContext,
			PipelineReporter,
			PauseUserState,
			PauseDiagnostic
		>({
			helperKinds: [],
			createContext: () => mockContext,
			createState: () => ({ count: 0 }),
			createStages: (deps: any) => [
				(state: any) => {
					if (!deps.runnerEnv.pause) {
						throw new Error('pause not available');
					}
					if (!state.resumeInput) {
						return deps.runnerEnv.pause(state, {
							pauseKind: 'test',
							payload: { step: 'first' },
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

		const initial = await pipeline.run({});
		expect((initial as PipelinePaused<PausePipelineState>).__paused).toBe(
			true
		);

		const paused = initial as PipelinePaused<PausePipelineState>;
		expect(paused.snapshot.stageIndex).toBe(0);
		expect(paused.snapshot.pauseKind).toBe('test');
		expect(paused.snapshot.payload).toEqual({ step: 'first' });

		const resumed = await pipeline.resume(paused.snapshot, {
			resumed: true,
		});

		expect((resumed as PipelinePaused<unknown>).__paused).not.toBe(true);
		const result = resumed as PipelineRunState<{ count: number }>;
		expect(result.artifact.count).toBe(1);
	});
});
