import { initDiagnosticManager } from '../diagnostic-manager';
import type { Helper, PipelineDiagnostic, PipelineReporter } from '../../types';

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

describe('diagnostic-manager', () => {
	it('uses default diagnostic creation functions when options are missing', () => {
		const manager = initDiagnosticManager<
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
		>({
			options: {
				createBuildOptions: () => ({}),
				createContext: () => ({ reporter: {} as PipelineReporter }),
				createFragmentState: () => ({}),
				createFragmentArgs: () => ({}) as any,
				finalizeFragmentState: () => ({}),
				createBuilderArgs: () => ({}) as any,
			},
			fragmentKind: 'fragment',
			builderKind: 'builder',
		});

		const helper = {
			key: 'h1',
			mode: 'extend',
			kind: 'fragment',
			origin: 'o1',
		} as unknown as TestFragmentHelper;
		const existing = {
			key: 'h1',
			mode: 'extend',
			kind: 'fragment',
			origin: 'o2',
		} as unknown as TestFragmentHelper;

		manager.flagConflict(helper, existing, 'fragment', 'conflict msg');
		manager.flagMissingDependency(helper, 'missing', 'fragment');
		manager.flagUnusedHelper(helper, 'fragment', 'unused', []);

		const diagnostics = manager.readDiagnostics();
		expect(diagnostics).toHaveLength(3);
		expect(diagnostics[0]?.type).toBe('conflict');
		expect(diagnostics[1]?.type).toBe('missing-dependency');
		expect(diagnostics[2]?.type).toBe('unused-helper');
	});
});
