import path from 'path';
import {
	type AdminDataViews,
	type ResourceDescriptor,
	type TsBuilderCreator,
} from '../types';
import { loadTsMorph } from './runtime.loader';
import { resolveResourceImport, resolveKernelImport } from './shared.imports';
import { toPascalCase, toCamelCase } from './shared.metadata';

export type AdminDataViewsWithInteractivity = AdminDataViews & {
	readonly interactivity?: { readonly feature?: unknown };
};

export type AdminScreenComponentMetadata = {
	readonly identifier: string;
	readonly fileName: string;
	readonly directories: readonly string[];
};

const COMPONENT_EXTENSION_PATTERN = /\.(?:[tj]sx?|mjs|cjs)$/iu;

function stripComponentExtension(value: string): string {
	return value.replace(COMPONENT_EXTENSION_PATTERN, '');
}

function buildPascalIdentifier(value: string): string {
	return value
		.split(/[^a-zA-Z0-9_$]+/u)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join('');
}

function ensurePascalIdentifier(value: string, fallback: string): string {
	const candidate = buildPascalIdentifier(value);
	const base = candidate.length > 0 ? candidate : fallback;
	if (/^[0-9]/u.test(base)) {
		return `_${base}`;
	}
	return base;
}

export function toLowerCamelIdentifier(value: string): string {
	if (value.length === 0) {
		return value;
	}
	return value.charAt(0).toLowerCase() + value.slice(1);
}

export function resolveAdminScreenComponentMetadata(
	descriptor: ResourceDescriptor
): AdminScreenComponentMetadata {
	const screenConfig = descriptor.dataviews.screen ?? {};
	const defaultBase = `${toPascalCase(descriptor.name)}AdminScreen`;
	const configured =
		typeof screenConfig.component === 'string'
			? screenConfig.component.trim()
			: '';
	const rawName = configured.length > 0 ? configured : defaultBase;
	const withoutExtension = stripComponentExtension(rawName);
	const segments = withoutExtension.split(/[\\/]/u).filter(Boolean);
	const fileName = segments.pop() ?? defaultBase;
	const directories = segments;
	const fallbackIdentifier = ensurePascalIdentifier(
		defaultBase,
		'GeneratedAdminScreen'
	);
	const identifier = ensurePascalIdentifier(fileName, fallbackIdentifier);

	return {
		identifier,
		fileName,
		directories,
	};
}

/**
 * Resolves the interactivity feature identifier for a resource.
 *
 * Uses `resource.ui.admin.dataviews.interactivity.feature` when present,
 * otherwise falls back to `'admin-screen'`.
 *
 * @param    descriptor
 * @category AST Builders
 */
export function resolveInteractivityFeature(
	descriptor: ResourceDescriptor
): string {
	const dataviews = descriptor.dataviews as AdminDataViewsWithInteractivity;
	const feature = dataviews.interactivity?.feature;

	if (typeof feature === 'string') {
		const trimmed = feature.trim();
		if (trimmed.length > 0) {
			return trimmed;
		}
	}

	return 'admin-screen';
}
/**
 * Builds a `TsBuilderCreator` for generating admin screen components.
 *
 * Generated screens:
 * - Wrap content in `<WPKernelUIProvider>` using the resolved runtime.
 * - Stamp `data-wp-interactive` and `data-wp-context` for use with wp-interactivity.
 *
 *
 * @category AST Builders
 * @example
 * ```ts
 * const creator = buildAdminScreenCreator();
 * await creator.create(context);
 * ```
 * @returns A `TsBuilderCreator` instance for admin screen generation.
 */
