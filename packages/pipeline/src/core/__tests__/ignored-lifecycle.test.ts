import { makePipeline } from '../makePipeline';
import { createPipelineExtension } from '../createExtension';

describe('Ignored Lifecycle Reproduction', () => {
	it('warns about ignored hooks for unscheduled lifecycles', async () => {
		const warnSpy = jest.fn();
		const pipeline = makePipeline({
			helperKinds: [],
			createStages: (deps: any) => [
				deps.makeLifecycleStage('fragment'), // Only schedule 'fragment' stage
				deps.finalizeResult,
			],
			createContext: () => ({
				reporter: {
					warn: warnSpy,
				},
			}),
		});

		const hookSpy = jest.fn();

		// Register an extension for a lifecycle that is NOT scheduled
		pipeline.extensions.use(
			createPipelineExtension({
				key: 'ignored-ext',
				lifecycle: 'custom-lifecycle',
				hook: () => {
					hookSpy();
				},
			})
		);

		await pipeline.run({});

		// 1. Verify the hook did NOT run (confirming it was ignored)
		expect(hookSpy).not.toHaveBeenCalled();

		// 2. Verify warning WAS logged (confirming fix)
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				'The following extension hooks will be ignored'
			)
		);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('"custom-lifecycle"')
		);
	});

	it('handles async extension registration', async () => {
		const warnSpy = jest.fn();
		const pipeline = makePipeline({
			helperKinds: [],
			createStages: (deps: any) => [deps.finalizeResult],
			createContext: () => ({
				reporter: {
					warn: warnSpy,
				},
			}),
		});

		const hookSpy = jest.fn();

		// Register an extension with async register
		const extension = createPipelineExtension({
			key: 'async-ignored-ext',
			lifecycle: 'custom-lifecycle',
			hook: () => {
				hookSpy();
			},
		});

		await pipeline.extensions.use({
			...extension,
			register: async (p) => {
				await Promise.resolve();
				return extension.register(p);
			},
		});

		await pipeline.run({});

		expect(hookSpy).not.toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining(
				'The following extension hooks will be ignored'
			)
		);
		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining('"custom-lifecycle"')
		);
	});
});
