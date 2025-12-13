import { makePipeline } from '../makePipeline';

describe('Registration Diagnostics Reproduction', () => {
	it('preserves registration-time diagnostics after run() is called', async () => {
		const onDiagnostic = jest.fn();
		const pipeline = makePipeline({
			helperKinds: [],
			createStages: (deps: any) => [
				deps.makeLifecycleStage('fragment'),
				deps.finalizeResult,
			],
			createContext: () => ({
				reporter: {
					warn: jest.fn(),
				},
			}),

			onDiagnostic: (args) => onDiagnostic(args),
		});

		// 1. Trigger a registration conflict (which throws, but also logs a diagnostic)
		const helper = {
			kind: 'fragment',
			key: 'conflict',
			mode: 'override',
			dependsOn: [],
			apply: () => {},
		};

		// Register first override
		pipeline.use({ ...helper, mode: 'override' } as any);

		// Register second override (should conflict)
		try {
			pipeline.use({ ...helper, mode: 'override' } as any);
		} catch (_e) {
			// Ignore the throw, we want to check the diagnostic
		}

		// Now run the pipeline
		const result = await pipeline.run({});

		// The bug is fixed, so we expect the registration diagnostic to be present.
		expect(result.diagnostics.length).toBeGreaterThan(0);
		expect(result.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'conflict',
					key: 'conflict',
				}),
			])
		);
	});
});
