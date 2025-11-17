import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Reporter } from '@wpkernel/core/reporter';
import { createPhpBuilder } from '../pipeline.builder';
import type { BuilderOutput } from '../../../runtime/types';
import { buildWorkspace } from '../../../workspace';
import { withWorkspace } from '@wpkernel/test-utils/integration';
import { makePhpIrFixture } from '@wpkernel/test-utils/builders/php/resources.test-support';
import { resolveBundledComposerAutoloadPath } from '../../../utils/phpAssets';
import * as phpPrinter from '@wpkernel/php-json-ast/php-driver';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { loadTestLayout } from '../../../tests/layout.test-support';
import {
	createBaselineCodemodConfiguration,
	serialisePhpCodemodConfiguration,
	consumePhpProgramIngestion,
	runPhpCodemodIngestion,
} from '@wpkernel/php-json-ast';

jest.mock('@wpkernel/php-json-ast', () => {
	const actual = jest.requireActual('@wpkernel/php-json-ast');
	return {
		__esModule: true,
		...actual,
		consumePhpProgramIngestion: jest.fn(async () => ({
			exitCode: 0,
			stdout: '',
			stderr: '',
		})),
		runPhpCodemodIngestion: jest.fn(async () => ({
			exitCode: 0,
			lines: [],
			stdout: '',
			stderr: '',
		})),
	};
});

const consumeCodemodsMock = consumePhpProgramIngestion as jest.MockedFunction<
	typeof consumePhpProgramIngestion
>;
const runCodemodIngestionMock = runPhpCodemodIngestion as jest.MockedFunction<
	typeof runPhpCodemodIngestion
>;
function normalisePhpValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(normalisePhpValue);
	}

	if (value && typeof value === 'object') {
		const node = value as Record<string, unknown>;
		const next: Record<string, unknown> = {};

		for (const [key, entry] of Object.entries(node)) {
			next[key] = normalisePhpValue(entry);
		}

		if (node.nodeType === 'Name' && Array.isArray(node.parts)) {
			const parts = node.parts as unknown[];
			const resolved = parts
				.map((part) => {
					if (typeof part === 'string') {
						return part;
					}

					if (part && typeof part === 'object') {
						const candidate = part as { name?: string };
						if (typeof candidate.name === 'string') {
							return candidate.name;
						}
					}

					return String(part ?? '');
				})
				.join('\\');

			next.name = resolved;
		}

		if (node.nodeType === 'Param' && !('hooks' in next)) {
			next.hooks = [];
		}

		return next;
	}

	return value;
}

