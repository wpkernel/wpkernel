import { initPipelineRunner } from '../pipeline-runner';
import { createDependencyGraph } from '../../dependency-graph';
import { initDiagnosticManager } from '../diagnostic-manager';
import type { Helper, PipelineDiagnostic, PipelineReporter } from '../../types';
import type { RegisteredHelper } from '../../dependency-graph';

type TestFragmentHelper = Helper<
	unknown,
	unknown,
	unknown,
	PipelineReporter,
	'fragment'
>;
type TestBuilderHelper = Helper<
	unknown,
	unknown,
	unknown,
	PipelineReporter,
	'builder'
>;
type TestReporter = PipelineReporter & { warn: jest.Mock };

describe('pipeline-runner', () => {
	describe('builder dependency issues', () => {
		it('flags missing dependencies for builders', async () => {
			const manager = initDiagnosticManager<
				unknown,
				unknown,
				{ reporter: TestReporter },
				TestReporter,
				unknown,
				unknown,
				PipelineDiagnostic,
				unknown,
				unknown,
				unknown,
				unknown,
				unknown,
				'fragment',
				'builder',
				TestFragmentHelper,
				TestBuilderHelper
			>({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					createFragmentArgs: () => ({}) as any,
					finalizeFragmentState: () => ({}),
					createBuilderArgs: () => ({}) as any,
				},
				fragmentKind: 'fragment',
				builderKind: 'builder',
			});

			// Spy on flagMissingDependency
			const flagSpy = jest.spyOn(manager, 'flagMissingDependency');
			const flagUnusedSpy = jest.spyOn(manager, 'flagUnusedHelper');

			const runner = initPipelineRunner({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					finalizeFragmentState: () => ({}),
					builderProvidedKeys: [],
					fragmentProvidedKeys: [],
					createFragmentArgs: () => ({}) as any,
					createBuilderArgs: () => ({}) as any,
				} as any,
				fragmentEntries: [],
				builderEntries: [
					{
						id: 'builder:b1#0',
						index: 0,
						helper: {
							key: 'b1',
							kind: 'builder',
							dependsOn: ['missing'],
							apply: () => {},
						} as unknown as TestBuilderHelper,
					},
				],
				fragmentKind: 'fragment',
				builderKind: 'builder',
				diagnosticManager: manager,
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [],
			});

			const context = runner.prepareContext({} as any);

			// Trigger graph creation for builders which happens inside executeRun
			// but we can trigger it by calling createDependencyGraph with the options from context

			try {
				createDependencyGraph(
					[
						{
							id: 'builder:b1#0',
							index: 0,
							helper: {
								key: 'b1',
								kind: 'builder',
								dependsOn: ['missing'],
								apply: () => {},
							} as unknown as TestBuilderHelper,
						},
					] as RegisteredHelper<TestBuilderHelper>[],
					context.builderGraphOptions,
					(_c: string, m: string) => new Error(m)
				);
			} catch (_e) {
				// Expected to throw
			}

			expect(flagSpy).toHaveBeenCalledWith(
				expect.objectContaining({ key: 'b1' }),
				'missing',
				'builder'
			);
			expect(flagUnusedSpy).toHaveBeenCalled();
		});

		it('flags unresolved helpers for builders', async () => {
			const manager = initDiagnosticManager<
				unknown,
				unknown,
				{ reporter: TestReporter },
				TestReporter,
				unknown,
				unknown,
				PipelineDiagnostic,
				unknown,
				unknown,
				unknown,
				unknown,
				unknown,
				'fragment',
				'builder',
				TestFragmentHelper,
				TestBuilderHelper
			>({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					createFragmentArgs: () => ({}) as any,
					finalizeFragmentState: () => ({}),
					createBuilderArgs: () => ({}) as any,
				},
				fragmentKind: 'fragment',
				builderKind: 'builder',
			});

			const flagUnusedSpy = jest.spyOn(manager, 'flagUnusedHelper');

			const runner = initPipelineRunner({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					finalizeFragmentState: () => ({}),
					builderProvidedKeys: [],
					fragmentProvidedKeys: [],
				} as any,
				fragmentEntries: [],
				builderEntries: [],
				fragmentKind: 'fragment',
				builderKind: 'builder',
				diagnosticManager: manager,
				createError: (_c: string, m: string) => new Error(m),
			} as any);

			const context = runner.prepareContext({} as any);

			try {
				const hA = {
					key: 'A',
					kind: 'builder',
					dependsOn: ['B'],
					apply: () => {},
					priority: 1,
				} as unknown as TestBuilderHelper;
				const hB = {
					key: 'B',
					kind: 'builder',
					dependsOn: ['A'],
					apply: () => {},
					priority: 1,
				} as unknown as TestBuilderHelper;
				createDependencyGraph(
					[
						{ id: 'builder:A#0', index: 0, helper: hA },
						{ id: 'builder:B#1', index: 1, helper: hB },
					] as RegisteredHelper<TestBuilderHelper>[],
					context.builderGraphOptions,
					(_c: string, m: string) => new Error(m)
				);
			} catch (_e) {
				// Expected to throw
			}

			expect(flagUnusedSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('fragment dependency issues', () => {
		it('flags missing dependencies for fragments', async () => {
			const manager = initDiagnosticManager<
				unknown,
				unknown,
				{ reporter: TestReporter },
				TestReporter,
				unknown,
				unknown,
				PipelineDiagnostic,
				unknown,
				unknown,
				unknown,
				unknown,
				unknown,
				'fragment',
				'builder',
				TestFragmentHelper,
				TestBuilderHelper
			>({
				options: {} as any,
				fragmentKind: 'fragment',
				builderKind: 'builder',
			});

			const flagSpy = jest.spyOn(manager, 'flagMissingDependency');
			const flagUnusedSpy = jest.spyOn(manager, 'flagUnusedHelper');

			const runner = initPipelineRunner({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					createFragmentArgs: () => ({}) as any,
					finalizeFragmentState: () => ({}),
					createBuilderArgs: () => ({}) as any,
					builderProvidedKeys: [],
					fragmentProvidedKeys: [],
				} as any,
				fragmentEntries: [
					{
						id: 'fragment:f1#0',
						index: 0,
						helper: {
							key: 'f1',
							kind: 'fragment',
							dependsOn: ['missing'],
							apply: () => {},
						} as unknown as TestFragmentHelper,
					},
				],
				builderEntries: [],
				fragmentKind: 'fragment',
				builderKind: 'builder',
				diagnosticManager: manager,
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [],
			});

			// prepareContext triggers fragment graph creation
			try {
				runner.prepareContext({} as any);
			} catch (_e) {
				// Expected to throw due to missing deps
			}

			expect(flagSpy).toHaveBeenCalledWith(
				expect.objectContaining({ key: 'f1' }),
				'missing',
				'fragment'
			);
			expect(flagUnusedSpy).toHaveBeenCalled();
		});

		it('flags unresolved helpers for fragments', async () => {
			const manager = initDiagnosticManager<
				unknown,
				unknown,
				{ reporter: TestReporter },
				TestReporter,
				unknown,
				unknown,
				PipelineDiagnostic,
				unknown,
				unknown,
				unknown,
				unknown,
				unknown,
				'fragment',
				'builder',
				TestFragmentHelper,
				TestBuilderHelper
			>({
				options: {} as any,
				fragmentKind: 'fragment',
				builderKind: 'builder',
			});

			const flagUnusedSpy = jest.spyOn(manager, 'flagUnusedHelper');

			const runner = initPipelineRunner({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					createFragmentArgs: () => ({}) as any,
					finalizeFragmentState: () => ({}),
					createBuilderArgs: () => ({}) as any,
					builderProvidedKeys: [],
					fragmentProvidedKeys: [],
				} as any,
				fragmentEntries: [
					{
						id: 'fragment:A#0',
						index: 0,
						helper: {
							key: 'A',
							kind: 'fragment',
							dependsOn: ['B'],
							apply: () => {},
							priority: 1,
						} as unknown as TestFragmentHelper,
					},
					{
						id: 'fragment:B#1',
						index: 1,
						helper: {
							key: 'B',
							kind: 'fragment',
							dependsOn: ['A'],
							apply: () => {},
							priority: 1,
						} as unknown as TestFragmentHelper,
					},
				],
				builderEntries: [],
				fragmentKind: 'fragment',
				builderKind: 'builder',
				diagnosticManager: manager,
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [],
			});

			try {
				runner.prepareContext({} as any);
			} catch (_e) {
				// Expected to throw
			}

			expect(flagUnusedSpy).toHaveBeenCalledTimes(2);
		});
	});

	describe('extension commit failure', () => {
		it('handles extension commit failure', async () => {
			const manager = initDiagnosticManager<
				unknown,
				unknown,
				{ reporter: TestReporter },
				TestReporter,
				unknown,
				unknown,
				PipelineDiagnostic,
				unknown,
				unknown,
				unknown,
				unknown,
				unknown,
				'fragment',
				'builder',
				TestFragmentHelper,
				TestBuilderHelper
			>({
				options: {} as any,
				fragmentKind: 'fragment',
				builderKind: 'builder',
			});

			const hook = jest.fn().mockReturnValue({
				commit: () => {
					throw new Error('Commit failed');
				},
			});

			const onExtensionRollbackError = jest.fn();

			const runner = initPipelineRunner({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					createFragmentArgs: () => ({}) as any,
					finalizeFragmentState: () => ({}),
					createBuilderArgs: () => ({}) as any,
					createExtensionHookOptions: () => ({}) as any,
					onExtensionRollbackError,
				} as any,
				fragmentEntries: [],
				builderEntries: [],
				fragmentKind: 'fragment',
				builderKind: 'builder',
				diagnosticManager: manager,
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [
					{
						key: 'ext1',
						lifecycle: 'after-fragments',
						hook,
					},
				],
			});

			const runContext = runner.prepareContext({} as any);

			try {
				await runner.executeRun(runContext);
				throw new Error('Should have thrown');
			} catch (e) {
				expect((e as Error).message).toBe('Commit failed');
			}
		});
	});
});
