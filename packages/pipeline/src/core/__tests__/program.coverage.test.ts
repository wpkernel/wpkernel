import { makePipeline } from '../makePipeline';
import { createAgnosticStages } from '../runner/program';
import { prepareContext } from '../runner/context';
import type {
	AgnosticRunnerDependencies,
	AgnosticState,
	PipelineStage,
	Halt,
} from '../runner/types';
import type { Helper, PipelineReporter, PipelineDiagnostic } from '../types';
import type { RegisteredHelper } from '../dependency-graph';

describe('program coverage', () => {
	it('uses createHelperArgs when provided', async () => {
		const inputs: unknown[] = [];
		const reporter: PipelineReporter = { warn: jest.fn() };

		const pipeline = makePipeline({
			helperKinds: ['custom'],
			createContext: () => ({ reporter }),
			createState: () => ({}),
			createStages: (deps: any) => [
				deps.makeHelperStage(
					'custom',
					undefined,
					({
						context,
					}: {
						context: { reporter: PipelineReporter };
					}) => ({
						context,
						input: 'from-create-helper-args',
						output: undefined,
						reporter: context.reporter,
					})
				),
				deps.finalizeResult,
			],
		});

		const helper: Helper<
			{ reporter: PipelineReporter },
			unknown,
			unknown,
			PipelineReporter
		> = {
			key: 'custom-helper',
			kind: 'custom',
			mode: 'extend',
			priority: 1,
			dependsOn: [],
			apply: (args) => {
				inputs.push(args.input);
			},
		};

		pipeline.use(helper);

		await pipeline.run({});

		expect(inputs).toEqual(['from-create-helper-args']);
	});

	it('throws for invalid helper shapes', () => {
		const helperRegistries = new Map<string, RegisteredHelper<unknown>[]>();
		helperRegistries.set('test', [
			{
				id: 'test:bad#0',
				index: 0,
				helper: {
					key: 'bad',
					kind: 'test',
					mode: 'extend',
					priority: 1,
					dependsOn: [],
				},
			},
		]);

		const dependencies: AgnosticRunnerDependencies<
			Record<string, never>,
			Record<string, never>,
			{ reporter: PipelineReporter },
			PipelineReporter,
			PipelineDiagnostic,
			unknown
		> = {
			options: {
				createContext: () => ({ reporter: { warn: jest.fn() } }),
				createState: () => ({}),
				createError: (_code, message) => new Error(message),
			},
			helperRegistries,
			diagnosticManager: {
				record: () => undefined,
				setReporter: () => undefined,
				readDiagnostics: () => [],
				getDiagnostics: () => [],
				flagConflict: () => undefined,
				flagMissingDependency: () => undefined,
				flagUnusedHelper: () => undefined,
				prepareRun: () => undefined,
				endRun: () => undefined,
			},
			resolveRunResult: () => ({}),
			extensionHooks: [],
			stages: (deps) =>
				[deps.makeHelperStage('test')] as PipelineStage<
					AgnosticState<
						Record<string, never>,
						Record<string, never>,
						{ reporter: PipelineReporter },
						PipelineReporter,
						PipelineDiagnostic
					>,
					Halt<unknown>
				>[],
		};

		const runContext = prepareContext(dependencies, {});
		const stages = createAgnosticStages(dependencies, runContext);

		return Promise.resolve()
			.then(() => stages[0]?.(runContext.state))
			.then((result) => {
				expect(result).toMatchObject({
					__halt: true,
					error: expect.any(Error),
				});
				expect((result as { error?: Error }).error?.message).toContain(
					'Invalid helper: expected function or object with .apply method.'
				);
			});
	});

	it('throws when stages factory is missing', () => {
		const dependencies: AgnosticRunnerDependencies<
			Record<string, never>,
			Record<string, never>,
			{ reporter: PipelineReporter },
			PipelineReporter,
			PipelineDiagnostic,
			unknown
		> = {
			options: {
				createContext: () => ({ reporter: { warn: jest.fn() } }),
				createState: () => ({}),
				createError: (_code, message) => new Error(message),
			},
			helperRegistries: new Map(),
			diagnosticManager: {
				record: () => undefined,
				setReporter: () => undefined,
				readDiagnostics: () => [],
				getDiagnostics: () => [],
				flagConflict: () => undefined,
				flagMissingDependency: () => undefined,
				flagUnusedHelper: () => undefined,
				prepareRun: () => undefined,
				endRun: () => undefined,
			},
			resolveRunResult: () => ({}),
			extensionHooks: [],
		};

		const runContext = prepareContext(dependencies, {});

		expect(() => createAgnosticStages(dependencies, runContext)).toThrow(
			"Agnostic Runner requires 'stages' factory to be defined."
		);
	});
});