function createReporterStub(): Reporter {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

const PHP_JSON_AST_VENDOR_AUTOLOAD = resolveBundledComposerAutoloadPath();
const INTEGRATION_TIMEOUT_MS = 20000;

async function withPhpAutoload<T>(run: () => Promise<T>): Promise<T> {
	const previous = process.env.WPK_PHP_AUTOLOAD;
	if (PHP_JSON_AST_VENDOR_AUTOLOAD) {
		process.env.WPK_PHP_AUTOLOAD = PHP_JSON_AST_VENDOR_AUTOLOAD;
	}

	try {
		return await run();
	} finally {
		if (typeof previous === 'undefined') {
			delete process.env.WPK_PHP_AUTOLOAD;
		} else {
			process.env.WPK_PHP_AUTOLOAD = previous;
		}
	}
}

describe('createPhpBuilder integration', () => {
	it(
		'emits PHP + AST artefacts via the PHP driver without touching legacy printers',
		async () => {
			const ir = makePhpIrFixture();
			const builder = createPhpBuilder();
			const reporter = createReporterStub();
			const queuedWrites: BuilderOutput['actions'] = [];
			const output: BuilderOutput = {
				actions: queuedWrites,
				queueWrite(action) {
					queuedWrites.push(action);
				},
			};

			const artefacts = new Map<string, string>();
			let workspaceRoot: string | null = null;

			const prettyPrinterSpy = jest
				.spyOn(phpPrinter, 'buildPhpPrettyPrinter')
				.mockImplementation((options) => {
					const scriptPath =
						options.scriptPath ??
						phpPrinter.resolvePrettyPrintScriptPath();
					const phpBinary = options.phpBinary ?? 'php';

					return {
						async prettyPrint(payload) {
							const normalisedProgram = normalisePhpValue(
								payload.program
							);
							const input = JSON.stringify({
								file: payload.filePath,
								ast: normalisedProgram,
							});
							const result = spawnSync(
								phpBinary,
								[
									'-d',
									'memory_limit=1024M',
									'-d',
									'error_reporting=E_ALL & ~E_DEPRECATED',
									scriptPath,
									options.workspace.root,
									payload.filePath,
								],
								{
									input,
									encoding: 'utf8',
								}
							);

							if (result.error) {
								throw result.error;
							}

							if (result.status !== 0) {
								throw new Error(
									`PHP pretty print failed (${result.status}): ${
										result.stderr || result.stdout
									}`
								);
							}

							try {
								const stdout = result.stdout.trim();
								const jsonStart = stdout.indexOf('{');
								const parsedPayload =
									jsonStart === -1
										? stdout
										: stdout.slice(jsonStart);
								return JSON.parse(
									parsedPayload
								) as phpPrinter.PhpPrettyPrintResult;
							} catch (_error) {
								throw new Error(
									`Failed to parse pretty print output: ${result.stdout}`
								);
							}
						},
					} satisfies phpPrinter.PhpPrettyPrinter;
				});

			try {
				await withWorkspace(async (workspacePath) => {
					await withPhpAutoload(async () => {
						const workspace = buildWorkspace(workspacePath);
						workspaceRoot = workspace.root;
						const layout = await loadTestLayout({
							cwd: workspace.root,
						});
						const phpRoot = layout.resolve('php.generated');
						ir.php.outputDir = phpRoot;

						const toRelative = (absolute: string): string => {
							if (!workspaceRoot) {
								throw new Error(
									'Workspace root not initialised.'
								);
							}

							const relative = path
								.relative(workspaceRoot, absolute)
								.split(path.sep)
								.join('/');
							return relative === '' ? '.' : relative;
						};

						const captureArtefact = async (
							...segments: string[]
						): Promise<void> => {
							const phpPath = workspace.resolve(...segments);
							const phpContents = await fs.readFile(
								phpPath,
								'utf8'
							);
							artefacts.set(toRelative(phpPath), phpContents);

							const astPath = `${phpPath}.ast.json`;
							const astContents = await fs.readFile(
								astPath,
								'utf8'
							);
							artefacts.set(toRelative(astPath), astContents);
						};

						await builder.apply(
							{
								context: {
									workspace,
									reporter,
									phase: 'generate',
									generationState:
										buildEmptyGenerationState(),
								},
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

						await captureArtefact(
							phpRoot,
							'Rest',
							'BaseController.php'
						);
						await captureArtefact(
							phpRoot,
							'Rest',
							'BooksController.php'
						);
						await captureArtefact(
							phpRoot,
							'Rest',
							'JobCategoriesController.php'
						);
						await captureArtefact(
							phpRoot,
							'Rest',
							'JobCacheController.php'
						);
						await captureArtefact(
							phpRoot,
							'Rest',
							'DemoOptionController.php'
						);
						await captureArtefact(
							phpRoot,
							'Capability',
							'Capability.php'
						);
						await captureArtefact(
							phpRoot,
							'Registration',
							'PersistenceRegistry.php'
						);
						await captureArtefact(phpRoot, 'index.php');
						await captureArtefact(phpRoot, 'plugin.php');
					});
				});
			} finally {
				prettyPrinterSpy.mockRestore();
			}

			if (!workspaceRoot) {
				throw new Error('Expected workspace root to be captured.');
			}

			const normalise = (absolutePath: string): string =>
				path
					.relative(workspaceRoot!, absolutePath)
					.split(path.sep)
					.join('/');

			const expectedFiles = [
				path.posix.join(ir.php.outputDir, 'Capability/Capability.php'),
				path.posix.join(
					ir.php.outputDir,
					'Capability/Capability.php.ast.json'
				),
				path.posix.join(
					ir.php.outputDir,
					'Registration/PersistenceRegistry.php'
				),
				path.posix.join(
					ir.php.outputDir,
					'Registration/PersistenceRegistry.php.ast.json'
				),
				path.posix.join(ir.php.outputDir, 'Rest/BaseController.php'),
				path.posix.join(
					ir.php.outputDir,
					'Rest/BaseController.php.ast.json'
				),
				path.posix.join(ir.php.outputDir, 'Rest/BooksController.php'),
				path.posix.join(
					ir.php.outputDir,
					'Rest/BooksController.php.ast.json'
				),
				path.posix.join(
					ir.php.outputDir,
					'Rest/JobCategoriesController.php'
				),
				path.posix.join(
					ir.php.outputDir,
					'Rest/JobCategoriesController.php.ast.json'
				),
				path.posix.join(
					ir.php.outputDir,
					'Rest/JobCacheController.php'
				),
				path.posix.join(
					ir.php.outputDir,
					'Rest/JobCacheController.php.ast.json'
				),
				path.posix.join(
					ir.php.outputDir,
					'Rest/DemoOptionController.php'
				),
				path.posix.join(
					ir.php.outputDir,
					'Rest/DemoOptionController.php.ast.json'
				),
				path.posix.join(ir.php.outputDir, 'index.php'),
				path.posix.join(ir.php.outputDir, 'index.php.ast.json'),
				path.posix.join(ir.php.outputDir, 'plugin.php'),
				path.posix.join(ir.php.outputDir, 'plugin.php.ast.json'),
			].sort();

			const actualFiles = Array.from(artefacts.keys()).sort();
			expect(actualFiles).toEqual(expectedFiles);

			const queuedRelativeFiles = queuedWrites
				.map((action) => normalise(action.file))
				.sort();
			expect(queuedRelativeFiles).toEqual(expectedFiles);

			for (const action of queuedWrites) {
				const relative = normalise(action.file);
				const contents = artefacts.get(relative);
				expect(contents).toBeDefined();
				expect(action.contents).toBe(contents);
			}

			expect(reporter.info).toHaveBeenCalledWith(
				'createPhpBuilder: PHP artifacts generated.'
			);

			const baseControllerPhp = artefacts.get(
				path.posix.join(ir.php.outputDir, 'Rest/BaseController.php')
			);
			expect(baseControllerPhp).toBeDefined();
			expect(baseControllerPhp).toMatchSnapshot('base-controller.php');

			const booksControllerPhp = artefacts.get(
				path.posix.join(ir.php.outputDir, 'Rest/BooksController.php')
			);
			expect(booksControllerPhp).toBeDefined();
			expect(booksControllerPhp).toMatchSnapshot('books-controller.php');

			const demoOptionControllerPhp = artefacts.get(
				path.posix.join(
					ir.php.outputDir,
					'Rest/DemoOptionController.php'
				)
			);
			expect(demoOptionControllerPhp).toBeDefined();
			expect(demoOptionControllerPhp).toMatchSnapshot(
				'demo-option-controller.php'
			);

			const jobCacheControllerPhp = artefacts.get(
				path.posix.join(ir.php.outputDir, 'Rest/JobCacheController.php')
			);
			expect(jobCacheControllerPhp).toBeDefined();
			expect(jobCacheControllerPhp).toMatchSnapshot(
				'job-cache-controller.php'
			);

			const capabilityHelperPhp = artefacts.get(
				path.posix.join(ir.php.outputDir, 'Capability/Capability.php')
			);
			expect(capabilityHelperPhp).toBeDefined();
			expect(capabilityHelperPhp).toMatchSnapshot(
				'capability-helper.php'
			);

			const baseControllerAst = artefacts.get(
				path.posix.join(
					ir.php.outputDir,
					'Rest/BaseController.php.ast.json'
				)
			);
			expect(baseControllerAst).toBeDefined();
			const parsedAst = JSON.parse(baseControllerAst as string);
			expect(Array.isArray(parsedAst)).toBe(true);
			const topLevelNodeTypes = parsedAst.map(
				(node: { readonly nodeType?: string }) => node.nodeType
			);
			expect(topLevelNodeTypes).toEqual([
				'Stmt_Declare',
				'Stmt_Namespace',
			]);
		},
		INTEGRATION_TIMEOUT_MS
	);

	it(
		'ingests codemod targets declared via the PHP adapter configuration',
		async () => {
			const ir = makePhpIrFixture();
			ir.config.adapters = {
				php() {
					return {
						codemods: {
							files: ['plugin.php'],
							configurationPath: 'codemods/baseline.json',
						},
					};
				},
			};

			const builder = createPhpBuilder();
			const reporter = createReporterStub();
			const queuedWrites: BuilderOutput['actions'] = [];
			const output: BuilderOutput = {
				actions: queuedWrites,
				queueWrite(action) {
					queuedWrites.push(action);
				},
			};

			const prettyPrinterMock = jest
				.spyOn(phpPrinter, 'buildPhpPrettyPrinter')
				.mockReturnValue({
					prettyPrint: jest.fn(async ({ program }) => ({
						code: '<?php\n// codemodbed\n',
						ast: program,
					})),
				} as unknown as phpPrinter.PhpPrettyPrinter);

			try {
				await withWorkspace(async (workspacePath) =>
					withPhpAutoload(async () => {
						const workspace = buildWorkspace(workspacePath);

						const rootDir = path.resolve(
							__dirname,
							'../../../../../..'
						);
						const beforeFixture = path.join(
							rootDir,
							'packages',
							'php-json-ast',
							'fixtures',
							'codemods',
							'BaselinePack.before.php'
						);

						const configuration =
							createBaselineCodemodConfiguration();
						const configurationPath = workspace.resolve(
							'codemods',
							'baseline.json'
						);
						await fs.mkdir(path.dirname(configurationPath), {
							recursive: true,
						});
						await fs.writeFile(
							configurationPath,
							serialisePhpCodemodConfiguration(configuration)
						);

						await fs.copyFile(
							beforeFixture,
							workspace.resolve('plugin.php')
						);

						await builder.apply(
							{
								context: {
									workspace,
									reporter,
									phase: 'generate',
									generationState:
										buildEmptyGenerationState(),
								},
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

						expect(runCodemodIngestionMock).toHaveBeenCalledWith(
							expect.objectContaining({
								files: [workspace.resolve('plugin.php')],
								configurationPath,
							})
						);
						expect(consumeCodemodsMock).toHaveBeenCalled();
					})
				);
			} finally {
				prettyPrinterMock.mockRestore();
			}
		},
		INTEGRATION_TIMEOUT_MS
	);
});
