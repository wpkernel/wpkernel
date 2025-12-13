import { makePipeline } from '../makePipeline';

describe('Stale Diagnostics Reproduction', () => {
	it('accumulates diagnostics across runs if not cleared', async () => {
		const onDiagnostic = jest.fn();
		const pipeline = makePipeline({
			helperKinds: ['fragment'],
			createContext: () => ({
				reporter: {
					warn: jest.fn(),
				},
			}),
			createError: (code, message) => new Error(`[${code}] ${message}`),
			createState: () => ({}),
			createStages: (deps: any) => [
				deps.makeHelperStage('fragment'),
				deps.finalizeResult,
			],
			createRunResult: ({ diagnostics }) => ({
				artifact: {},
				diagnostics,
			}),
			onDiagnostic: (args: any) => onDiagnostic(args),
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
		} catch (_error) {
			// makePipeline may throw on fatal diagnostics
			// Ignored
		}
		const firstRunCallCount = onDiagnostic.mock.calls.length;
		onDiagnostic.mockClear();

		// Run 2: Should not accumulate stale diagnostics from Run 1
		try {
			await pipeline.run({});
		} catch (_e) {
			// expected
		}

		// If diagnostics were stale, onDiagnostic would be called more times in run 2
		expect(onDiagnostic.mock.calls.length).toBe(firstRunCallCount);
	});
});
