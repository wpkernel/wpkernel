import path from 'node:path';
import { execFile } from 'node:child_process';
import { createPatcher } from '../patcher';
import { createPhpDriverInstaller } from '@wpkernel/php-json-ast';
import type { IRv1 } from '../../ir/publicTypes';
import type { BuilderOutput } from '../../runtime/types';
import type { Workspace } from '../../workspace/types';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	withWorkspace as withBuilderWorkspace,
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { makeIr } from '@cli-tests/ir.test-support';
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

const buildOptions = {
	namespace: 'test',
	origin: 'typescript',
	sourcePath: '/workspace/wpk.config.ts',
};

const ir: IRv1 = makeIr({
	namespace: 'test',
	meta: {
		origin: 'typescript',
		sourcePath: 'wpk.config.ts',
	},
	php: {
		namespace: 'Test',
		autoload: 'inc/',
	},
});

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
