import { createPipeline } from '../createPipeline';
import type {
	Helper,
	PipelineReporter,
	PipelineRunState,
} from '../../core/types';

describe('standard pipeline runner coverage', () => {
	const baseReporter: PipelineReporter = { warn: jest.fn() };

	it('invokes diagnostic factories for conflicts and missing dependencies', () => {
		const conflictSpy = jest.fn();
		const missingSpy = jest.fn();
		const unusedSpy = jest.fn();

		const pipeline = createPipeline({
			createBuildOptions: () => ({}),
			createContext: () => ({ reporter: baseReporter }),
			createFragmentState: () => ({ draft: true }),
			createFragmentArgs: ({ draft, context }) => ({
				context,
				input: draft,
				output: undefined,
				reporter: baseReporter,
			}),
			finalizeFragmentState: ({ draft }) => draft,
			createBuilderArgs: ({ artifact, context }) => ({
				context,
				input: artifact,
				output: undefined,
				reporter: baseReporter,
			}),
			createConflictDiagnostic: conflictSpy,
			createMissingDependencyDiagnostic: missingSpy,
			createUnusedHelperDiagnostic: unusedSpy,
		});

		const helperBase: Helper<
			{ reporter: PipelineReporter },
			unknown,
			unknown,
			PipelineReporter,
			'fragment'
		> = {
			key: 'dup',
			kind: 'fragment',
			mode: 'override',
			priority: 1,
			dependsOn: [],
			apply: () => undefined,
		};

		pipeline.ir.use(helperBase);

		expect(() =>
			pipeline.ir.use({
				...helperBase,
				priority: 2,
			})
		).toThrow('Multiple overrides registered for helper "dup".');

		const missingDepHelper: Helper<
			{ reporter: PipelineReporter },
			unknown,
			unknown,
			PipelineReporter,
			'fragment'
		> = {
			key: 'needs-missing',
			kind: 'fragment',
			mode: 'extend',
			priority: 1,
			dependsOn: ['unknown'],
			apply: () => undefined,
		};

		pipeline.ir.use(missingDepHelper);

		expect(() => pipeline.run({})).toThrow();
		expect(conflictSpy).toHaveBeenCalled();
		expect(missingSpy).toHaveBeenCalled();
		expect(unusedSpy).toHaveBeenCalled();
	});

	it('adapts extension hooks for draft and artifact lifecycles', async () => {
		const reporter: PipelineReporter = { warn: jest.fn() };
		let builderArtifact: unknown;

		const pipeline = createPipeline({
			createBuildOptions: () => ({}),
			createContext: () => ({ reporter }),
			createFragmentState: () => ({ title: 'draft' }),
			createFragmentArgs: ({ draft, context }) => ({
				context,
				input: draft,
				output: undefined,
				reporter,
			}),
			finalizeFragmentState: ({ draft }) => draft,
			createBuilderArgs: ({ artifact, context }) => {
				builderArtifact = artifact;
				return {
					context,
					input: artifact,
					output: undefined,
					reporter,
				};
			},
		});

		pipeline.ir.use({
			key: 'fragment',
			kind: 'fragment',
			mode: 'extend',
			priority: 1,
			dependsOn: [],
			apply: () => undefined,
		});

		pipeline.builders.use({
			key: 'builder',
			kind: 'builder',
			mode: 'extend',
			priority: 1,
			dependsOn: [],
			apply: () => undefined,
		});

		pipeline.extensions.use({
			key: 'draft-hook',
			register: () => () => ({ artifact: { title: 'draft-updated' } }),
		});

		pipeline.extensions.use({
			key: 'artifact-hook',
			register: () => ({
				hook: () => ({ artifact: { title: 'artifact-updated' } }),
				lifecycle: 'before-builders',
			}),
		});

		const result = (await pipeline.run({})) as PipelineRunState<{
			title: string;
		}>;

		expect(result.artifact.title).toBe('artifact-updated');
		expect((builderArtifact as { title: string }).title).toBe(
			'artifact-updated'
		);
	});

	it('throws for helper kind mismatches with and without custom errors', () => {
		const pipelineWithError = createPipeline({
			createBuildOptions: () => ({}),
			createContext: () => ({ reporter: baseReporter }),
			createFragmentState: () => ({}),
			createFragmentArgs: ({ draft, context }) => ({
				context,
				input: draft,
				output: undefined,
				reporter: baseReporter,
			}),
			finalizeFragmentState: ({ draft }) => draft,
			createBuilderArgs: ({ artifact, context }) => ({
				context,
				input: artifact,
				output: undefined,
				reporter: baseReporter,
			}),
			createError: (code, message) => {
				const error = new Error(message);
				(error as { code?: string }).code = code;
				return error;
			},
		});

		expect(() =>
			pipelineWithError.ir.use({
				key: 'wrong',
				kind: 'builder',
				mode: 'extend',
				priority: 1,
				dependsOn: [],
				apply: () => undefined,
			} as unknown as Helper<
				{ reporter: PipelineReporter },
				unknown,
				unknown,
				PipelineReporter,
				'fragment'
			>)
		).toThrow('expected "fragment"');

		const pipelineNoError = createPipeline({
			createBuildOptions: () => ({}),
			createContext: () => ({ reporter: baseReporter }),
			createFragmentState: () => ({}),
			createFragmentArgs: ({ draft, context }) => ({
				context,
				input: draft,
				output: undefined,
				reporter: baseReporter,
			}),
			finalizeFragmentState: ({ draft }) => draft,
			createBuilderArgs: ({ artifact, context }) => ({
				context,
				input: artifact,
				output: undefined,
				reporter: baseReporter,
			}),
		});

		expect(() =>
			pipelineNoError.builders.use({
				key: 'wrong',
				kind: 'fragment',
				mode: 'extend',
				priority: 1,
				dependsOn: [],
				apply: () => undefined,
			} as unknown as Helper<
				{ reporter: PipelineReporter },
				unknown,
				unknown,
				PipelineReporter,
				'builder'
			>)
		).toThrow('expected "builder"');
	});
});
