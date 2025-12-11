import { makePipeline } from '../makePipeline';
import type { PipelineReporter } from '../types';
import { isPromiseLike } from '../async-utils';

describe('Synchronous Execution', () => {
	it('executes synchronously when all helpers and extensions are sync', () => {
		const log: string[] = [];
		const reporter: PipelineReporter = {
			warn: (msg) => log.push(`WARN: ${msg}`),
		};

		const pipeline = makePipeline({
			createContext: () => ({ reporter }),
			createBuildOptions: () => ({}),
			createFragmentState: () => ({ count: 0 }),
			createFragmentArgs: ({ draft }) =>
				({
					input: { draft },
				}) as any,
			finalizeFragmentState: ({ draft }) => draft,
			createBuilderArgs: () => ({}) as any,
		});

		// Sync Helper
		pipeline.use({
			kind: 'fragment',
			key: 'sync-one',
			dependsOn: [],
			apply: ({ input }: any) => {
				input.draft.count++;
			},
		} as any);

		// Run
		const result = pipeline.run({});

		// Assert Result is NOT a promise
		expect(isPromiseLike(result)).toBe(false);
		expect(result).toHaveProperty('artifact', { count: 1 });
		expect(result).toHaveProperty('diagnostics', []);
	});

	it('returns a promise when an async helper is present', async () => {
		const pipeline = makePipeline({
			createContext: () => ({ reporter: { warn: jest.fn() } }),
			createBuildOptions: () => ({}),
			createFragmentState: () => ({}),
			createFragmentArgs: () => ({}) as any,
			finalizeFragmentState: () => ({}),
			createBuilderArgs: () => ({}) as any,
		});

		pipeline.use({
			kind: 'fragment',
			key: 'async-one',
			dependsOn: [],
			apply: async () => {
				await Promise.resolve();
			},
		} as any);

		const resultOrPromise = pipeline.run({});

		expect(isPromiseLike(resultOrPromise)).toBe(true);
		await resultOrPromise;
	});
});
