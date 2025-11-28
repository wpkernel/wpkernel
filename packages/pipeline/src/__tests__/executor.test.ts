import { executeHelpers } from '../executor';
import type {
	Helper,
	HelperKind,
	PipelineReporter,
	HelperApplyOptions,
	MaybePromise,
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

type TestApplyOptions = HelperApplyOptions<
	TestContext,
	TestInput,
	TestOutput,
	TestReporter
>;

const runHelper = (
	helper: TestHelper,
	args: TestApplyOptions,
	next?: () => MaybePromise<void>
): MaybePromise<void> => {
	const result = helper.apply(args, next);

	// If the helper is async, wait for it but ignore the value (HelperApplyResult | void)
	if (result && typeof (result as any).then === 'function') {
		return (result as Promise<unknown>).then(() => undefined);
	}

	// Sync helper – already finished; nothing to return
	return undefined;
};

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
			(helper, args, next) => runHelper(helper, args, next),
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
			(helper, args, next) => runHelper(helper, args, next),
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
			(helper, args, next) => runHelper(helper, args, next),
			() => {}
		);

		expect(order).toEqual(['h1-start', 'h2', 'h1-end']);
	});
});
