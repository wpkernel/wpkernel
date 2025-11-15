import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Reporter } from '@wpkernel/core/reporter';
import { createPhpBuilder } from '../pipeline.builder';
import type { BuilderOutput } from '../../../runtime/types';
import { buildWorkspace } from '../../../workspace';
import { withWorkspace } from '@wpkernel/test-utils/integration';
import { makePhpIrFixture } from '@wpkernel/test-utils/builders/php/resources.test-support';
import * as phpPrinter from '@wpkernel/php-json-ast/php-driver';
import {
	createBaselineCodemodConfiguration,
	serialisePhpCodemodConfiguration,
} from '@wpkernel/php-json-ast';
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

const CLI_VENDOR_ROOT = path.resolve(__dirname, '../../../../vendor');
const INTEGRATION_TIMEOUT_MS = 20000;

type ComposerSetupModule = (() => Promise<void>) & {
	ensureCliVendorDependencies?: () => Promise<void>;
};

type ComposerSetupNamespace = {
	default?: ComposerSetupModule;
	ensureCliVendorDependencies?: () => Promise<void>;
};

const CLI_VENDOR_SETUP_MODULE: string =
	'../../../../tests/jest-global-setup.cjs';

async function ensureCliVendorReady(): Promise<void> {
	const module = (await import(
		CLI_VENDOR_SETUP_MODULE
	)) as ComposerSetupNamespace;
	const ensureDependencies =
		module.ensureCliVendorDependencies ??
		module.default?.ensureCliVendorDependencies ??
		module.default;
	if (typeof ensureDependencies !== 'function') {
		throw new Error('Unable to load CLI vendor dependency installer.');
	}

	await ensureDependencies();
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
					const workspace = buildWorkspace(workspacePath);
					workspaceRoot = workspace.root;
					await ensureCliVendorReady();
					await fs.cp(CLI_VENDOR_ROOT, workspace.resolve('vendor'), {
						recursive: true,
					});
					await fs.access(
						workspace.resolve('vendor', 'autoload.php')
					);
					await fs.access(
						workspace.resolve(
							'vendor',
							'nikic',
							'php-parser',
							'lib',
							'PhpParser',
							'JsonDecoder.php'
						)
					);
					const toRelative = (absolute: string): string => {
						if (!workspaceRoot) {
							throw new Error('Workspace root not initialised.');
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
						const phpContents = await fs.readFile(phpPath, 'utf8');
						artefacts.set(toRelative(phpPath), phpContents);

						const astPath = `${phpPath}.ast.json`;
						const astContents = await fs.readFile(astPath, 'utf8');
						artefacts.set(toRelative(astPath), astContents);
					};

					await builder.apply(
						{
							context: {
								workspace,
								reporter,
								phase: 'generate',
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
						ir.php.outputDir,
						'Rest',
						'BaseController.php'
					);
					await captureArtefact(
						ir.php.outputDir,
						'Rest',
						'BooksController.php'
					);
					await captureArtefact(
						ir.php.outputDir,
						'Rest',
						'JobCategoriesController.php'
					);
					await captureArtefact(
						ir.php.outputDir,
						'Rest',
						'JobCacheController.php'
					);
					await captureArtefact(
						ir.php.outputDir,
						'Rest',
						'DemoOptionController.php'
					);
					await captureArtefact(
						ir.php.outputDir,
						'Capability',
						'Capability.php'
					);
					await captureArtefact(
						ir.php.outputDir,
						'Registration',
						'PersistenceRegistry.php'
					);
					await captureArtefact(ir.php.outputDir, 'index.php');
					await captureArtefact('plugin.php');
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
				'.generated/php/Capability/Capability.php',
				'.generated/php/Capability/Capability.php.ast.json',
				'.generated/php/Registration/PersistenceRegistry.php',
				'.generated/php/Registration/PersistenceRegistry.php.ast.json',
				'.generated/php/Rest/BaseController.php',
				'.generated/php/Rest/BaseController.php.ast.json',
				'.generated/php/Rest/BooksController.php',
				'.generated/php/Rest/BooksController.php.ast.json',
				'.generated/php/Rest/JobCategoriesController.php',
				'.generated/php/Rest/JobCategoriesController.php.ast.json',
				'.generated/php/Rest/JobCacheController.php',
				'.generated/php/Rest/JobCacheController.php.ast.json',
				'.generated/php/Rest/DemoOptionController.php',
				'.generated/php/Rest/DemoOptionController.php.ast.json',
				'.generated/php/index.php',
				'.generated/php/index.php.ast.json',
				'plugin.php',
				'plugin.php.ast.json',
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
				'.generated/php/Rest/BaseController.php'
			);
			expect(baseControllerPhp).toBeDefined();
			expect(baseControllerPhp).toMatchSnapshot('base-controller.php');

			const booksControllerPhp = artefacts.get(
				'.generated/php/Rest/BooksController.php'
			);
			expect(booksControllerPhp).toBeDefined();
			expect(booksControllerPhp).toMatchSnapshot('books-controller.php');

			const demoOptionControllerPhp = artefacts.get(
				'.generated/php/Rest/DemoOptionController.php'
			);
			expect(demoOptionControllerPhp).toBeDefined();
			expect(demoOptionControllerPhp).toMatchSnapshot(
				'demo-option-controller.php'
			);

			const jobCacheControllerPhp = artefacts.get(
				'.generated/php/Rest/JobCacheController.php'
			);
			expect(jobCacheControllerPhp).toBeDefined();
			expect(jobCacheControllerPhp).toMatchSnapshot(
				'job-cache-controller.php'
			);

			const capabilityHelperPhp = artefacts.get(
				'.generated/php/Capability/Capability.php'
			);
			expect(capabilityHelperPhp).toBeDefined();
			expect(capabilityHelperPhp).toMatchSnapshot(
				'capability-helper.php'
			);

			const baseControllerAst = artefacts.get(
				'.generated/php/Rest/BaseController.php.ast.json'
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

			await withWorkspace(async (workspacePath) => {
				const workspace = buildWorkspace(workspacePath);
				await ensureCliVendorReady();
				await fs.cp(CLI_VENDOR_ROOT, workspace.resolve('vendor'), {
					recursive: true,
				});

				const rootDir = path.resolve(__dirname, '../../../../../..');
				const beforeFixture = path.join(
					rootDir,
					'packages',
					'php-json-ast',
					'fixtures',
					'codemods',
					'BaselinePack.before.php'
				);
				const afterFixture = path.join(
					rootDir,
					'packages',
					'php-json-ast',
					'fixtures',
					'codemods',
					'BaselinePack.after.php'
				);

				const configuration = createBaselineCodemodConfiguration();
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

				const generated = await fs.readFile(
					workspace.resolve('plugin.php'),
					'utf8'
				);
				const expected = await fs.readFile(afterFixture, 'utf8');
				expect(generated).toBe(expected);

				const codemodSummary = await fs.readFile(
					workspace.resolve('plugin.php.codemod.summary.txt'),
					'utf8'
				);
				expect(codemodSummary).toContain('baseline');

				const beforeAst = await fs.readFile(
					workspace.resolve('plugin.php.codemod.before.ast.json'),
					'utf8'
				);
				const afterAst = await fs.readFile(
					workspace.resolve('plugin.php.codemod.after.ast.json'),
					'utf8'
				);
				expect(beforeAst.trim()).not.toHaveLength(0);
				expect(afterAst.trim()).not.toHaveLength(0);
			});
		},
		INTEGRATION_TIMEOUT_MS
	);
});
