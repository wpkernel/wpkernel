import { makePipeline } from '../makePipeline';
import type { PipelineReporter } from '../types';

describe('makePipeline coverage', () => {
	const mockReporter: PipelineReporter = { warn: jest.fn() };
	const mockContext = { reporter: mockReporter };
	const baseOptions = {
		helperKinds: ['fragment', 'builder'], // Needed for test logic
		createContext: () => mockContext,
		createState: () => ({}),
	};

	it('handles builder conflicts', () => {
		const pipeline = makePipeline({
			...baseOptions,
		});

		const builder1 = {
			kind: 'builder',
			key: 'b1',
			mode: 'override',
			apply: () => {},
		} as any;
		const builder2 = {
			kind: 'builder',
			key: 'b1',
			mode: 'override',
			apply: () => {},
		} as any;

		pipeline.use(builder1);

		// The conflict logic throws when multiple overrides are registered for the same key
		expect(() => {
			pipeline.use(builder2);
		}).toThrow();
	});

	it('supports generic use() for fragments and builders', () => {
		const pipeline = makePipeline(baseOptions);
		const fragment = {
			kind: 'fragment',
			key: 'f1',
			apply: () => {},
		} as any;
		const builder = { kind: 'builder', key: 'b1', apply: () => {} } as any;

		// Cover fragment path
		pipeline.use(fragment);

		// Cover builder path
		pipeline.use(builder);
	});

	it('bypasses default lifecycle creation if stages are overridden', async () => {
		// If 'stages' is provided, the user is responsible for calling makeLifecycleStage
		// defaultStages won't run, so extensionLifecycles config from options shouldn't matter
		// unless the custom stages function uses it.

		const pipeline = makePipeline({
			...baseOptions,
			extensions: { lifecycles: ['skipped-lifecycle'] },
			createStages: (deps: any) => {
				// Return stack without lifecycle stage
				return [deps.finalizeResult];
			},
		});

		// Register hook for the lifecycle
		const hook = jest.fn();
		pipeline.extensions.use({
			key: 'ext',
			register: () => ({ hook, lifecycle: 'skipped-lifecycle' }),
		});

		await pipeline.run({});
		expect(hook).not.toHaveBeenCalled();
	});

	it('requires manual lifecycle inclusion in custom stages', async () => {
		const pipeline = makePipeline({
			...baseOptions,
			extensions: { lifecycles: ['custom-lifecycle'] },
			createStages: (deps: any) => {
				const { makeLifecycleStage, finalizeResult } = deps;
				// Manually include it
				return [makeLifecycleStage('custom-lifecycle'), finalizeResult];
			},
		});

		const hook = jest.fn();
		pipeline.extensions.use({
			key: 'ext',
			register: () => ({ hook, lifecycle: 'custom-lifecycle' }),
		});

		await pipeline.run({});
		expect(hook).toHaveBeenCalled();
	});
});
