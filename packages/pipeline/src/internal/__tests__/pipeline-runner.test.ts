import { initPipelineRunner } from '../runner';
import { initDiagnosticManager } from '../diagnostic-manager';
import type { Helper, PipelineDiagnostic, PipelineReporter } from '../../types';
import type { RegisteredHelper } from '../../dependency-graph';
import * as rollbackModule from '../../rollback';

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

type AnyDiagnosticManager = ReturnType<
	typeof initDiagnosticManager<
		unknown,
		unknown,
		{ reporter: PipelineReporter },
		PipelineReporter,
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
	>
>;

const createDiagnosticManagerStub = (): AnyDiagnosticManager => {
	const stub = {
		flagConflict: jest.fn(),
		flagMissingDependency: jest.fn(),
		flagUnusedHelper: jest.fn(),
		describeHelper: (_kind: any, helper: any) => helper.key,
		reviewUnusedHelpers(entries: any[], visited: any, kind: any) {
			for (const entry of entries) {
				if (visited.has(entry.id)) {
					continue;
				}
				(stub.flagUnusedHelper as any)(
					entry.helper,
					kind,
					'was registered but never executed',
					entry.helper.dependsOn
				);
			}
		},
		setReporter: jest.fn(),
		record: jest.fn(),
		readDiagnostics: () => [],
	} as unknown as AnyDiagnosticManager;
	return stub;
};

