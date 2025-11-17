import path from 'path';
import { type TsBuilderCreator } from '../types';
import {
	resolveInteractivityFeature,
	resolveAdminScreenComponentMetadata,
	toLowerCamelIdentifier,
} from './pipeline.creator.adminScreen';
import { loadTsMorph } from './runtime.loader';
import { resolveResourceImport, resolveKernelImport } from './shared.imports';
import { toCamelCase } from './shared.metadata';

/**
 * Builds a `TsBuilderCreator` for generating interactivity fixtures.
 *
 * The resulting fixture wires `createDataViewInteraction()` to the generated
 * resource actions so integrators can hydrate runtime behaviour in tests or
 * custom entry points.
 *
 * @category AST Builders
 * @example
 * ```ts
 * const creator = buildDataViewInteractivityFixtureCreator();
 * await creator.create(context);
 * ```
 * @example
 * ```ts
 * import {
 *   jobsadminscreenInteractivityNamespace,
 *   createJobsAdminScreenDataViewInteraction,
 * } from '.wpk/generate/ui/fixtures/interactivity/job';
 *
 * const { store } = createJobsAdminScreenDataViewInteraction();
 * ``
 * @returns A `TsBuilderCreator` instance for interactivity fixture generation.
 */

export function buildDataViewInteractivityFixtureCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.dataviewInteractivityFixture.core',
		async create(context) {
			const { VariableDeclarationKind } = await loadTsMorph();
			const { descriptor } = context;
			const screenConfig = descriptor.dataviews.screen ?? {};
			const { identifier: componentIdentifier } =
				resolveAdminScreenComponentMetadata(descriptor);
			const componentIdentifierCamel =
				toLowerCamelIdentifier(componentIdentifier);
			const resourceSymbol =
				screenConfig.resourceSymbol ?? toCamelCase(descriptor.name);
			const wpkernelSymbol = screenConfig.wpkernelSymbol ?? 'kernel';
			const interactivityFeature =
				resolveInteractivityFeature(descriptor);

			const fixturePath = path.join(
				context.paths.uiGenerated,
				'fixtures',
				'interactivity',
				`${descriptor.key}.ts`
			);

			const [resourceImport, wpkernelImport] = await Promise.all([
				resolveResourceImport({
					workspace: context.workspace,
					from: fixturePath,
					configured: screenConfig.resourceImport,
					resourceKey: descriptor.key,
					resourceSymbol,
					configPath: context.sourcePath,
				}),
				resolveKernelImport({
					workspace: context.workspace,
					from: fixturePath,
					configured: screenConfig.wpkernelImport,
				}),
			]);

			const sourceFile = context.project.createSourceFile(
				fixturePath,
				'',
				{
					overwrite: true,
				}
			);

			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/core/contracts',
				namedImports: ['WPKernelError', 'WPK_NAMESPACE'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui/dataviews',
				namedImports: [
					{ name: 'createDataViewInteraction' },
					{ name: 'DataViewInteractionResult', isTypeOnly: true },
				],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/core/interactivity',
				namedImports: [
					{
						name: 'InteractionActionsRecord',
						isTypeOnly: true,
					},
					{
						name: 'InteractionActionInput',
						isTypeOnly: true,
					},
					{
						name: 'HydrateServerStateInput',
						isTypeOnly: true,
					},
				],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/core/data',
				namedImports: [
					{ name: 'WPKernelUIRuntime', isTypeOnly: true },
					{ name: 'WPKernelRegistry', isTypeOnly: true },
				],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: wpkernelImport,
				namedImports: [{ name: wpkernelSymbol }],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: resourceImport,
				namedImports: [{ name: resourceSymbol }],
			});

			const featureIdentifier = `${componentIdentifierCamel}InteractivityFeature`;
			const resourceNameIdentifier = `${componentIdentifierCamel}InteractivityResourceName`;
			const segmentFunctionName = `normalize${componentIdentifier}InteractivitySegment`;
			const namespaceFunctionName = `get${componentIdentifier}InteractivityNamespace`;
			const namespaceIdentifier = `${componentIdentifierCamel}InteractivityNamespace`;
			const actionsBuilderName = `build${componentIdentifier}InteractivityActions`;
			const actionsIdentifier = `${componentIdentifierCamel}InteractivityActions`;
			const runtimeResolverName = `resolve${componentIdentifier}Runtime`;
			const optionsInterfaceName = `Create${componentIdentifier}DataViewInteractionOptions`;
			const createFunctionName = `create${componentIdentifier}DataViewInteraction`;

			sourceFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: featureIdentifier,
						initializer: (writer) => {
							writer.quote(interactivityFeature);
						},
					},
				],
			});
			sourceFile.addVariableStatement({
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: resourceNameIdentifier,
						initializer: (writer) => {
							writer.quote(descriptor.name);
						},
					},
				],
			});
			sourceFile.addFunction({
				name: segmentFunctionName,
				parameters: [
					{ name: 'value', type: 'string' },
					{ name: 'fallback', type: 'string' },
				],
				returnType: 'string',
				statements: (writer) => {
					writer.writeLine('const cleaned = value');
					writer.indent(() => {
						writer.writeLine('.toLowerCase()');
						writer.writeLine('.trim()');
						writer.writeLine(".replace(/[^a-z0-9]+/g, '-')");
						writer.writeLine(".replace(/-+/g, '-')");
						writer.writeLine(".replace(/^-+|-+$/g, '')");
					});
					writer.writeLine(
						'return cleaned.length > 0 ? cleaned : fallback;'
					);
				},
			});
			sourceFile.addFunction({
				name: namespaceFunctionName,
				returnType: 'string',
				statements: (writer) => {
					writer.writeLine(
						`const resource = ${resourceSymbol} as { storeKey?: string; name?: string };`
					);
					writer.writeLine(
						"const storeKey = typeof resource.storeKey === 'string' ? resource.storeKey : '';"
					);
					writer.writeLine(
						"const rawSegment = storeKey.split('/').pop();"
					);
					writer.writeLine(
						`const resourceName = typeof resource.name === 'string' && resource.name.length > 0 ? resource.name : ${resourceNameIdentifier};`
					);
					writer.writeLine(
						`const resourceSegment = ${segmentFunctionName}(rawSegment && rawSegment.length > 0 ? rawSegment : resourceName, 'resource');`
					);
					writer.writeLine(
						`const featureSegment = ${segmentFunctionName}(${featureIdentifier}, 'feature');`
					);
					writer.writeLine(
						'return `${WPK_NAMESPACE}/${resourceSegment}/${featureSegment}`;'
					);
				},
			});
			sourceFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: namespaceIdentifier,
						initializer: `${namespaceFunctionName}()`,
					},
				],
			});
			sourceFile.addFunction({
				name: actionsBuilderName,
				returnType: 'InteractionActionsRecord | undefined',
				statements: (writer) => {
					writer.writeLine(
						`const actions = ${resourceSymbol}.ui?.admin?.dataviews?.actions;`
					);
					writer.writeLine('if (!Array.isArray(actions)) {');
					writer.indent(() => {
						writer.writeLine('return undefined;');
					});
					writer.writeLine('}');
					writer.writeLine(
						'const bindings: InteractionActionsRecord = {};'
					);
					writer.writeLine('for (const entry of actions) {');
					writer.indent(() => {
						writer.writeLine(
							'if (!entry || typeof entry !== "object") {'
						);
						writer.indent(() => {
							writer.writeLine('continue;');
						});
						writer.writeLine('}');
						writer.writeLine(
							'const candidate = entry as { id?: unknown; action?: unknown };'
						);
						writer.writeLine(
							"if (typeof candidate.id !== 'string' || candidate.id.length === 0) {"
						);
						writer.indent(() => {
							writer.writeLine('continue;');
						});
						writer.writeLine('}');
						writer.writeLine('if (!candidate.action) {');
						writer.indent(() => {
							writer.writeLine('continue;');
						});
						writer.writeLine('}');
						writer.writeLine(
							'bindings[candidate.id] = candidate.action as InteractionActionInput<unknown, unknown>;'
						);
					});
					writer.writeLine('}');
					writer.writeLine(
						'return Object.keys(bindings).length > 0 ? bindings : undefined;'
					);
				},
			});
			sourceFile.addVariableStatement({
				isExported: true,
				declarationKind: VariableDeclarationKind.Const,
				declarations: [
					{
						name: actionsIdentifier,
						initializer: `${actionsBuilderName}()`,
					},
				],
			});
			sourceFile.addFunction({
				name: runtimeResolverName,
				parameters: [
					{
						name: 'runtime',
						type: 'WPKernelUIRuntime | undefined',
					},
				],
				returnType: 'WPKernelUIRuntime',
				statements: (writer) => {
					writer.writeLine('if (runtime) {');
					writer.indent(() => {
						writer.writeLine('return runtime;');
					});
					writer.writeLine('}');
					writer.writeLine(
						`const resolved = ${wpkernelSymbol}.getUIRuntime?.();`
					);
					writer.writeLine('if (!resolved) {');
					writer.indent(() => {
						writer.writeLine(
							"throw new WPKernelError('DeveloperError', {"
						);
						writer.indent(() => {
							writer.writeLine(
								"message: 'UI runtime not attached.',"
							);
							writer.writeLine(
								`context: { resourceName: ${resourceNameIdentifier} },`
							);
						});
						writer.writeLine('});');
					});
					writer.writeLine('}');
					writer.writeLine('return resolved;');
				},
			});
			sourceFile.addInterface({
				isExported: true,
				name: optionsInterfaceName,
				properties: [
					{ name: 'runtime?', type: 'WPKernelUIRuntime' },
					{ name: 'feature?', type: 'string' },
					{ name: 'namespace?', type: 'string' },
					{ name: 'registry?', type: 'WPKernelRegistry' },
					{ name: 'store?', type: 'Record<string, unknown>' },
					{ name: 'autoHydrate?', type: 'boolean' },
					{
						name: 'hydrateServerState?',
						type: 'HydrateServerStateInput<unknown, unknown>',
					},
					{ name: 'actions?', type: 'InteractionActionsRecord' },
				],
			});
			sourceFile.addFunction({
				name: createFunctionName,
				isExported: true,
				parameters: [
					{
						name: 'options',
						type: `${optionsInterfaceName} = {}`,
					},
				],
				returnType: 'DataViewInteractionResult<unknown, unknown>',
				statements: (writer) => {
					writer.writeLine(
						`const runtime = ${runtimeResolverName}(options.runtime);`
					);
					writer.writeLine(
						`const namespace = options.namespace ?? ${namespaceFunctionName}();`
					);
					writer.writeLine(
						`const feature = options.feature ?? ${featureIdentifier};`
					);
					writer.writeLine(
						`const actions = options.actions ?? ${actionsIdentifier};`
					);
					writer.writeLine('return createDataViewInteraction({');
					writer.indent(() => {
						writer.writeLine('runtime,');
						writer.writeLine('feature,');
						writer.writeLine(`resource: ${resourceSymbol},`);
						writer.writeLine(
							`resourceName: ${resourceNameIdentifier},`
						);
						writer.writeLine('actions,');
						writer.writeLine('namespace,');
						writer.writeLine(
							'registry: options.registry ?? runtime.registry,'
						);
						writer.writeLine('store: options.store,');
						writer.writeLine('autoHydrate: options.autoHydrate,');
						writer.writeLine(
							'hydrateServerState: options.hydrateServerState,'
						);
					});
					writer.writeLine('});');
				},
			});

			await context.emit({
				filePath: fixturePath,
				sourceFile,
			});
		},
	};
}
