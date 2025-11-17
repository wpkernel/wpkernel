import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import type {
	PipelineContext,
	BuilderInput,
	BuilderOutput,
} from '../../../runtime/types';
import { createWpProgramWriterHelper } from '../pipeline.writer';
import {
	buildStmtNop,
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '@wpkernel/php-json-ast';
import * as phpDriverModule from '@wpkernel/php-json-ast/php-driver';
const { buildPhpPrettyPrinter } = phpDriverModule;
import { resetPhpAstChannel } from '@wpkernel/wp-json-ast';
import { makeWorkspaceMock } from '../../../../tests/workspace.test-support';
import {
	createBuilderInput,
	createBuilderOutput,
	createPipelineContext,
} from '../test-support/php-builder.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { loadTestLayoutSync } from '../../../tests/layout.test-support';

jest.mock('@wpkernel/php-json-ast/php-driver', () => {
	const actual = jest.requireActual<typeof phpDriverModule>(
		'@wpkernel/php-json-ast/php-driver'
	);

	return {
		__esModule: true,
		...actual,
		buildPhpPrettyPrinter: jest.fn(() => ({
			prettyPrint: jest.fn(async ({ program }) => ({
				code: '<?php\n// generated\n',
				ast: program,
			})),
		})),
	};
});

const buildPhpPrettyPrinterMock = jest.mocked(buildPhpPrettyPrinter);

// Use the shared test layout manifest instead of hard-coded paths.
const TEST_LAYOUT = loadTestLayoutSync();
const PHP_GENERATED_ID = 'php.generated';

type MockWorkspace = ReturnType<typeof makeWorkspaceMock>;

function resolvePhpFile(workspace: MockWorkspace, fileName: string): string {
	const phpRoot = TEST_LAYOUT.resolve(PHP_GENERATED_ID);
	return workspace.resolve(phpRoot, fileName);
}

function buildReporter(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function buildPipelineContext(): PipelineContext {
	const workspace = makeWorkspaceMock({
		root: '/workspace',
		cwd: () => '/workspace',
		resolve: (...parts: string[]) => path.join('/workspace', ...parts),
		write: jest.fn(async () => undefined),
		writeJson: jest.fn(async () => undefined),
	});

	return createPipelineContext({
		workspace,
		reporter: buildReporter(),
		generationState: buildEmptyGenerationState(),
	});
}

function buildBuilderInput(): BuilderInput {
	return createBuilderInput();
}

describe('createWpProgramWriterHelper', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('writes queued programs using the pretty printer', async () => {
		const workspace = makeWorkspaceMock({
			root: '/workspace',
			cwd: () => '/workspace',
			resolve: (...parts: string[]) => path.join('/workspace', ...parts),
			write: jest.fn(async () => undefined),
			writeJson: jest.fn(async () => undefined),
		}) as MockWorkspace;

		const reporter = buildReporter();
		const context = createPipelineContext({ workspace, reporter });
		const input = createBuilderInput();
		const output = createBuilderOutput();

		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop(), buildStmtNop()];

		const phpFile = resolvePhpFile(workspace, 'Writer.php');
		const phpAstFile = `${phpFile}.ast.json`;

		channel.queue({
			file: phpFile,
			metadata: { kind: 'capability-helper' },
			docblock: ['Doc line'],
			uses: ['Demo\\Contracts'],
			statements: ['class Example {};'],
			program,
		});

		const helper = createWpProgramWriterHelper();
		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const firstCall = buildPhpPrettyPrinterMock.mock.results[0];
		if (!firstCall || !firstCall.value) {
			throw new Error('Expected pretty printer to be constructed.');
		}
		const prettyPrinter = firstCall.value;
		expect(prettyPrinter.prettyPrint).toHaveBeenCalledWith({
			filePath: phpFile,
			program,
		});

		expect(context.workspace.write).toHaveBeenCalledWith(
			phpFile,
			'<?php\n// generated\n',
			{ ensureDir: true }
		);
		expect(context.workspace.write).toHaveBeenCalledWith(
			phpAstFile,
			expect.stringContaining('Stmt_Nop'),
			{ ensureDir: true }
		);

		expect(output.queueWrite).toHaveBeenCalledWith({
			file: phpFile,
			contents: '<?php\n// generated\n',
		});
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: phpAstFile,
			contents: expect.stringContaining('Stmt_Nop'),
		});

		expect(context.reporter.debug).toHaveBeenCalledWith(
			'createPhpProgramWriterHelper: emitted PHP artifact.',
			{ file: phpFile }
		);
	});

	it('threads driver configuration overrides to the pretty printer', async () => {
		const workspace = makeWorkspaceMock({
			root: '/workspace',
			cwd: () => '/workspace',
			resolve: (...parts: string[]) => path.join('/workspace', ...parts),
			write: jest.fn(async () => undefined),
			writeJson: jest.fn(async () => undefined),
		}) as MockWorkspace;

		const reporter = buildReporter();
		const context = createPipelineContext({ workspace, reporter });
		const input = createBuilderInput();
		const output = createBuilderOutput();

		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop()];

		const phpFile = resolvePhpFile(workspace, 'Override.php');

		channel.queue({
			file: phpFile,
			metadata: { kind: 'capability-helper' },
			docblock: [],
			uses: [],
			statements: [],
			program,
		});

		const helper = (
			createWpProgramWriterHelper as (
				options?: unknown
			) => ReturnType<typeof createWpProgramWriterHelper>
		)({
			driver: {
				binary: '/usr/bin/php82',
				scriptPath: '/custom/pretty-print.php',
				importMetaUrl: 'file:///custom/pkg/dist/index.js',
			},
		});
		await helper.apply({
			context,
			input,
			output,
			reporter: context.reporter,
		});

		expect(buildPhpPrettyPrinterMock).toHaveBeenCalledWith({
			workspace: context.workspace,
			phpBinary: '/usr/bin/php82',
			scriptPath: '/custom/pretty-print.php',
			importMetaUrl: 'file:///custom/pkg/dist/index.js',
		});
	});

	it('serialises the queued program when the driver omits the AST payload', async () => {
		const context = buildPipelineContext();
		const input = buildBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop()];
		const expectedSerialisedAst = `${JSON.stringify(program, null, 2)}\n`;

		const phpFile = resolvePhpFile(
			context.workspace as MockWorkspace,
			'Fallback.php'
		);
		const phpAstFile = `${phpFile}.ast.json`;

		channel.queue({
			file: phpFile,
			metadata: { kind: 'capability-helper' },
			docblock: ['Doc line'],
			uses: ['Demo\\Contracts'],
			statements: ['class Example {};'],
			program,
		});

		const prettyPrint = jest.fn(async () => ({
			code: '<?php\n// generated fallback\n',
			ast: undefined,
		}));

		buildPhpPrettyPrinterMock.mockImplementationOnce(
			() =>
				({ prettyPrint }) as unknown as ReturnType<
					typeof buildPhpPrettyPrinter
				>
		);

		const helper = createWpProgramWriterHelper();
		await helper.apply({
			context,
			input,
			output,
			reporter: context.reporter,
		});

		expect(prettyPrint).toHaveBeenCalledWith({
			filePath: phpFile,
			program,
		});

		expect(context.workspace.write).toHaveBeenCalledWith(
			phpAstFile,
			expectedSerialisedAst,
			{ ensureDir: true }
		);
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: phpAstFile,
			contents: expectedSerialisedAst,
		});

		expect(context.reporter.debug).toHaveBeenCalledWith(
			'createPhpProgramWriterHelper: emitted PHP artifact.',
			{ file: phpFile }
		);
	});

	it('logs when no programs are queued and awaits the next helper', async () => {
		const context = buildPipelineContext();
		const input = buildBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createWpProgramWriterHelper();
		const next = jest.fn(async () => undefined);

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			next
		);

		expect(buildPhpPrettyPrinterMock).not.toHaveBeenCalled();
		expect(output.queueWrite).not.toHaveBeenCalled();
		expect(context.reporter.debug).toHaveBeenCalledWith(
			'createPhpProgramWriterHelper: no programs queued.'
		);
		expect(next).toHaveBeenCalledTimes(1);
	});
});
