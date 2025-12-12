import { makePipeline } from '../standard-pipeline/makePipeline';
import { createPipelineExtension } from '../core/createExtension';

describe('Ignored Lifecycle Reproduction', () => {
	it('silently ignores hooks for unscheduled lifecycles', async () => {
		const warnSpy = jest.fn();
		const pipeline = makePipeline({
			stages: (deps) => [deps.makeLifecycleStage('fragment')], // Only schedule 'fragment' stage
			createContext: () => ({
				reporter: {
					warn: warnSpy,
				},
			}),
			createBuildOptions: () => ({}),
			createFragmentState: () => ({}),
			createFragmentArgs: () => ({
				context: { reporter: { warn: jest.fn() } },
				input: {},
				output: {},
				reporter: { warn: jest.fn() },
			}),
			finalizeFragmentState: () => ({}),
			createBuilderArgs: () => ({
				context: { reporter: { warn: jest.fn() } },
				input: {},
				output: {},
				reporter: { warn: jest.fn() },
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
