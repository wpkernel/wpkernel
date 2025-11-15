import path from 'node:path';
import type { IRv1 } from '../../ir/publicTypes';
import {
	createPhpBuilder,
	createPhpChannelHelper,
	createPhpBaseControllerHelper,
	createPhpResourceControllerHelper,
	createPhpCapabilityHelper,
	createPhpPersistenceRegistryHelper,
	createPhpIndexFileHelper,
	getPhpBuilderChannel,
} from '../php';
import type { BuilderOutput } from '../../runtime/types';
import type { Workspace } from '../../workspace/types';
import * as phpDriverModule from '@wpkernel/php-json-ast/php-driver';
const { buildPhpPrettyPrinter } = phpDriverModule;
import { makeWorkspaceMock } from '../../../tests/workspace.test-support';
import { buildReporter } from '@wpkernel/test-utils/builders/tests/builder-harness.test-support';
import {
	createMinimalIr,
	createPipelineContext,
} from '../php/test-support/php-builder.test-support';

jest.mock('@wpkernel/php-json-ast/php-driver', () => {
	const actual = jest.requireActual<typeof phpDriverModule>(
		'@wpkernel/php-json-ast/php-driver'
	);

	return {
		__esModule: true,
		...actual,
		buildPhpPrettyPrinter: jest.fn(() => ({
			prettyPrint: jest.fn(async ({ program }) => ({
				code: '<?php\n// pretty printed base controller\n',
				ast: program,
			})),
		})),
	};
});

const buildPhpPrettyPrinterMock = buildPhpPrettyPrinter as jest.MockedFunction<
	typeof buildPhpPrettyPrinter
>;

function buildWorkspace(): Workspace {
	return makeWorkspaceMock({
		root: process.cwd(),
		cwd: jest.fn(() => process.cwd()),
		read: jest.fn(async () => null),
		readText: jest.fn(async () => null),
		write: jest.fn(async () => undefined),
		writeJson: jest.fn(async () => undefined),
		exists: jest.fn(async () => false),
		rm: jest.fn(async () => undefined),
		glob: jest.fn(async () => []),
		threeWayMerge: jest.fn(async () => 'clean'),
		begin: jest.fn(),
		commit: jest.fn(async () => ({ writes: [], deletes: [] })),
		rollback: jest.fn(async () => ({ writes: [], deletes: [] })),
		dryRun: async <T>(fn: () => Promise<T>) => ({
			result: await fn(),
			manifest: { writes: [], deletes: [] },
		}),
		tmpDir: jest.fn(async () => '.tmp'),
		resolve: jest.fn((...parts: string[]) =>
			path.join(process.cwd(), ...parts)
		),
	});
}

const ir = createMinimalIr({
	meta: {
		origin: 'wpk.config.ts',
		sourcePath: 'wpk.config.ts',
	},
});

function setupPrettyPrinterMock() {
	const prettyPrint = jest.fn(async ({ program }) => ({
		code: '<?php\n// pretty printed base controller\n',
		ast: program,
	}));
	buildPhpPrettyPrinterMock.mockReturnValueOnce({ prettyPrint });
	return prettyPrint;
}

