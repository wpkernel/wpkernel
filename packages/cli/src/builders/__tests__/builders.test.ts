import path from 'node:path';
import { execFile } from 'node:child_process';
import { createTsBuilder } from '../ts';
import { createPatcher } from '../patcher';
import { createPhpDriverInstaller } from '@wpkernel/php-json-ast';
import type { BuildIrOptions, IRv1 } from '../../ir/publicTypes';
import type { BuilderOutput } from '../../runtime/types';
import type { Workspace } from '../../workspace/types';
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@wpkernel/test-utils/builders/tests/builder-harness.test-support';

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

const ir: IRv1 = {
	meta: {
		version: 1,
		namespace: 'test',
		origin: 'typescript',
		sourcePath: 'wpk.config.ts',
		sanitizedNamespace: 'test',
	},
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
		outputDir: '.generated/php',
	},
};

const existsMock = jest
	.fn<ReturnType<Workspace['exists']>, Parameters<Workspace['exists']>>()
	.mockResolvedValue(true);

const workspace = makeWorkspaceMock({
	root: process.cwd(),
	resolve: (...parts: string[]) => path.join(process.cwd(), ...parts),
	exists: existsMock,
});

const stubHelpers = [
	createTsBuilder(),
	createPatcher(),
	createPhpDriverInstaller(),
];

describe('builder stubs', () => {
	const reporter = buildReporter();

	const context = {
		workspace,
		phase: 'generate' as const,
		reporter,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		existsMock.mockResolvedValue(true);
	});

	it('executes stub builders without errors', async () => {
		for (const helper of stubHelpers) {
			const output = buildOutput<BuilderOutput['actions'][number]>();
			await helper.apply(
				{
					context,
					input: { phase: 'generate', options: buildOptions, ir },
					output,
					reporter,
				},
				undefined
			);
		}

		expect(reporter.debug).toHaveBeenCalledTimes(stubHelpers.length);
		expect(reporter.info).not.toHaveBeenCalled();
		expect(execFile).not.toHaveBeenCalled();
	});
});
