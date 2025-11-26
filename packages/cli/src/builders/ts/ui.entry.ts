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

export function createUiEntryBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.ts.ui-entry',
		kind: 'builder',
		dependsOn: [
			'builder.generate.ts.core',
			'ir.resources.core',
			'ir.capability-map.core',
			'ir.blocks.core',
			'ir.layout.core',
			'ir.meta.core',
		],
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
				ir,
				input.options.config.resources
			);
			const hasUi = descriptors.length > 0;
			const { uiGenerated, blocksGenerated, blocksApplied, uiApplied } =
				paths;
			const entryPath = path.posix.join(uiGenerated, 'index.tsx');
			const appliedEntryPath = path.posix.join(uiApplied, 'index.tsx');
			const entryModulePath = appliedEntryPath;
			const wpkConfigModule = buildModuleSpecifier({
				workspace: context.workspace,
				from: entryModulePath,
				target: path.posix.join(
					context.workspace.cwd(),
					'wpk.config.ts'
				),
			});
			const capabilityModule = buildModuleSpecifier({
				workspace: context.workspace,
				from: entryModulePath,
				target: path.posix.join(paths.jsGenerated, 'capabilities.ts'),
			});

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

			// Always include DataViews base styles; harmless if unused.
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wordpress/dataviews/build-style/style.css',
			});

			const emittedFiles: string[] = [];
			const emit = buildEmitter(context.workspace, output, emittedFiles);
			await writeAdminRuntimeStub(
				context.workspace,
				path.posix.join(uiGenerated, 'runtime.ts')
			);
			const runtimeImport = buildModuleSpecifier({
				workspace: context.workspace,
				from: appliedEntryPath,
				target: path.posix.join(uiApplied, 'runtime.ts'),
			});
			const runtimeSymbol = DEFAULT_RUNTIME_SYMBOL;
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
				moduleSpecifier: '@wordpress/element',
				namedImports: ['render'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: wpkConfigModule,
				namedImports: ['wpkConfig'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: capabilityModule,
				namedImports: ['capabilities'],
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
					writer.writeLine('render(<Screen />, container);');
				},
			});

			sourceFile.addFunction({
				name: 'bootstrapKernel',
				isExported: true,
				returnType: 'WPKInstance',
				statements: (writer) => {
					writer.writeLine(
						'if (!(globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: { capability?: typeof capabilities } }).__WP_KERNEL_ACTION_RUNTIME__) {'
					);
					writer.indent(() => {
						writer.writeLine(
							'(globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: { capability?: typeof capabilities } }).__WP_KERNEL_ACTION_RUNTIME__ = {'
						);
						writer.indent(() => {
							writer.writeLine('capability: capabilities,');
						});
						writer.writeLine('};');
					});
					writer.writeLine('} else {');
					writer.indent(() => {
						writer.writeLine(
							'const runtime = (globalThis as { __WP_KERNEL_ACTION_RUNTIME__?: { capability?: typeof capabilities } }).__WP_KERNEL_ACTION_RUNTIME__;'
						);
						writer.writeLine(
							'if (runtime && !runtime.capability) {'
						);
						writer.indent(() =>
							writer.writeLine(
								'runtime.capability = capabilities;'
							)
						);
						writer.writeLine('}');
					});
					writer.writeLine('}');
					writer.blankLine();
					writer.writeLine('const dataviewConfigs = {');
					writer.indent(() => {
						for (const descriptor of descriptors) {
							writer.write(
								`[${JSON.stringify(descriptor.key)}]: {`
							);
							writer.newLine();
							writer.indent(() => {
								writer.writeLine('fields: [],');
								writer.writeLine(
									'defaultView: { type: "table" },'
								);
								writer.writeLine(
									`preferencesKey: ${JSON.stringify(
										`${ir.meta.namespace}/dataviews/${descriptor.name}`
									)},`
								);
								writer.writeLine(
									'mapQuery: (query: Record<string, unknown>) => query ?? {},'
								);
							});
							writer.writeLine('},');
						}
					});
					writer.writeLine('} as const;');
					writer.writeLine('const wpk = configureWPKernel({');
					writer.indent(() =>
						writer.writeLine('namespace: wpkConfig.namespace,')
					);
					writer.writeLine('});');
					writer.writeLine(
						'Object.entries(wpkConfig.resources ?? {}).forEach(([name, resource]) => {'
					);
					writer.indent(() => {
						writer.writeLine(
							'const normalizedDataviews = (dataviewConfigs as Record<string, unknown>)[name];'
						);
						writer.writeLine(
							'const resourceWithUI = normalizedDataviews'
						);
						writer.indent(() => {
							writer.writeLine(
								'? { ...resource, ui: { ...(resource as { ui?: unknown }).ui, admin: { ...(resource as { ui?: { admin?: unknown } }).ui?.admin, dataviews: normalizedDataviews } } }'
							);
							writer.writeLine(': resource;');
						});
						writer.writeLine(
							'wpk.defineResource(resourceWithUI as unknown as Parameters<typeof wpk.defineResource>[0]);'
						);
					});
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
