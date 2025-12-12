import { makePipeline } from '../standard-pipeline/makePipeline';
import type { PipelineReporter, Helper } from '../core/types';

describe('Agnostic Kinds (ETL Pipeline)', () => {
	it('supports Extract-Transform-Load pipeline with custom stages', async () => {
		const log: string[] = [];
		const reporter: PipelineReporter = {
			warn: (msg) => log.push(`WARN: ${msg}`),
		};

		type Context = { reporter: PipelineReporter; data: string[] };
		type ETLHelper = Helper<
			Context,
			unknown,
			unknown,
			PipelineReporter,
			'extract' | 'transform' | 'load'
		>;

		const pipeline = makePipeline<
			{ input: string[] }, // RunOptions
			PipelineReporter,
			Context,
			string[], // Artifact (final result)
			any, // Diags
			any, // RunResult
			any, // BuildOptions
			string[] // Draft (mutable state)
		>({
			// Legacy kinds are required by type but we won't use them directly
			fragmentKind: 'fragment',
			builderKind: 'builder',

			createContext: () => ({ reporter, data: [] }),
			createBuildOptions: () => ({}),
			createFragmentState: ({ options }) => [...options.input], // Draft starts as input

			// These factory methods are for legacy kinds, we can stub them or use them if we wanted
			createFragmentArgs: () => ({}) as any,
			createBuilderArgs: () => ({}) as any,
			finalizeFragmentState: ({ draft }) => draft, // Pass draft as artifact

			// Custom Stages Definition
			stages: (deps) => {
				// 1. Extract Stage
				const extractStage = deps.makeHelperStage('extract', {
					makeArgs: (state) => (_entry) => ({
						context: state.context,
						input: state.draft, // Extract reads from draft
						output: state.draft, // And writes to draft
						reporter: state.context.reporter,
					}),
				});

				// 2. Transform Stage
				const transformStage = deps.makeHelperStage('transform', {
					makeArgs: (state) => (_entry) => ({
						context: state.context,
						input: state.draft,
						output: state.draft,
						reporter: state.context.reporter,
					}),
				});

				// 3. Load Stage
				const loadStage = deps.makeHelperStage('load', {
					makeArgs: (state) => (_entry) => ({
						context: state.context,
						input: state.draft, // Load reads finalized draft (or current draft)
						// For load, maybe we write to artifact?
						// But here we are just modifying the array in place as a simple test.
						output: state.draft,
						reporter: state.context.reporter,
					}),
				});

				return [
					extractStage,
					transformStage,
					loadStage,
					deps.finalizeResult, // Ensure result is created
				];
			},

			createRunResult: (state) => ({
				artifact: state.artifact,
				data: state.context.data,
				log,
			}),
		});

		// Register Helpers
		// 1. Extract
		pipeline.use({
			kind: 'extract',
			key: 'source-a',
			mode: 'extend',
			priority: 10,
			dependsOn: [],
			apply: ({ input }) => {
				log.push('Extract: Source A');
				if (Array.isArray(input)) {
					(input as any).push('A');
				}
			},
		} as ETLHelper);

		// 2. Transform
		pipeline.use({
			kind: 'transform',
			key: 'uppercase',
			mode: 'extend',
			priority: 0,
			dependsOn: [],
			apply: ({ input }) => {
				log.push('Transform: Uppercase');
				if (Array.isArray(input)) {
					const list = input as string[];
					for (let i = 0; i < list.length; i++) {
						list[i] = list[i]!.toUpperCase();
					}
				}
			},
		} as ETLHelper);

		// 3. Load
		pipeline.use({
			kind: 'load',
			key: 'db',
			mode: 'extend',
			priority: 0,
			dependsOn: [],
			apply: ({ input }) => {
				log.push(`Load: ${JSON.stringify(input)}`);
			},
		} as ETLHelper);

		// Run
		const result = await pipeline.run({ input: ['init'] });

		// Verify Log Order
		expect(log).toEqual([
			'Extract: Source A',
			'Transform: Uppercase',
			'Load: ["INIT","A"]',
		]);

		// Verify Result
		expect(result).toMatchObject({
			data: [],
			log: expect.any(Array),
		});
	});
});
