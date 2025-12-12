import { makePipeline } from '../standard-pipeline/makePipeline';

describe('Stale Diagnostics Reproduction', () => {
	it('accumulates diagnostics across runs if not cleared', async () => {
		const onDiagnostic = jest.fn();
		const pipeline = makePipeline({
			stages: (deps) => [deps.makeLifecycleStage('fragment')],
			createContext: () => ({
				reporter: {
					warn: jest.fn(),
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
			onDiagnostic: (args) => onDiagnostic(args),
		});

		// Register a helper that has a missing dependency (runtime check)
		pipeline.use({
			kind: 'fragment',
			key: 'dependent',
			mode: 'extend',
			priority: 10,
			dependsOn: ['missing'],
			apply: () => {},
		});

		// Run 1: Should report missing dependency and unused helper (2 diagnostics)
		try {
			await pipeline.run({});
		} catch (_e) {
			// Expected error
		}
		expect(onDiagnostic).toHaveBeenCalledTimes(2);
		expect(onDiagnostic).toHaveBeenCalledWith(
			expect.objectContaining({
				diagnostic: expect.objectContaining({
					type: 'missing-dependency',
				}),
			})
		);

		onDiagnostic.mockClear();

		// Run 2: Should report missing dependency AGAIN because the graph analysis runs again.
		// If the bug exists (stale diagnostics accumulator), we get 2 diagnostics (Old) + 2 diagnostics (New).
		try {
			await pipeline.run({});
		} catch (_e) {
			// Expected error
		}

		// The bug means we see 2 diagnostics instead of 1.
		expect(onDiagnostic).toHaveBeenCalledTimes(2);
	});
});
