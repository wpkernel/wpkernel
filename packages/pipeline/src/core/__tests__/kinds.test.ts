import { makePipeline } from '../makePipeline';
import type { PipelineReporter, Helper } from '../types';

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
			Context,
			PipelineReporter,
			{ draft: string[] }, // Artifact (final result)
			any, // Diags
			any // RunResult
		>({
			helperKinds: ['extract', 'transform', 'load'],

			createContext: () => ({ reporter, data: [] }),
			createState: ({ options }) => ({
				draft: [...options.input],
			}),

			// Custom Stages Definition
			createStages: (deps: any) => {
				// 1. Extract Stage
				const extractStage = deps.makeHelperStage('extract', {
					makeArgs: (state: any) => (_entry: any) => ({
						context: state.context,
						input: state.userState.draft, // Extract reads from draft
						output: state.userState.draft, // And writes to draft
						reporter: state.context.reporter,
					}),
				});

				// 2. Transform Stage
				const transformStage = deps.makeHelperStage('transform', {
					makeArgs: (state: any) => (_entry: any) => ({
						context: state.context,
						input: state.userState.draft,
						output: state.userState.draft,
						reporter: state.context.reporter,
					}),
				});

				// 3. Load Stage
				const loadStage = deps.makeHelperStage('load', {
					makeArgs: (state: any) => (_entry: any) => ({
						context: state.context,
						input: state.userState.draft, // Load reads finalized draft (or current draft)
						// For load, maybe we write to artifact?
						// But here we are just modifying the array in place as a simple test.
						output: state.userState.draft,
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
