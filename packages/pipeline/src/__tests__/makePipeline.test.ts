import { makePipeline } from '../standard-pipeline/makePipeline';
import type { PipelineStage } from '../core/internal/pipeline-runner.types';
import type { PipelineReporter } from '../core/types';

describe('makePipeline', () => {
	const mockReporter: PipelineReporter = { warn: jest.fn() };
	const mockContext = { reporter: mockReporter };

	// Minimal options for makePipeline
	const baseOptions = {
		createContext: () => mockContext,
		createBuildOptions: () => ({}),
		createFragmentState: () => ({}),
		createFragmentArgs: () => ({}) as any,
		finalizeFragmentState: () => 'artifact',
		createBuilderArgs: () => ({}) as any,
	};

	it('should run a basic pipeline with default stages', async () => {
		const pipeline = makePipeline(baseOptions);
		const result = await pipeline.run({});

		expect(result).toEqual(
			expect.objectContaining({
				artifact: 'artifact',
				diagnostics: [],
			})
		);
	});

	it('should support custom stages', async () => {
		const customStageSpy = jest.fn();

		// Custom stage that just passes state through
		const customStage: PipelineStage<any, any> = (state) => {
			customStageSpy('executing');
			return state;
		};

		const pipeline = makePipeline({
			...baseOptions,
			stages: (deps) => {
				const { fragmentStage, finalizeResult } = deps;
				// Custom stack: fragment -> custom -> finalize
				return [fragmentStage, customStage, finalizeResult];
			},
		});

		await pipeline.run({});

		expect(customStageSpy).toHaveBeenCalledWith('executing');
	});

	it('should allow accessing default stages via deps', async () => {
		const pipeline = makePipeline({
			...baseOptions,
			stages: (deps) => {
				// Assert that standard stages are available
				expect(deps.fragmentStage).toBeDefined();
				expect(deps.builderStage).toBeDefined();
				expect(deps.finalizeResult).toBeDefined();
				return [deps.finalizeResult]; // minimal valid stack for this test
			},
		});

		await pipeline.run({});
	});

	it('should support extension lifecycles configuration', async () => {
		const pipeline = makePipeline({
			...baseOptions,
			extensions: {
				lifecycles: ['custom-lifecycle'],
			},
			stages: (deps) => {
				const {
					makeLifecycleStage,
					finalizeResult,
					finalizeFragments,
				} = deps;
				return [
					finalizeFragments,
					makeLifecycleStage('custom-lifecycle'),
					finalizeResult,
				];
			},
		});

		// We can't easily spy on internal lifecycle execution without an extension
		// But verifying it runs without error suggests the configuration was accepted.
		const result = await pipeline.run({});
		expect(result.artifact).toBe('artifact');
	});
});
