import { makePipeline } from '../makePipeline';
import type {
	PipelineReporter,
	Helper,
	HelperApplyOptions,
	PipelineDiagnostic,
} from '../types';

describe('Agnostic Pipeline Core', () => {
	type TestRunOptions = { input: string[] };
	type TestContext = { reporter: PipelineReporter; data: string[] };
	type TestArtifact = string[];

	const mockReporter: PipelineReporter = { warn: jest.fn() };

	it('supports arbitrary helper kinds and executes them in order', async () => {
		const executionLog: string[] = [];

		const pipeline = makePipeline<
			TestRunOptions,
			TestContext,
			PipelineReporter,
			TestArtifact,
			PipelineDiagnostic,
			TestArtifact
		>({
			helperKinds: ['extract', 'transform', 'load'],
			createContext: () => ({ reporter: mockReporter, data: [] }),
			createState: ({ options }) => ({
				sourceData: options.input,
			}),
			createRunResult: ({ context }) => (context as TestContext).data, // Return accumulated data
		});

		// Register helpers
		pipeline.use({
			kind: 'extract',
			key: 'extractor',
			mode: 'extend',
			priority: 10,
			dependsOn: [],
			apply: ({ context }: HelperApplyOptions<TestContext, any, any>) => {
				executionLog.push('extract');
				context.data.push('extracted');
			},
		} as unknown as Helper<
			TestContext,
			any,
			any,
			PipelineReporter,
			'extract'
		>);

		pipeline.use({
			kind: 'transform',
			key: 'transformer',
			mode: 'extend',
			priority: 10,
			dependsOn: [],
			apply: ({ context }: HelperApplyOptions<TestContext, any, any>) => {
				executionLog.push('transform');
				context.data.push('transformed');
			},
		} as unknown as Helper<
			TestContext,
			any,
			any,
			PipelineReporter,
			'transform'
		>);

		pipeline.use({
			kind: 'load',
			key: 'loader',
			mode: 'extend',
			priority: 10,
			dependsOn: [],
			apply: ({ context }: HelperApplyOptions<TestContext, any, any>) => {
				executionLog.push('load');
				context.data.push('loaded');
			},
		} as unknown as Helper<
			TestContext,
			any,
			any,
			PipelineReporter,
			'load'
		>);

		const result = await pipeline.run({ input: ['start'] });

		expect(executionLog).toEqual(['extract', 'transform', 'load']);
		expect(result).toEqual(['extracted', 'transformed', 'loaded']);
	});
});