describe('pipeline-runner', () => {
	describe('builder dependency issues', () => {
		it('flags missing dependencies for builders', async () => {
			const diagnosticManager = createDiagnosticManagerStub();

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
				diagnosticManager,
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [],
				helperRegistries: new Map([
					['fragment', []],
					[
						'builder',
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
						],
					],
				]),
			});

			try {
				runner.prepareContext({} as any);
			} catch (_e) {
				// Expected to throw
			}

			expect(
				diagnosticManager.flagMissingDependency
			).toHaveBeenCalledWith(
				expect.objectContaining({ key: 'b1' }),
				'missing',
				'builder'
			);
			expect(diagnosticManager.flagUnusedHelper).toHaveBeenCalled();
		});

		it('flags unresolved helpers for builders', async () => {
			const diagnosticManager = createDiagnosticManagerStub();

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
				diagnosticManager,
				createError: (_c: string, m: string) => new Error(m),
				helperRegistries: new Map([
					['fragment', []],
					[
						'builder',
						[
							{
								id: 'builder:A#0',
								index: 0,
								helper: {
									key: 'A',
									kind: 'builder',
									dependsOn: ['B'],
									apply: () => {},
									priority: 1,
								} as unknown as TestBuilderHelper,
							},
							{
								id: 'builder:B#1',
								index: 1,
								helper: {
									key: 'B',
									kind: 'builder',
									dependsOn: ['A'],
									apply: () => {},
									priority: 1,
								} as unknown as TestBuilderHelper,
							},
						],
					],
				]),
			} as any);

			try {
				runner.prepareContext({} as any);
			} catch (_e) {
				// Expected to throw
			}

			expect(diagnosticManager.flagUnusedHelper).toHaveBeenCalledTimes(2);
		});
	});

	describe('fragment dependency issues', () => {
		it('flags missing dependencies for fragments', async () => {
			const diagnosticManager = createDiagnosticManagerStub();

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
				diagnosticManager,
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [],
				helperRegistries: new Map([
					[
						'fragment',
						[
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
					],
					['builder', []],
				]),
			});

			try {
				runner.prepareContext({} as any);
			} catch (_e) {
				// Expected to throw due to missing deps
			}

			expect(
				diagnosticManager.flagMissingDependency
			).toHaveBeenCalledWith(
				expect.objectContaining({ key: 'f1' }),
				'missing',
				'fragment'
			);
			expect(diagnosticManager.flagUnusedHelper).toHaveBeenCalled();
		});

		it('flags unresolved helpers for fragments', async () => {
			const diagnosticManager = createDiagnosticManagerStub();

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
				diagnosticManager,
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [],
				helperRegistries: new Map([
					[
						'fragment',
						[
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
					],
					['builder', []],
				]),
			});

			try {
				runner.prepareContext({} as any);
			} catch (_e) {
				// Expected to throw
			}

			expect(diagnosticManager.flagUnusedHelper).toHaveBeenCalledTimes(2);
		});
	});

	describe('program chaining', () => {
		it('runs fragments then builders through the shared helper program chain', async () => {
			type Ctx = { reporter: TestReporter };
			type CountFragmentHelper = Helper<
				Ctx,
				{ draft: { count: number } },
				unknown,
				TestReporter,
				'fragment'
			>;
			type CountBuilderHelper = Helper<
				Ctx,
				{ artifact: { count: number } },
				unknown,
				TestReporter,
				'builder'
			>;
			const reporter: TestReporter = { warn: jest.fn() };
			const diagnosticManager = initDiagnosticManager<
				unknown,
				unknown,
				Ctx,
				TestReporter,
				{ count: number },
				{ count: number },
				PipelineDiagnostic,
				{ artifact: { count: number }; steps: any[] },
				{ draft: { count: number } },
				unknown,
				{ artifact: { count: number } },
				unknown,
				'fragment',
				'builder',
				CountFragmentHelper,
				CountBuilderHelper
			>({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({ reporter }),
					createFragmentState: () => ({ count: 1 }),
					createFragmentArgs: () => ({}) as any,
					finalizeFragmentState: ({
						draft,
					}: {
						draft: { count: number };
					}) => ({
						count: draft.count,
					}),
					createBuilderArgs: () => ({}) as any,
				},
				fragmentKind: 'fragment',
				builderKind: 'builder',
			});

			const fragmentHelper: CountFragmentHelper = {
				key: 'frag',
				kind: 'fragment',
				dependsOn: [],
				priority: 0,
				mode: 'extend',
				apply: ({ input }, next) => {
					input.draft.count += 1;
					return next?.();
				},
			};

			const builderHelper: CountBuilderHelper = {
				key: 'builder',
				kind: 'builder',
				dependsOn: [],
				priority: 0,
				mode: 'extend',
				apply: ({ input }) => {
					input.artifact.count += 1;
				},
			};

			const runner = initPipelineRunner({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({ reporter }),
					createFragmentState: () => ({ count: 1 }),
					finalizeFragmentState: ({
						draft,
					}: {
						draft: { count: number };
					}) => ({
						count: draft.count,
					}),
					createRunResult: ({
						artifact,
						steps,
					}: {
						artifact: { count: number };
						steps: any[];
					}) => ({
						artifact,
						steps,
					}),
					createFragmentArgs: ({
						draft,
					}: {
						draft: { count: number };
					}) =>
						({
							input: { draft },
						}) as any,
					createBuilderArgs: ({
						artifact,
					}: {
						artifact: { count: number };
					}) =>
						({
							input: { artifact },
						}) as any,
				} as any,
				fragmentEntries: [
					{
						id: 'fragment:frag#0',
						index: 0,
						helper: fragmentHelper,
					},
				],
				builderEntries: [
					{
						id: 'builder:builder#0',
						index: 0,
						helper: builderHelper,
					},
				],
				fragmentKind: 'fragment',
				builderKind: 'builder',
				diagnosticManager,
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (state) => state as any,
				extensionHooks: [],
				helperRegistries: new Map([
					[
						'fragment',
						[
							{
								id: 'fragment:frag#0',
								index: 0,
								helper: fragmentHelper,
							},
						] as RegisteredHelper<any>[],
					],
					[
						'builder',
						[
							{
								id: 'builder:builder#0',
								index: 0,
								helper: builderHelper,
							},
						] as RegisteredHelper<any>[],
					],
				]),
			});

			const runContext = runner.prepareContext({} as any);
			const result = await runner.executeRun(runContext);

			expect(result.artifact.count).toBe(3);
			expect(result.steps.map((s: any) => s.key)).toEqual([
				'frag',
				'builder',
			]);
		});
	});

	describe('rollback semantics', () => {
		it('runs fragment rollbacks and halts when a downstream fragment throws', async () => {
			const fragmentRollback = jest.fn();
			const failing = jest.fn(() => {
				throw new Error('fragment boom');
			});

			const fragmentWithRollback: TestFragmentHelper = {
				key: 'frag.withRollback',
				kind: 'fragment',
				dependsOn: [],
				priority: 1,
				mode: 'extend',
				apply: () => ({
					rollback:
						rollbackModule.createPipelineRollback(fragmentRollback),
				}),
			} as any;

			const failingFragment: TestFragmentHelper = {
				key: 'frag.fail',
				kind: 'fragment',
				dependsOn: [],
				priority: 0,
				mode: 'extend',
				apply: failing,
			} as any;

			const runner = initPipelineRunner({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					finalizeFragmentState: () => ({}),
					createFragmentArgs: () => ({}) as any,
					createBuilderArgs: () => ({}) as any,
				} as any,
				fragmentEntries: [
					{
						id: 'fragment:one#0',
						index: 0,
						helper: fragmentWithRollback,
					},
					{
						id: 'fragment:two#1',
						index: 1,
						helper: failingFragment,
					},
				],
				builderEntries: [],
				fragmentKind: 'fragment',
				builderKind: 'builder',
				diagnosticManager: initDiagnosticManager({
					options: {} as any,
					fragmentKind: 'fragment',
					builderKind: 'builder',
				}),
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [],
				helperRegistries: new Map([
					[
						'fragment',
						[
							{
								id: 'fragment:one#0',
								index: 0,
								helper: fragmentWithRollback,
							},
							{
								id: 'fragment:two#1',
								index: 1,
								helper: failingFragment,
							},
						] as RegisteredHelper<any>[],
					],
					['builder', []],
				]),
			});

			const runContext = runner.prepareContext({} as any);
			try {
				await runner.executeRun(runContext);
				throw new Error('expected rejection');
			} catch (error) {
				expect((error as Error).message).toBe('fragment boom');
				expect(fragmentRollback).toHaveBeenCalledTimes(1);
			}
		});

		it('runs builder rollbacks and halts when a builder throws', async () => {
			const builderRollback = jest.fn();

			const builderWithRollback: TestBuilderHelper = {
				key: 'builder.withRollback',
				kind: 'builder',
				dependsOn: [],
				priority: 1,
				mode: 'extend',
				apply: () => ({
					rollback:
						rollbackModule.createPipelineRollback(builderRollback),
				}),
			} as any;

			const failingBuilder: TestBuilderHelper = {
				key: 'builder.fail',
				kind: 'builder',
				dependsOn: [],
				priority: 0,
				mode: 'extend',
				apply: () => {
					throw new Error('builder boom');
				},
			} as any;

			const runner = initPipelineRunner({
				options: {
					createBuildOptions: () => ({}),
					createContext: () => ({
						reporter: { warn: jest.fn() },
					}),
					createFragmentState: () => ({}),
					finalizeFragmentState: () => ({}),
					createFragmentArgs: () => ({}) as any,
					createBuilderArgs: () => ({}) as any,
				} as any,
				fragmentEntries: [],
				builderEntries: [
					{
						id: 'builder:one#0',
						index: 0,
						helper: builderWithRollback,
					},
					{
						id: 'builder:two#1',
						index: 1,
						helper: failingBuilder,
					},
				],
				fragmentKind: 'fragment',
				builderKind: 'builder',
				diagnosticManager: initDiagnosticManager({
					options: {} as any,
					fragmentKind: 'fragment',
					builderKind: 'builder',
				}),
				createError: (_c: string, m: string) => new Error(m),
				resolveRunResult: (r) => r,
				extensionHooks: [],
				helperRegistries: new Map([
					['fragment', []],
					[
						'builder',
						[
							{
								id: 'builder:one#0',
								index: 0,
								helper: builderWithRollback,
							},
							{
								id: 'builder:two#1',
								index: 1,
								helper: failingBuilder,
							},
						] as RegisteredHelper<any>[],
					],
				]),
			});

			const runContext = runner.prepareContext({} as any);
			await expect(
				Promise.resolve().then(() => runner.executeRun(runContext))
			).rejects.toThrow('builder boom');

			expect(builderRollback).toHaveBeenCalledTimes(1);
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
				helperRegistries: new Map([
					['fragment', []],
					['builder', []],
				]),
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
