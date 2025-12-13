import { makePipeline } from '../makePipeline';

describe('Registration Diagnostics Reproduction', () => {
	it('wipes registration-time diagnostics when run() is called', async () => {
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
			// Wait, override removes previous. Conflict is when we have duplicate WITHOUT override?
			// No, duplicate keys with default mode (extend? no, 'extend' is for extending existing).
			// If duplicate keys are registered?
			// registerHelper checks: if helper.mode === 'override', check for existing override.
			// What if mode is NOT override? It just pushes.
			// Wait, let's check registration.ts again.
			// Line 48 checks kind.
			// Line 55 checks mode === 'override'.
			// Registration doesn't seem to block duplicates if mode != override?
			// It just appends?

			// Ah, `registerHelper` only flags conflict if `mode === 'override'` AND `existingOverride` exists.
			// Meaning two helpers trying to "override" the same key.

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

		// At this point, onDiagnostic should have been called once?
		// DiagnosticManager calls `record`, which triggers `onDiagnostic`?
		// Let's check `DiagnosticManager`.

		// If onDiagnostic was called immediately, then `clear()` clearing the array won't "un-call" the listener.
		// BUT, if we `readDiagnostics()` later, they will be gone.
		// AND, the user said "surface in readDiagnostics ... for the first run".

		// Let's verify if `onDiagnostic` is called immediately.

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
