import path from 'node:path';
import { execFile } from 'node:child_process';
import { createPatcher } from '../patcher';
import { createPhpDriverInstaller } from '@wpkernel/php-json-ast';
import type { BuildIrOptions, IRv1 } from '../../ir/publicTypes';
import type { BuilderOutput } from '../../runtime/types';
import type { Workspace } from '../../workspace/types';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	withWorkspace as withBuilderWorkspace,
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';
import { makeIrMeta } from '@cli-tests/ir.test-support';
import { buildEmptyGenerationState } from '../../apply/manifest';

jest.mock('node:child_process', () => {
	const execFileMock = jest.fn(
		(
			_cmd: string,
			_args: readonly string[],
			_options: unknown,
			callback?: (
				error: Error | null,
				stdout: string,
				stderr: string
			) => void
		) => {
			callback?.(null, '', '');
		}
	);

	return { execFile: execFileMock };
});

const buildOptions: BuildIrOptions = {
	config: {
		version: 1,
		namespace: 'test',
		schemas: {},
		resources: {},
	},
	namespace: 'test',
	origin: 'typescript',
	sourcePath: '/workspace/wpk.config.ts',
};

const layout = loadTestLayoutSync();

const ir: IRv1 = {
	meta: makeIrMeta('test', {
		origin: 'typescript',
		sourcePath: 'wpk.config.ts',
	}),
	config: buildOptions.config,
	schemas: [],
	resources: [],
	capabilities: [],
	capabilityMap: {
		sourcePath: undefined,
		definitions: [],
		fallback: { capability: 'manage_options', appliesTo: 'resource' },
		missing: [],
		unused: [],
		warnings: [],
	},
	blocks: [],
	php: {
		namespace: 'Test',
		autoload: 'inc/',
		outputDir: layout.resolve('php.generated'),
	},
	layout,
};

const stubHelpers = [createPatcher(), createPhpDriverInstaller()];

describe('builder stubs', () => {
	it('executes stub builders without errors', async () => {
		const existsMock = jest
			.fn<
				ReturnType<Workspace['exists']>,
				Parameters<Workspace['exists']>
			>()
			.mockResolvedValue(true);
		await withBuilderWorkspace(
			async ({ workspace }) => {
				const reporter = buildReporter();
				const context = {
					workspace: workspace as unknown as Workspace,
					phase: 'generate' as const,
					reporter,
					generationState: buildEmptyGenerationState(),
				};
				const options = {
					...buildOptions,
					sourcePath: workspace.resolve('wpk.config.ts'),
				};

				for (const helper of stubHelpers) {
					const output =
						buildOutput<BuilderOutput['actions'][number]>();
					await helper.apply(
						{
							context,
							input: { phase: 'generate', options, ir },
							output,
							reporter,
						},
						undefined
					);
				}

				expect(reporter.debug).toHaveBeenCalled();
				expect(reporter.info).not.toHaveBeenCalled();
				expect(execFile).not.toHaveBeenCalled();
			},
			{
				createWorkspace: (root: string) =>
					makeWorkspaceMock({
						root,
						resolve: (...parts: string[]) =>
							path.join(root, ...parts),
						exists: existsMock,
					}),
			}
		);
	});
});
