import path from 'node:path';
import { resolvePlanPaths } from '../plan.paths';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { createReporterMock } from '@cli-tests/reporter';

const baseIr = makeIr();
const baseOptions = {
	input: {
		phase: 'generate',
		options: {
			namespace: baseIr.meta.namespace,
			origin: baseIr.meta.origin,
			sourcePath: baseIr.meta.sourcePath,
		},
		ir: baseIr,
	},
	context: {
		workspace: makeWorkspaceMock(),
		reporter: createReporterMock(),
		phase: 'generate',
		generationState: buildEmptyGenerationState(),
	},
	output: {
		actions: [],
		queueWrite: jest.fn(),
	},
	reporter: createReporterMock(),
} satisfies Parameters<typeof resolvePlanPaths>[0];

describe('plan.paths', () => {
	it('resolves artifact plans to paths', () => {
		const paths = resolvePlanPaths(baseOptions);
		const { artifacts } = baseIr;
		expect(paths).toEqual(
			expect.objectContaining({
				planManifest: artifacts.plan.planManifestPath,
				planBase: artifacts.plan.planBaseDir,
				planIncoming: artifacts.plan.planIncomingDir,
				runtimeGenerated: artifacts.runtime.runtime.generated,
				runtimeApplied: artifacts.runtime.runtime.applied,
				phpGenerated: path.posix.dirname(
					artifacts.php.pluginLoaderPath
				),
				pluginLoader: artifacts.php.pluginLoaderPath,
				bundlerConfig: artifacts.bundler.configPath,
			})
		);
	});

	it('throws when IR is missing', () => {
		const options = {
			input: {},
			context: {},
		} as unknown as typeof baseOptions;
		expect(() => resolvePlanPaths(options)).toThrow(
			'Plan paths cannot be resolved without an IR.'
		);
	});
});