export function buildAdminScreenCreator(): TsBuilderCreator {
	return {
		key: 'builder.generate.ts.adminScreen.core',
		async create(context) {
			const { VariableDeclarationKind } = await loadTsMorph();
			const { descriptor } = context;
			const screenConfig = descriptor.dataviews.screen ?? {};
			const {
				identifier: componentIdentifier,
				fileName: componentFileName,
				directories: componentDirectories,
			} = resolveAdminScreenComponentMetadata(descriptor);
			const componentIdentifierCamel =
				toLowerCamelIdentifier(componentIdentifier);
			const resourceSymbol =
				screenConfig.resourceSymbol ?? toCamelCase(descriptor.name);
			const wpkernelSymbol = screenConfig.wpkernelSymbol ?? 'kernel';

			const screenDir = path.join(
				context.paths.uiGenerated,
				'app',
				descriptor.name,
				'admin'
			);
			const screenPath = path.join(
				screenDir,
				...componentDirectories,
				`${componentFileName}.tsx`
			);

			const [resourceImport, wpkernelImport] = await Promise.all([
				resolveResourceImport({
					workspace: context.workspace,
					from: screenPath,
					configured: screenConfig.resourceImport,
					resourceKey: descriptor.key,
					resourceSymbol,
					configPath: context.sourcePath,
				}),
				resolveKernelImport({
					workspace: context.workspace,
					from: screenPath,
					configured: screenConfig.wpkernelImport,
				}),
			]);

			const sourceFile = context.project.createSourceFile(
				screenPath,
				'',
				{
					overwrite: true,
				}
			);

			sourceFile.addStatements(
				'/** @jsxImportSource @wordpress/element */'
			);
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/core/contracts',
				namedImports: ['WPKernelError', 'WPK_NAMESPACE'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui',
				namedImports: ['WPKernelUIProvider', 'useWPKernelUI'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: '@wpkernel/ui/dataviews',
				namedImports: ['ResourceDataView'],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: wpkernelImport,
				namedImports: [{ name: wpkernelSymbol }],
			});
			sourceFile.addImportDeclaration({
				moduleSpecifier: resourceImport,
				namedImports: [{ name: resourceSymbol }],
			});

			const route = screenConfig.route;
			if (route) {
				sourceFile.addVariableStatement({
					isExported: true,
					declarationKind: VariableDeclarationKind.Const,
					declarations: [
						{
							name: `${componentIdentifierCamel}Route`,
							initializer: (writer) => {
								writer.quote(route);
							},
						},
					],
				});
			}

			const contentComponentName = `${componentIdentifier}Content`;
			const interactivityFeature =
				resolveInteractivityFeature(descriptor);
			const featureIdentifier = `${componentIdentifierCamel}InteractivityFeature`;
			const contextIdentifier = `${componentIdentifierCamel}InteractivityContext`;
			const segmentFunctionName = `normalize${componentIdentifier}InteractivitySegment`;
			const namespaceFunctionName = `get${componentIdentifier}InteractivityNamespace`;
			const resourceNameFallback = descriptor.name;

			sourceFile.addVariableStatement({
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
						name: contextIdentifier,
						initializer: (writer) => {
							writer.quote(
								JSON.stringify({
									feature: interactivityFeature,
									resource: resourceNameFallback,
								})
							);
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
						`const resourceName = typeof resource.name === 'string' && resource.name.length > 0 ? resource.name : ${JSON.stringify(
							resourceNameFallback
						)};`
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

			sourceFile.addFunction({
				name: contentComponentName,
				statements: (writer) => {
					writer.writeLine('const runtime = useWPKernelUI();');
					writer.writeLine('return (');
					writer.indent(() => {
						writer.writeLine('<ResourceDataView');
						writer.indent(() => {
							writer.writeLine(`resource={${resourceSymbol}}`);
							writer.writeLine(
								`config={${resourceSymbol}.ui?.admin?.dataviews}`
							);
							writer.writeLine('runtime={runtime}');
						});
						writer.writeLine('/>');
					});
					writer.writeLine(');');
				},
			});

			sourceFile.addFunction({
				name: componentIdentifier,
				isExported: true,
				statements: (writer) => {
					writer.writeLine(
						`const runtime = ${wpkernelSymbol}.getUIRuntime?.();`
					);
					writer.writeLine('if (!runtime) {');
					writer.indent(() => {
						writer.writeLine(
							"throw new WPKernelError('DeveloperError', {"
						);
						writer.indent(() => {
							writer.writeLine(
								"message: 'UI runtime not attached.',"
							);
							writer.write('context: { resourceName: ');
							writer.quote(descriptor.name);
							writer.writeLine(' },');
						});
						writer.writeLine('});');
					});
					writer.writeLine('}');
					writer.blankLine();
					writer.writeLine(
						`const interactivityNamespace = ${namespaceFunctionName}();`
					);
					writer.writeLine('return (');
					writer.indent(() => {
						writer.writeLine('<div');
						writer.indent(() => {
							writer.writeLine(
								'data-wp-interactive={interactivityNamespace}'
							);
							writer.writeLine(
								`data-wp-context={${contextIdentifier}}`
							);
						});
						writer.writeLine('>');
						writer.indent(() => {
							writer.writeLine(
								'<WPKernelUIProvider runtime={runtime}>'
							);
							writer.indent(() => {
								writer.writeLine(`<${contentComponentName} />`);
							});
							writer.writeLine('</WPKernelUIProvider>');
						});
						writer.writeLine('</div>');
					});
					writer.writeLine(');');
				},
			});

			await context.emit({ filePath: screenPath, sourceFile });
		},
	};
}