describe('createPhpBuilder', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('queues helper programs in the channel before writing', async () => {
		const workspace = buildWorkspace();
		const reporter = buildReporter();
		const context = createPipelineContext({ workspace, reporter });
		const queueWrite = jest.fn();
		const output: BuilderOutput = {
			actions: [],
			queueWrite,
		};

		const helpers = [
			createPhpChannelHelper(),
			createPhpBaseControllerHelper(),
			createPhpResourceControllerHelper(),
			createPhpCapabilityHelper(),
			createPhpPersistenceRegistryHelper(),
			createPhpIndexFileHelper(),
		];

		const applyOptions = {
			context,
			input: {
				phase: 'generate' as const,
				options: {
					config: ir.config,
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			output,
			reporter,
		};

		for (const helper of helpers) {
			await helper.apply(applyOptions, undefined);
		}

		const channel = getPhpBuilderChannel(context);
		const pending = channel.pending();
		expect(pending).toHaveLength(4);

		const baseEntry = pending.find(
			(entry) => entry.metadata.kind === 'base-controller'
		);
		expect(baseEntry).toBeDefined();
		expect(baseEntry?.docblock).toEqual(
			expect.arrayContaining([
				expect.stringContaining('Source: wpk.config.ts → resources'),
			])
		);
		expect(baseEntry?.program[0]?.nodeType).toBe('Stmt_Declare');

		const capabilityEntry = pending.find(
			(entry) => entry.metadata.kind === 'capability-helper'
		);
		expect(capabilityEntry).toBeDefined();
		expect(capabilityEntry?.statements).toHaveLength(0);

		const namespaceNode = capabilityEntry?.program.find(
			(stmt) => stmt?.nodeType === 'Stmt_Namespace'
		) as { stmts?: unknown[] } | undefined;
		expect(namespaceNode).toBeDefined();

		const classNode = namespaceNode?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Class'
		) as { stmts?: unknown[]; name?: { name?: string } } | undefined;
		expect(classNode?.name?.name).toBe('Capability');

		const methodNames =
			classNode?.stmts
				?.filter((stmt: any) => stmt?.nodeType === 'Stmt_ClassMethod')
				.map((method: any) => method?.name?.name) ?? [];
		expect(methodNames).toEqual([
			'capability_map',
			'fallback',
			'callback',
			'enforce',
			'get_definition',
			'get_binding',
			'create_error',
		]);

		const enforceMethod = classNode?.stmts?.find(
			(stmt: any) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'enforce'
		) as { stmts?: any[] } | undefined;
		expect(enforceMethod?.stmts?.[0]?.nodeType).not.toBe('Stmt_Nop');

		const finalStatement =
			enforceMethod?.stmts?.[(enforceMethod?.stmts?.length ?? 1) - 1];
		expect(finalStatement?.nodeType).toBe('Stmt_Return');
		const finalExpr = (finalStatement as any)?.expr;
		expect(finalExpr?.nodeType).toBe('Expr_StaticCall');
		expect(finalExpr?.class?.parts).toEqual(['self']);
		expect(finalExpr?.name?.name).toBe('create_error');

		const hasObjectGuard = enforceMethod?.stmts?.some(
			(stmt: any) => stmt?.nodeType === 'Stmt_If'
		);
		expect(hasObjectGuard).toBe(true);

		const indexEntry = pending.find(
			(entry) => entry.metadata.kind === 'index-file'
		);
		expect(indexEntry?.program[1]?.nodeType).toBe('Stmt_Namespace');
	});

	it('reports capability map warnings when fallbacks are required', async () => {
		const workspace = buildWorkspace();
		const reporter = buildReporter();
		const context = createPipelineContext({ workspace, reporter });

		const helper = createPhpCapabilityHelper();
		const queueWrite = jest.fn();
		const output: BuilderOutput = {
			actions: [],
			queueWrite,
		};

		const localIr: IRv1 = {
			...ir,
			capabilityMap: {
				...ir.capabilityMap,
				warnings: [
					{
						code: 'capability-map.entries.missing',
						message:
							'Capabilities referenced by routes are missing.',
						context: { capabilities: ['manage_todo'] },
					},
				],
				missing: ['manage_todo'],
			},
		};

		await helper.apply(
			{
				context,
				input: {
					phase: 'generate',
					options: {
						config: localIr.config,
						namespace: localIr.meta.namespace,
						origin: localIr.meta.origin,
						sourcePath: localIr.meta.sourcePath,
					},
					ir: localIr,
				},
				output,
				reporter,
			},
			undefined
		);

		expect(reporter.warn).toHaveBeenCalledWith(
			'Capability helper warning emitted.',
			expect.objectContaining({
				code: 'capability-map.entries.missing',
				message: 'Capabilities referenced by routes are missing.',
				context: { capabilities: ['manage_todo'] },
			})
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Capability falling back to default capability.',
			expect.objectContaining({
				capability: 'manage_todo',
				capabilities: ['manage_demoplugin'],
				fallbackCapability: 'manage_demoplugin',
				scope: 'resource',
			})
		);
	});

	it('logs a debug message and skips non-generate phases', async () => {
		const builder = createPhpBuilder();
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const queueWrite = jest.fn();
		const output: BuilderOutput = {
			actions: [],
			queueWrite,
		};

		await builder.apply(
			{
				context: createPipelineContext({
					workspace,
					reporter,
					phase: 'init',
				}),
				input: {
					phase: 'init',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
						origin: ir.meta.origin,
						sourcePath: ir.meta.sourcePath,
					},
					ir,
				},
				output,
				reporter,
			},
			undefined
		);

		expect(reporter.debug).toHaveBeenCalledWith(
			'createPhpBuilder: skipping phase.',
			{ phase: 'init' }
		);
		expect(reporter.info).not.toHaveBeenCalled();
		expect(queueWrite).not.toHaveBeenCalled();
	});

	it('generates base controller artifacts from the AST channel', async () => {
		const builder = createPhpBuilder();
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const prettyPrint = setupPrettyPrinterMock();
		const queueWrite = jest.fn();
		const output: BuilderOutput = {
			actions: [],
			queueWrite,
		};

		await builder.apply(
			{
				context: createPipelineContext({ workspace, reporter }),
				input: {
					phase: 'generate',
					options: {
						config: ir.config,
						namespace: ir.meta.namespace,
						origin: ir.meta.origin,
						sourcePath: ir.meta.sourcePath,
					},
					ir,
				},
				output,
				reporter,
			},
			undefined
		);

		const baseControllerPath = workspace.resolve(
			ir.php.outputDir,
			'Rest',
			'BaseController.php'
		);

		expect(prettyPrint).toHaveBeenCalledTimes(5);
		const baseControllerCall = prettyPrint.mock.calls.find(
			([payload]) => payload.filePath === baseControllerPath
		);
		expect(baseControllerCall).toBeDefined();
		expect(baseControllerCall?.[0].program).toMatchSnapshot(
			'base-controller-ast'
		);

		const pluginLoaderPath = workspace.resolve('.', 'plugin.php');
		const pluginLoaderCall = prettyPrint.mock.calls.find(
			([payload]) => payload.filePath === pluginLoaderPath
		);
		expect(pluginLoaderCall).toBeDefined();

		expect(workspace.write).toHaveBeenCalledWith(
			baseControllerPath,
			expect.any(String),
			{
				ensureDir: true,
			}
		);
		const astPath = `${baseControllerPath}.ast.json`;
		expect(workspace.write).toHaveBeenCalledWith(
			astPath,
			expect.any(String),
			{
				ensureDir: true,
			}
		);

		expect(queueWrite).toHaveBeenCalledWith({
			file: baseControllerPath,
			contents: '<?php\n// pretty printed base controller\n',
		});
		expect(queueWrite).toHaveBeenCalledWith({
			file: astPath,
			contents: expect.stringMatching(/"Stmt_Class"/),
		});

		expect(reporter.info).toHaveBeenCalledWith(
			'createPhpBuilder: PHP artifacts generated.'
		);
	});
});
