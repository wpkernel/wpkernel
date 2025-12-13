import { makePipeline } from '../makePipeline';
import { createPipelineExtension } from '../createExtension';

describe('Ignored Lifecycle Reproduction', () => {
	it('silently ignores hooks for unscheduled lifecycles', async () => {
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
});
