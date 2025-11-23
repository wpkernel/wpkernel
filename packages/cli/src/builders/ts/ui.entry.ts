/* eslint-disable @wpkernel/no-hardcoded-namespace-strings */
import path from 'node:path';
import { createHelper } from '../../runtime';
import type { BuilderHelper } from '../../runtime/types';
import {
	buildEmitter,
	collectResourceDescriptors,
	requireIr,
} from './pipeline.builder';
import { buildModuleSpecifier, writeAdminRuntimeStub } from './shared.imports';
import {
	resolveAdminScreenComponentMetadata,
	toLowerCamelIdentifier,
} from './pipeline.creator.adminScreen';
import { resolveTsLayout } from './ts.paths';
import { loadTsMorph } from './runtime.loader';

const DEFAULT_RUNTIME_SYMBOL = 'adminScreenRuntime';

function pickFirstString(values: readonly (string | undefined)[]): string {
	for (const value of values) {
		if (typeof value === 'string' && value.trim().length > 0) {
			return value.trim();
		}
	}
	return '';
}

export function createUiEntryBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.ts.ui-entry',
		kind: 'builder',
		async apply({ context, input, output, reporter }) {
			if (input.phase !== 'generate') {
				reporter.debug('createUiEntryBuilder: skipping phase.', {
					phase: input.phase,
				});
				return;
			}

			const ir = requireIr(input.ir);
			const paths = resolveTsLayout(ir);
			const descriptors = collectResourceDescriptors(
				input.options.config.resources
			);
			const hasUi = descriptors.length > 0;
			const { uiGenerated, blocksGenerated, blocksApplied, uiApplied } =
				paths;
			const entryPath = path.posix.join(uiGenerated, 'index.tsx');
			const appliedEntryPath = path.posix.join(uiApplied, 'index.tsx');
			const entryModulePath = appliedEntryPath;

			if (!hasUi) {
				if (await context.workspace.exists(entryPath)) {
					await context.workspace.rm(entryPath);
					reporter.debug(
						'createUiEntryBuilder: removed UI entry (no admin screens).'
					);
				}
				return;
			}

			const {
				Project,
				VariableDeclarationKind,
				IndentationText,
				QuoteKind,
				NewLineKind,
			} = await loadTsMorph();
			const project = new Project({
				useInMemoryFileSystem: true,
				manipulationSettings: {
					indentationText: IndentationText.TwoSpaces,
					quoteKind: QuoteKind.Single,
					newLineKind: NewLineKind.LineFeed,
				},
			});
			const sourceFile = project.createSourceFile(entryPath, '', {
				overwrite: true,
			});
			const emittedFiles: string[] = [];
			const emit = buildEmitter(context.workspace, output, emittedFiles);
			await writeAdminRuntimeStub(
				context.workspace,
				path.posix.join(uiGenerated, 'runtime.ts')
			);
			const runtimeImportConfigured = pickFirstString(
				descriptors.map(
					(descriptor) => descriptor.dataviews.screen?.wpkernelImport
				)
			);
			const runtimeImport =
				runtimeImportConfigured ||
				buildModuleSpecifier({
					workspace: context.workspace,
					from: appliedEntryPath,
					target: path.posix.join(uiApplied, 'runtime.ts'),
				});
			const runtimeSymbol =
				pickFirstString(
					descriptors.map(
						(descriptor) =>
							descriptor.dataviews.screen?.wpkernelSymbol
					)
				) || DEFAULT_RUNTIME_SYMBOL;
			const configImport = buildModuleSpecifier({
				workspace: context.workspace,
				from: entryModulePath,
				target: input.options.sourcePath,
			});

			const autoRegisterPath = path.posix.join(
				blocksGenerated,
				'auto-register.ts'
			);
			const autoRegisterAppliedPath = path.posix.join(
				blocksApplied,
				'auto-register.ts'
			);
			const shouldImportBlocks =
				await context.workspace.exists(autoRegisterPath);
			const autoRegisterImport = shouldImportBlocks
				? buildModuleSpecifier({
						workspace: context.workspace,
						from: entryModulePath,
						target: autoRegisterAppliedPath,
					})
				: null;

			const screenImports = descriptors.map((descriptor) => {
				const metadata =
					resolveAdminScreenComponentMetadata(descriptor);
				const routeConst = `${toLowerCamelIdentifier(metadata.identifier)}Route`;
				const screenPath = path.posix.join(
					uiApplied,
					'app',
					descriptor.name,
					'admin',
					...metadata.directories,
					`${metadata.fileName}.tsx`
				);
				const moduleSpecifier = buildModuleSpecifier({
					workspace: context.workspace,
					from: entryModulePath,
					target: screenPath,
				});

				return {
					component: metadata.identifier,
					routeConst,
					moduleSpecifier,
				};
			});

			sourceFile.addStatements(
				'/** @jsxImportSource @wordpress/element */'
			);
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/core/data',
				namedImports: [
					{ name: 'configureWPKernel' },
					{ name: 'WPKInstance', isTypeOnly: true },
				],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui',
				namedImports: ['attachUIBindings'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: 'react-dom/client',
				namedImports: ['createRoot'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: configImport,
				namedImports: ['wpkConfig'],
			});
			if (autoRegisterImport) {
				sourceFile.addImportDeclaration({
					moduleSpecifier: autoRegisterImport,
					namedImports: ['registerGeneratedBlocks'],
				});
			}
			sourceFile.addImportDeclaration({
				moduleSpecifier: runtimeImport,
				namedImports: [{ name: runtimeSymbol }],
			});
			for (const screenImport of screenImports) {
				sourceFile.addImportDeclaration({
					moduleSpecifier: screenImport.moduleSpecifier,
					namedImports: [
						{ name: screenImport.component },
						{ name: screenImport.routeConst },
					],
				});
			}

			sourceFile.addVariableStatement({
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: 'adminScreens',
						initializer: (writer) => {
							writer.writeLine('{');
							writer.indent(() => {
								for (const screen of screenImports) {
									writer.writeLine(
										`[${screen.routeConst}]: ${screen.component},`
									);
								}
							});
							writer.write('}');
						},
					},
				],
			});

			sourceFile.addFunction({
				name: 'mountAdminScreen',
				statements: (writer) => {
					writer.writeLine(
						"const container = document.getElementById('wpkernel-admin-screen');"
					);
					writer.writeLine('if (!container) {');
					writer.indent(() => writer.writeLine('return;'));
					writer.writeLine('}');
					writer.blankLine();
					writer.writeLine(
						'const dataset = container.dataset ?? ({} as DOMStringMap);'
					);
					writer.writeLine(
						"const screenKey = container.getAttribute('data-wpkernel-page') ?? dataset.wpkernelPage ?? '';"
					);
					writer.writeLine('const Screen = adminScreens[screenKey];');
					writer.writeLine('if (!Screen) {');
					writer.indent(() => writer.writeLine('return;'));
					writer.writeLine('}');
					writer.blankLine();
					writer.writeLine('const root = createRoot(container);');
					writer.writeLine('root.render(<Screen />);');
				},
			});

			sourceFile.addFunction({
				name: 'bootstrapKernel',
				isExported: true,
				returnType: 'WPKInstance',
				statements: (writer) => {
					writer.writeLine('const wpk = configureWPKernel({');
					writer.indent(() =>
						writer.writeLine('namespace: wpkConfig.namespace,')
					);
					writer.writeLine('});');
					writer.writeLine(
						'Object.values(wpkConfig.resources ?? {}).forEach((resource) => {'
					);
					writer.indent(() =>
						writer.writeLine(
							'wpk.defineResource(resource as unknown as Parameters<typeof wpk.defineResource>[0]);'
						)
					);
					writer.writeLine('});');
					writer.writeLine(
						'const uiRuntime = attachUIBindings(wpk, { dataviews: { enable: true } });'
					);
					writer.writeLine(
						`${runtimeSymbol}.setUIRuntime?.(uiRuntime);`
					);
					writer.writeLine('return wpk;');
				},
			});

			sourceFile.addVariableStatement({
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: 'wpk',
						initializer: 'bootstrapKernel()',
					},
				],
				isExported: true,
			});
			if (autoRegisterImport) {
				sourceFile.addStatements('registerGeneratedBlocks();');
			}
			sourceFile.addStatements(
				[
					"if (document.readyState === 'loading') {",
					"  document.addEventListener('DOMContentLoaded', mountAdminScreen, { once: true });",
					'} else {',
					'  mountAdminScreen();',
					'}',
				].join('\n')
			);

			sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
			await emit({ filePath: entryPath, sourceFile });
			reporter.debug('createUiEntryBuilder: generated UI entry.', {
				file: entryPath,
			});
		},
	});
}
