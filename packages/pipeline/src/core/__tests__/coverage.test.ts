import { executeHelpers } from '../execution-utils';
import { executeRun } from '../runner/execution';
import { createAgnosticDiagnosticManager } from '../runner/diagnostics';
import { prepareContext } from '../runner/context';

describe('coverage improvements', () => {
	describe('execution-utils', () => {
		it('skips missing entries (defensive coding)', async () => {
			const steps = [
				undefined,
				{ id: 'step1', helper: { apply: () => {} } },
			] as any;
			const makeArgs = () => ({}) as any;
			const invoke = (fn: any, args: any, next: any) =>
				fn.apply(args, next) as void;
			const recordStep = jest.fn();

			// Should not throw and should eventually execute step1
			await executeHelpers(steps, makeArgs, invoke, recordStep);

			expect(recordStep).toHaveBeenCalledTimes(1);
		});

		it('skips already visited entries', async () => {
			const step1 = { id: 'step1', helper: { apply: jest.fn() } } as any;
			const step2 = { id: 'step1', helper: { apply: jest.fn() } } as any; // Duplicate ID
			const steps = [step1, step2];

			await executeHelpers(
				steps,
				() => ({}) as any,
				(fn, args, next) => fn.apply(args, next) as void,
				() => {} // no-op recordStep
			);

			expect(step1.helper.apply).toHaveBeenCalledTimes(1);
			expect(step2.helper.apply).not.toHaveBeenCalled();
		});

		it('safeguards against multiple next() calls', async () => {
			const step = {
				id: 'step1',
				helper: {
					apply: (_: any, next: any) => {
						next();
						next(); // Second call should be ignored/return same result
					},
				},
			} as any;
			const steps = [step];

			await executeHelpers(
				steps,
				() => ({}) as any,
				(fn: any, args: any, next: any) => fn.apply(args, next) as void,
				() => {}
			);
		});
	});

	describe('runner/context', () => {
		it('handles unresolved helpers during context preparation', () => {
			// Mock dependencies
			const createError = jest.fn((_, msg) => new Error(msg));
			const diagnosticManager = {
				prepareRun: jest.fn(),
				setReporter: jest.fn(),
				flagMissingDependency: jest.fn(),
				flagUnusedHelper: jest.fn(),
			};

			const circularHelperA = {
				key: 'A',
				id: 'kind:A#0',
				index: 0,
				helper: { key: 'A', dependsOn: ['B'] },
			};
			const circularHelperB = {
				key: 'B',
				id: 'kind:B#1',
				index: 1,
				helper: { key: 'B', dependsOn: ['A'] },
			};

			const context = { reporter: {} };
			const dependencies = {
				diagnosticManager,
				helperRegistries: new Map([
					['kind', [circularHelperA, circularHelperB]],
				]),
				options: {
					createContext: () => context,
					createState: () => ({}),
					createError,
				},
			};

			const runOptions = {};

			expect(() => {
				prepareContext(dependencies as any, runOptions as any);
			}).toThrow('Detected unresolved pipeline helpers: A, B.');

			// Verify that onUnresolvedHelpers callback logic was executed
			// We check if flagUnusedHelper was called for the circular refs
			expect(diagnosticManager.flagUnusedHelper).toHaveBeenCalledTimes(2);
			expect(diagnosticManager.flagUnusedHelper).toHaveBeenCalledWith(
				circularHelperA.helper,
				'kind',
				'has unresolved dependencies (possible cycle)',
				['B']
			);
		});

		it('handles missing dependencies during context preparation', () => {
			const diagnosticManager = {
				prepareRun: jest.fn(),
				setReporter: jest.fn(),
				flagMissingDependency: jest.fn(),
				flagUnusedHelper: jest.fn(),
			};

			const helperA = {
				key: 'A',
				id: 'kind:A#0',
				index: 0,
				helper: { key: 'A', dependsOn: ['MISSING'] },
			};

			const context = { reporter: {} };
			const dependencies = {
				diagnosticManager,
				helperRegistries: new Map([['kind', [helperA]]]),
				options: {
					createContext: () => context,
					createState: () => ({}),
					// undefined createError -> dependency-graph might not throw but callback executes?
					// Actually dependency-graph throws if createError provided or if critical?
					// Let's provide createError to be safe, but we expect it to throw.
					createError: jest.fn((_, msg) => new Error(msg)),
				},
			};

			expect(() => {
				prepareContext(dependencies as any, {} as any);
			}).toThrow(/Helpers depend on unknown helpers/);

			expect(
				diagnosticManager.flagMissingDependency
			).toHaveBeenCalledWith(helperA.helper, 'MISSING', 'kind');
			expect(diagnosticManager.flagUnusedHelper).toHaveBeenCalled();
		});

		it('exposes handleRollbackError which calls options callback', () => {
			const onExtensionRollbackError = jest.fn();
			const dependencies = {
				diagnosticManager: {
					getDiagnostics: () => [],
					prepareRun: jest.fn(),
					setReporter: jest.fn(),
				},
				helperRegistries: new Map(),
				options: {
					createContext: () => ({ reporter: {} }),
					createState: () => ({}),
					onExtensionRollbackError,
				},
			};

			const result = prepareContext(dependencies as any, {} as any);

			const errorEvent = {
				error: new Error('foo'),
				extensionKeys: ['ext'],
				hookSequence: ['hook'],
				errorMetadata: {} as any,
			};

			result.handleRollbackError({
				...errorEvent,
				context: result.context,
			} as any);

			expect(onExtensionRollbackError).toHaveBeenCalledWith(
				expect.objectContaining({
					error: errorEvent.error,
				})
			);
		});

		it('handleRollbackError does nothing if handler not provided', () => {
			const dependencies = {
				diagnosticManager: {
					getDiagnostics: () => [],
					prepareRun: jest.fn(),
					setReporter: jest.fn(),
				},
				helperRegistries: new Map(),
				options: {
					createContext: () => ({ reporter: {} }),
					createState: () => ({}),
					// onExtensionRollbackError undefined
				},
			};

			const result = prepareContext(dependencies as any, {} as any);

			// Should not throw
			result.handleRollbackError({
				error: new Error('foo'),
				extensionKeys: [],
				hookSequence: [],
				errorMetadata: {} as any,
				context: result.context,
			});
		});
	});

	describe('runner/diagnostics', () => {
		it('creates manager with default options', () => {
			const manager = createAgnosticDiagnosticManager();
			expect(manager).toBeDefined();
			// Coverage for line 82: options = {}
		});
	});

	describe('runner/execution', () => {
		const mockResolve = jest.fn((x) => x);
		const baseDeps = {
			resolveRunResult: mockResolve,
			options: { onHelperRollbackError: jest.fn() },
		};
		const baseContext = {
			runOptions: {},
			context: { reporter: {} },
			state: { userState: {} },
		};

		it('returns early if no stages defined', () => {
			const result: any = executeRun(
				{ ...baseDeps, stages: undefined } as any,
				baseContext as any
			);

			expect(result).toBeDefined();
			expect(result.steps).toEqual([]);
		});

		it('handles Halt result with success data', () => {
			const customStage: any = () => ({
				__halt: true,
				result: 'custom-success',
			});

			// We need createAgnosticProgram to include our stage.
			// executeRun calls createAgnosticProgram which uses dependencies.stages.

			const result = executeRun(
				{ ...baseDeps, stages: () => [customStage] } as any,
				baseContext as any
			);

			expect(result).toBe('custom-success');
		});
	});
});
