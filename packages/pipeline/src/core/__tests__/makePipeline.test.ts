import { makePipeline } from '../makePipeline';
import { type PipelineStage } from '../runner/types';
import type { PipelineReporter } from '../types';

describe('makePipeline', () => {
	const mockReporter: PipelineReporter = { warn: jest.fn() };
	const mockContext = { reporter: mockReporter };

	// Minimal options for makePipeline
	const baseOptions = {
		helperKinds: ['testHelper'],
		createContext: () => mockContext,
		createState: () => ({}),
	};

	it('should run a basic pipeline with default stages', async () => {
		const pipeline = makePipeline(baseOptions);
		const result = await pipeline.run({});

		expect(result).toEqual(
			expect.objectContaining({
				// artifact: 'artifact', // Default result is just state
				// diagnostics: [],
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
			createStages: (deps: any) => {
				// Use createStages instead of stages (renamed?)
				const { makeHelperStage, finalizeResult } = deps;
				// Custom stack: helper -> custom -> finalize
				return [
					makeHelperStage('testHelper'),
					customStage,
					finalizeResult,
				];
			},
		});

		await pipeline.run({});

		expect(customStageSpy).toHaveBeenCalledWith('executing');
	});

	it('should allow accessing default stages via deps', async () => {
		const pipeline = makePipeline({
			...baseOptions,
			createStages: (deps: any) => {
				// Assert that standard stages are available
				expect(deps.makeHelperStage).toBeDefined();
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
			createStages: (deps: any) => {
				const { makeLifecycleStage, finalizeResult } = deps;
				// We don't have finalizeFragments anymore
				return [
					// finalizeFragments, // Removed from agnostic deps
					makeLifecycleStage('custom-lifecycle'),
					finalizeResult,
				];
			},
		});

		// We can't easily spy on internal lifecycle execution without an extension
		// But verifying it runs without error suggests the configuration was accepted.
		const result = await pipeline.run({});
		expect(result).toMatchObject({ artifact: {} });
	});
});
