import { executeHelpers } from '../executor';
import type {
	Helper,
	HelperKind,
	PipelineReporter,
	HelperApplyOptions,
} from '../types';
import type { RegisteredHelper } from '../dependency-graph';

type TestContext = Record<string, never>;
type TestInput = void;
type TestOutput = void;
type TestReporter = PipelineReporter;
type TestHelper = Helper<
	TestContext,
	TestInput,
	TestOutput,
	TestReporter,
	HelperKind
>;

describe('executor', () => {
	it('runs async helpers sequentially', async () => {
		const order: string[] = [];
		const helpers: RegisteredHelper<TestHelper>[] = [
			{
				id: '1',
				index: 0,
				helper: {
					key: 'h1',
					kind: 'fragment',
					mode: 'extend',
					priority: 0,
					dependsOn: [],
					apply: async () => {
						await Promise.resolve();
						order.push('h1');
					},
				},
			},
			{
				id: '2',
				index: 1,
				helper: {
					key: 'h2',
					kind: 'fragment',
					mode: 'extend',
					priority: 0,
					dependsOn: [],
					apply: async () => {
						await Promise.resolve();
						order.push('h2');
					},
				},
			},
		];

		await executeHelpers<
			TestContext,
			TestInput,
			TestOutput,
			TestReporter,
			HelperKind,
			TestHelper,
			HelperApplyOptions<TestContext, TestInput, TestOutput, TestReporter>
		>(
			helpers,
			() => ({
				context: {},
				input: undefined,
				output: undefined,
				reporter: {} as TestReporter,
			}),
			(helper, args, next) => helper.apply(args, next),
			() => {}
		);

		expect(order).toEqual(['h1', 'h2']);
	});

	it('supports explicit next() calls in async helpers', async () => {
		const order: string[] = [];
		const helpers: RegisteredHelper<TestHelper>[] = [
			{
				id: '1',
				index: 0,
				helper: {
					key: 'h1',
					kind: 'fragment',
					mode: 'extend',
					priority: 0,
					dependsOn: [],
					apply: async (_args, next) => {
						order.push('h1-start');
						if (next) {
							await next();
						}
						order.push('h1-end');
					},
				},
			},
			{
				id: '2',
				index: 1,
				helper: {
					key: 'h2',
					kind: 'fragment',
					mode: 'extend',
					priority: 0,
					dependsOn: [],
					apply: async () => {
						order.push('h2');
					},
				},
			},
		];

		await executeHelpers<
			TestContext,
			TestInput,
			TestOutput,
			TestReporter,
			HelperKind,
			TestHelper,
			HelperApplyOptions<TestContext, TestInput, TestOutput, TestReporter>
		>(
			helpers,
			() => ({
				context: {},
				input: undefined,
				output: undefined,
				reporter: {} as TestReporter,
			}),
			(helper, args, next) => helper.apply(args, next),
			() => {}
		);

		expect(order).toEqual(['h1-start', 'h2', 'h1-end']);
	});

	it('supports explicit next() calls in sync helpers', async () => {
		const order: string[] = [];
		const helpers: RegisteredHelper<TestHelper>[] = [
			{
				id: '1',
				index: 0,
				helper: {
					key: 'h1',
					kind: 'fragment',
					mode: 'extend',
					priority: 0,
					dependsOn: [],
					apply: (_args, next) => {
						order.push('h1-start');
						if (next) {
							void next();
						}
						order.push('h1-end');
					},
				},
			},
			{
				id: '2',
				index: 1,
				helper: {
					key: 'h2',
					kind: 'fragment',
					mode: 'extend',
					priority: 0,
					dependsOn: [],
					apply: () => {
						order.push('h2');
					},
				},
			},
		];

		await executeHelpers<
			TestContext,
			TestInput,
			TestOutput,
			TestReporter,
			HelperKind,
			TestHelper,
			HelperApplyOptions<TestContext, TestInput, TestOutput, TestReporter>
		>(
			helpers,
			() => ({
				context: {},
				input: undefined,
				output: undefined,
				reporter: {} as TestReporter,
			}),
			(helper, args, next) => helper.apply(args, next),
			() => {}
		);

		expect(order).toEqual(['h1-start', 'h2', 'h1-end']);
	});
});
