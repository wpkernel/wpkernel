import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as phpDriver from '../php-driver';
import type {
	PipelineContext,
	BuilderInput,
	BuilderOutput,
} from '../programBuilder';
import { createPhpProgramWriterHelper } from '../programWriter';
import {
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '../builderChannel';
import { buildStmtNop } from '../nodes';
import type { PhpProgram } from '../nodes';
import { resetPhpAstChannel } from '../context';
import { createReporterMock } from '@wpkernel/test-utils/shared/reporter';

const { createPhpDriverInstaller } = phpDriver;

jest.setTimeout(120_000);

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_ROOT = path.resolve(
	PACKAGE_ROOT,
	'.test-artifacts',
	'program-writer'
);

function createBuilderInput(): BuilderInput {
	return {
		phase: 'generate',
		options: {
			config: {} as never,
			namespace: 'demo-plugin',
			origin: 'wpk.config.ts',
			sourcePath: 'wpk.config.ts',
		},
		ir: null,
	};
}

function createWorkspace(root: string): PipelineContext['workspace'] {
	return {
		root,
		resolve: (...parts: string[]) => path.resolve(root, ...parts),
		cwd: () => root,
		async write(file, contents, options = {}) {
			const target = path.isAbsolute(file)
				? file
				: path.resolve(root, file);
			const directory = path.dirname(target);

			if (options.ensureDir !== false) {
				await fs.mkdir(directory, { recursive: true });
			}

			await fs.writeFile(target, contents, {
				mode: options.mode,
			});
		},
		async exists(target) {
			const resolved = path.isAbsolute(target)
				? target
				: path.resolve(root, target);

			try {
				await fs.access(resolved);
				return true;
			} catch {
				return false;
			}
		},
	};
}

function createPipelineContext(): PipelineContext {
	const workspace = createWorkspace(PACKAGE_ROOT);
	return {
		workspace,
		phase: 'generate',
		reporter: createReporterMock(),
	};
}

function resetChannels(context: PipelineContext): void {
	resetPhpBuilderChannel(context);
	resetPhpAstChannel(context);
}

async function ensureCleanArtifacts(): Promise<void> {
	await fs.rm(OUTPUT_ROOT, { recursive: true, force: true });
}

describe('createPhpProgramWriterHelper', () => {
	beforeAll(async () => {
		await ensureCleanArtifacts();

		const reporter = createReporterMock();
		const installer = createPhpDriverInstaller();
		const workspace = createWorkspace(PACKAGE_ROOT);

		await installer.apply(
			{
				context: {
					workspace,
				},
				input: undefined as never,
				output: undefined as never,
				reporter,
			},
			undefined
		);
	});

	afterAll(async () => {
		await ensureCleanArtifacts();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('logs and exits early when no programs are queued', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		resetChannels(context);

		const helper = createPhpProgramWriterHelper();
		const next = jest.fn();

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			next
		);

		expect(context.reporter.debug).toHaveBeenCalledWith(
			'createPhpProgramWriterHelper: no programs queued.'
		);
		expect(next).toHaveBeenCalledTimes(1);
	});

	it('writes queued programs using the PHP driver', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const actions: BuilderOutput['actions'] = [];
		const output: BuilderOutput = {
			actions,
			queueWrite: jest.fn((action) => {
				actions.push(action);
			}),
		};

		resetChannels(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop(), buildStmtNop()];
		const filePath = path.join(OUTPUT_ROOT, 'Writer.php');
		channel.queue({
			file: filePath,
			metadata: { kind: 'capability-helper' },
			docblock: ['Doc line'],
			uses: ['Demo\\Contracts'],
			statements: ['class Example {};'],
			program,
		});

		const helper = createPhpProgramWriterHelper();
		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const emittedPhp = await fs.readFile(filePath, 'utf8');
		const emittedAst = await fs.readFile(`${filePath}.ast.json`, 'utf8');

		expect(emittedPhp).toContain('<?php');
		expect(JSON.parse(emittedAst)[0]).toMatchObject({
			nodeType: 'Stmt_Nop',
		});

		expect(output.queueWrite).toHaveBeenCalledWith({
			file: filePath,
			contents: emittedPhp,
		});
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: `${filePath}.ast.json`,
			contents: emittedAst,
		});

		expect(context.reporter.debug).toHaveBeenCalledWith(
			'createPhpProgramWriterHelper: emitted PHP artifact.',
			{ file: filePath }
		);
	});

	it('threads driver configuration overrides to the pretty printer', async () => {
		const buildSpy = jest.spyOn(phpDriver, 'buildPhpPrettyPrinter');

		const context = createPipelineContext();
		const input = createBuilderInput();
		const actions: BuilderOutput['actions'] = [];
		const output: BuilderOutput = {
			actions,
			queueWrite: jest.fn((action) => {
				actions.push(action);
			}),
		};

		resetChannels(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop()];
		const filePath = path.join(OUTPUT_ROOT, 'Override.php');
		channel.queue({
			file: filePath,
			metadata: { kind: 'capability-helper' },
			docblock: [],
			uses: [],
			statements: [],
			program,
		});

		const scriptPath = path.resolve(
			PACKAGE_ROOT,
			'php',
			'pretty-print.php'
		);
		const helper = createPhpProgramWriterHelper({
			driver: {
				binary: 'php',
				scriptPath,
				importMetaUrl: pathToFileURL(scriptPath).href,
				autoloadPaths: ['/custom/vendor/autoload.php'],
			},
		});

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		expect(buildSpy).toHaveBeenCalledWith({
			workspace: context.workspace,
			phpBinary: 'php',
			scriptPath,
			importMetaUrl: pathToFileURL(scriptPath).href,
			autoloadPaths: ['/custom/vendor/autoload.php'],
		});
	});

	it('serialises the queued program when the driver omits the AST payload', async () => {
		const prettyPrinter = {
			prettyPrint: jest.fn(async () => ({
				code: '<?php\n// generated fallback\n',
				ast: undefined,
			})),
		} satisfies ReturnType<typeof phpDriver.buildPhpPrettyPrinter>;

		jest.spyOn(phpDriver, 'buildPhpPrettyPrinter').mockReturnValue(
			prettyPrinter
		);

		const context = createPipelineContext();
		const input = createBuilderInput();
		const actions: BuilderOutput['actions'] = [];
		const output: BuilderOutput = {
			actions,
			queueWrite: jest.fn((action) => {
				actions.push(action);
			}),
		};

		resetChannels(context);

		const channel = getPhpBuilderChannel(context);
		const program = [buildStmtNop()];
		const filePath = path.join(OUTPUT_ROOT, 'Fallback.php');
		channel.queue({
			file: filePath,
			metadata: { kind: 'capability-helper' },
			docblock: ['Doc line'],
			uses: ['Demo\\Contracts'],
			statements: ['class Example {};'],
			program,
		});

		const helper = createPhpProgramWriterHelper();
		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		expect(prettyPrinter.prettyPrint).toHaveBeenCalledWith({
			filePath,
			program,
		});

		const emittedAst = await fs.readFile(`${filePath}.ast.json`, 'utf8');
		const expectedAst = `${JSON.stringify(program, null, 2)}\n`;

		expect(emittedAst).toBe(expectedAst);
	});

	it('writes codemod snapshots and diagnostics when codemod metadata is present', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const actions: BuilderOutput['actions'] = [];
		const output: BuilderOutput = {
			actions,
			queueWrite: jest.fn((action) => {
				actions.push(action);
			}),
		};

		resetChannels(context);

		const channel = getPhpBuilderChannel(context);
		const filePath = path.join(OUTPUT_ROOT, 'Codemod.php');

		const beforeProgram = [
			{
				nodeType: 'Stmt_Class',
				attributes: {},
				name: {
					nodeType: 'Identifier',
					attributes: {},
					name: 'BeforeClass',
				},
				flags: 0,
				extends: null,
				implements: [],
				stmts: [],
				attrGroups: [],
				namespacedName: null,
			},
		] as unknown as PhpProgram;

		const afterProgram = [
			{
				nodeType: 'Stmt_Class',
				attributes: {},
				name: {
					nodeType: 'Identifier',
					attributes: {},
					name: 'AfterClass',
				},
				flags: 0,
				extends: null,
				implements: [],
				stmts: [],
				attrGroups: [],
				namespacedName: null,
			},
		] as unknown as PhpProgram;

		channel.queue({
			file: filePath,
			metadata: { kind: 'capability-helper' },
			docblock: [],
			uses: [],
			statements: [],
			program: afterProgram,
			codemod: {
				before: beforeProgram,
				after: afterProgram,
				visitors: [
					{
						key: 'demo.visitor',
						stackKey: 'demo-stack',
						stackIndex: 0,
						visitorIndex: 0,
						class: 'Demo\\Visitor',
					},
				],
				diagnostics: {
					dumps: {
						before: 'Before dump contents',
						after: 'After dump contents',
					},
				},
			},
		});

		const helper = createPhpProgramWriterHelper();
		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const beforePath = `${filePath}.codemod.before.ast.json`;
		const afterPath = `${filePath}.codemod.after.ast.json`;
		const summaryPath = `${filePath}.codemod.summary.txt`;
		const beforeDumpPath = `${filePath}.codemod.before.dump.txt`;
		const afterDumpPath = `${filePath}.codemod.after.dump.txt`;

		const [beforeSnapshot, afterSnapshot, summary, beforeDump, afterDump] =
			await Promise.all([
				fs.readFile(beforePath, 'utf8'),
				fs.readFile(afterPath, 'utf8'),
				fs.readFile(summaryPath, 'utf8'),
				fs.readFile(beforeDumpPath, 'utf8'),
				fs.readFile(afterDumpPath, 'utf8'),
			]);

		expect(beforeSnapshot).toBe(
			`${JSON.stringify(beforeProgram, null, 2)}\n`
		);
		expect(afterSnapshot).toBe(
			`${JSON.stringify(afterProgram, null, 2)}\n`
		);

		expect(summary).toContain('demo.visitor');
		expect(summary).toContain('Before hash:');
		expect(summary).toContain('After hash:');
		expect(summary).toContain('Change detected: yes');
		expect(summary).toContain('$[0].name.name');

		expect(beforeDump).toBe('Before dump contents\n');
		expect(afterDump).toBe('After dump contents\n');

		expect(output.queueWrite).toHaveBeenCalledWith({
			file: beforePath,
			contents: `${JSON.stringify(beforeProgram, null, 2)}\n`,
		});
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: afterPath,
			contents: `${JSON.stringify(afterProgram, null, 2)}\n`,
		});
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: summaryPath,
			contents: summary,
		});
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: beforeDumpPath,
			contents: 'Before dump contents\n',
		});
		expect(output.queueWrite).toHaveBeenCalledWith({
			file: afterDumpPath,
			contents: 'After dump contents\n',
		});
	});
});
