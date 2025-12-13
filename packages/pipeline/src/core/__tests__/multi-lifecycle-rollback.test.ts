import { makePipeline } from '../makePipeline';
import type { PipelineReporter } from '../types';

describe('Multi-Lifecycle Rollback Bug', () => {
	const mockReporter: PipelineReporter = { warn: jest.fn() };
	const mockContext = { reporter: mockReporter };
	const baseOptions = {
		createContext: () => mockContext,
		createInitialState: () => ({}),
	};

	it('executes rollback hooks from all configured lifecycles on failure', async () => {
		const rollbackSpy1 = jest.fn();
		const rollbackSpy2 = jest.fn();

		const pipeline = makePipeline({
			...baseOptions,
			extensions: {
				lifecycles: ['phase-one', 'phase-two'],
			},
			helperKinds: ['builder'],
			createStages: (deps: any) => {
				const { makeLifecycleStage, finalizeResult, commitStage } =
					deps;
				// Run phase-one, then phase-two
				// Then use the builder stage (which will run our failing helper)
				return [
					makeLifecycleStage('phase-one'),
					makeLifecycleStage('phase-two'),
					deps.makeHelperStage('builder'),
					commitStage,
					finalizeResult,
				];
			},
		});

		// Register extension for Phase One
		pipeline.extensions.use({
			key: 'ext-1',
			register: () => ({
				lifecycle: 'phase-one',
				hook: () => ({
					rollback: rollbackSpy1,
				}),
			}),
		});

		pipeline.extensions.use({
			key: 'ext-2',
			register: () => ({
				lifecycle: 'phase-two',
				hook: () => ({
					rollback: rollbackSpy2,
				}),
			}),
		});

		// Register failing helper
		pipeline.use({
			key: 'failing-helper',
			kind: 'builder',
			mode: 'extend',
			priority: 10,
			dependsOn: [],
			apply: () => {
				throw new Error('Pipeline Explosion');
			},
		});

		try {
			await pipeline.run({});
			throw new Error('Should have thrown');
		} catch (e: any) {
			expect(e.message).toBe('Pipeline Explosion');
		}

		// Both should be called
		expect(rollbackSpy2).toHaveBeenCalled();
		expect(rollbackSpy1).toHaveBeenCalled();
	});
});
