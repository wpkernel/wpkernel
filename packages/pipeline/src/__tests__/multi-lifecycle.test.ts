import { makePipeline } from '../makePipeline';
import type { PipelineReporter } from '../types';

describe('Multi-Lifecycle Extension Bug', () => {
	const mockReporter: PipelineReporter = { warn: jest.fn() };
	const mockContext = { reporter: mockReporter };
	const baseOptions = {
		createContext: () => mockContext,
		createBuildOptions: () => ({}),
		createFragmentState: () => ({}),
		createFragmentArgs: () => ({}) as any,
		finalizeFragmentState: () => 'artifact',
		createBuilderArgs: () => ({}) as any,
	};

	it('commits extension hooks from all configured lifecycles', async () => {
		const commitSpy1 = jest.fn();
		const commitSpy2 = jest.fn();

		const pipeline = makePipeline({
			...baseOptions,
			extensions: {
				// Define two distinct lifecycles
				lifecycles: ['phase-one', 'phase-two'],
			},
			stages: (deps) => {
				const { makeLifecycleStage, finalizeResult, commitStage } =
					deps;
				// Run phase-one, then phase-two, then commit
				return [
					makeLifecycleStage('phase-one'),
					makeLifecycleStage('phase-two'),
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
					commit: commitSpy1,
				}),
			}),
		});

		// Register extension for Phase Two
		pipeline.extensions.use({
			key: 'ext-2',
			register: () => ({
				lifecycle: 'phase-two',
				hook: () => ({
					commit: commitSpy2,
				}),
			}),
		});

		await pipeline.run({});

		// Both should be called
		expect(commitSpy1).toHaveBeenCalled(); // This is expected to fail currently
		expect(commitSpy2).toHaveBeenCalled();
	});
});
