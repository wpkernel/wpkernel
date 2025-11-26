import path from 'path';
import {
	type AdminDataViews,
	type ResourceDescriptor,
	type TsBuilderCreator,
	type TsBuilderCreatorContext as BuilderContext,
} from '../types';
import type * as tsMorph from 'ts-morph';
type VariableDeclarationKindValue = typeof tsMorph.VariableDeclarationKind;
type SourceFile = tsMorph.SourceFile;
import { loadTsMorph } from './runtime.loader';
import {
	resolveResourceImport,
	writeAdminRuntimeStub,
	buildModuleSpecifier,
} from './shared.imports';
import { toPascalCase, toCamelCase } from './shared.metadata';

export type AdminScreenConfig = {
	readonly route?: string;
	readonly component?: string;
	readonly resourceSymbol?: string;
	readonly wpkernelSymbol?: string;
	readonly wpkernelImport?: string;
	readonly resourceImport?: string;
	readonly menu?: {
		readonly slug?: string;
	};
};

export type AdminDataViewsWithInteractivity = AdminDataViews & {
	readonly interactivity?: { readonly feature?: unknown };
	readonly screen?: AdminScreenConfig;
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

function slugifyRouteSegment(value: string, fallback: string): string {
	const cleaned = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/-+/gu, '-')
		.replace(/^-+|-+$/gu, '');

	if (cleaned.length > 0) {
		return cleaned;
	}

	const fallbackSlug = fallback
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/-+/gu, '-')
		.replace(/^-+|-+$/gu, '');

	return fallbackSlug.length > 0 ? fallbackSlug : 'admin-screen';
}

export function resolveAdminScreenRoute(
	descriptor: ResourceDescriptor
): string {
	const dataviews = descriptor.dataviews as
		| AdminDataViewsWithInteractivity
		| undefined;
	const screenConfig = dataviews?.screen ?? {};
	const configuredRoute = screenConfig.route;
	const menuSlug = screenConfig.menu?.slug;

	let candidate: string;
	if (
		typeof configuredRoute === 'string' &&
		configuredRoute.trim().length > 0
	) {
		candidate = configuredRoute;
	} else if (typeof menuSlug === 'string' && menuSlug.trim().length > 0) {
		candidate = menuSlug;
	} else {
		candidate = `${descriptor.config.namespace ?? descriptor.name}-${descriptor.name}`;
	}

	return slugifyRouteSegment(candidate, descriptor.name);
}

export function resolveAdminScreenComponentMetadata(
	descriptor: ResourceDescriptor
): AdminScreenComponentMetadata {
	const screenConfig =
		(descriptor.dataviews as AdminDataViewsWithInteractivity | undefined)
			?.screen ?? {};
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
	const dataviews = descriptor.dataviews as
		| AdminDataViewsWithInteractivity
		| undefined;
	const feature = dataviews?.interactivity?.feature;

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
			const dataviews = ensureAdminDataViews(context.descriptor);
			const { VariableDeclarationKind } = await loadTsMorph();
			const { descriptor } = context;
			const screenConfig = dataviews.screen ?? {};
			const listRoutePath = resolveListRoutePath(descriptor);
			const componentMeta =
				resolveAdminScreenComponentMetadata(descriptor);
			const names = resolveAdminNames(descriptor, componentMeta);
			const paths = resolveAdminPaths(context, componentMeta);
			const resourceImport = await resolveAdminResourceImport(
				context,
				screenConfig,
				paths.appliedScreenPath
			);
			await writeAdminRuntimeStub(
				context.workspace,
				path.join(context.paths.uiGenerated, 'runtime.ts')
			);
			const wpkernelImport = resolveAdminRuntimeImport(
				context,
				screenConfig,
				paths.appliedScreenPath
			);

			const sourceFile = context.project.createSourceFile(
				paths.generatedScreenPath,
				'',
				{ overwrite: true }
			);

			addAdminImports({
				sourceFile,
				listRoutePath,
				wpkernelImport,
				wpkernelSymbol: names.wpkernelSymbol,
				resourceImport,
				resourceSymbol: names.resourceSymbol,
			});
			addDataViewConfigVariable({
				sourceFile,
				VariableDeclarationKind,
				descriptor,
				dataViewConfigIdentifier: names.dataViewConfigIdentifier,
			});
			addRouteVariable({
				sourceFile,
				componentIdentifierCamel: names.componentIdentifierCamel,
				descriptor,
				VariableDeclarationKind,
			});
			const interactivity = addInteractivityHelpers({
				sourceFile,
				descriptor,
				componentIdentifier: names.componentIdentifier,
				componentIdentifierCamel: names.componentIdentifierCamel,
				resourceSymbol: names.resourceSymbol,
				VariableDeclarationKind,
			});
			addContentComponent({
				sourceFile,
				listRoutePath,
				resourceSymbol: names.resourceSymbol,
				dataViewConfigIdentifier: names.dataViewConfigIdentifier,
				descriptor,
				componentIdentifier: names.componentIdentifier,
			});
			addAdminComponent({
				sourceFile,
				descriptor,
				componentIdentifier: names.componentIdentifier,
				contextIdentifier: interactivity.contextIdentifier,
				namespaceFunctionName: interactivity.namespaceFunctionName,
				wpkernelSymbol: names.wpkernelSymbol,
				contentComponentName: `${names.componentIdentifier}Content`,
			});

			await context.emit({
				filePath: paths.generatedScreenPath,
				sourceFile,
			});
		},
	};
}

function ensureAdminDataViews(
	descriptor: ResourceDescriptor
): AdminDataViewsWithInteractivity {
	if (!descriptor.dataviews) {
		throw new Error(
			'admin screen creator requires inferred dataviews in IR'
		);
	}
	return descriptor.dataviews as AdminDataViewsWithInteractivity;
}

function resolveListRoutePath(descriptor: ResourceDescriptor): string | null {
	const routePath = descriptor.config.routes?.list?.path;
	return typeof routePath === 'string' ? routePath : null;
}

function resolveAdminNames(
	descriptor: ResourceDescriptor,
	componentMeta: ReturnType<typeof resolveAdminScreenComponentMetadata>
) {
	const dataViewConfigIdentifier = `${toCamelCase(
		descriptor.name
	)}DataViewConfig`;
	const componentIdentifierCamel = toLowerCamelIdentifier(
		componentMeta.identifier
	);
	const resourceSymbol =
		(descriptor.dataviews as AdminDataViewsWithInteractivity)?.screen
			?.resourceSymbol ?? toCamelCase(descriptor.name);
	const wpkernelSymbol =
		(descriptor.dataviews as AdminDataViewsWithInteractivity)?.screen
			?.wpkernelSymbol ?? 'adminScreenRuntime';

	return {
		dataViewConfigIdentifier,
		componentIdentifier: componentMeta.identifier,
		componentIdentifierCamel,
		resourceSymbol,
		wpkernelSymbol,
	};
}

function resolveAdminPaths(
	context: BuilderContext,
	componentMeta: ReturnType<typeof resolveAdminScreenComponentMetadata>
) {
	const generatedScreenPath = path.join(
		context.paths.uiGenerated,
		'app',
		context.descriptor.name,
		'admin',
		...componentMeta.directories,
		`${componentMeta.fileName}.tsx`
	);
	const appliedScreenPath = path.join(
		context.paths.uiApplied,
		'app',
		context.descriptor.name,
		'admin',
		...componentMeta.directories,
		`${componentMeta.fileName}.tsx`
	);

	return { generatedScreenPath, appliedScreenPath };
}

async function resolveAdminResourceImport(
	context: BuilderContext,
	screenConfig: AdminDataViewsWithInteractivity['screen'] | undefined,
	appliedScreenPath: string
) {
	const resourceSymbol =
		screenConfig?.resourceSymbol ??
		toCamelCase(context.descriptor.name ?? 'resource');
	const [resourceImport] = await Promise.all([
		resolveResourceImport({
			workspace: context.workspace,
			from: appliedScreenPath,
			generatedResourcesDir: path.join(
				context.paths.uiGenerated,
				'resources'
			),
			appliedResourcesDir: path.join(
				context.paths.uiResourcesApplied,
				''
			),
			configured: screenConfig?.resourceImport,
			resourceKey: context.descriptor.key,
			resourceSymbol,
			configPath: context.sourcePath,
		}),
	]);
	return resourceImport;
}

function resolveAdminRuntimeImport(
	context: BuilderContext,
	screenConfig: AdminDataViewsWithInteractivity['screen'] | undefined,
	appliedScreenPath: string
) {
	if (
		typeof screenConfig?.wpkernelImport === 'string' &&
		screenConfig.wpkernelImport.trim().length > 0
	) {
		return screenConfig.wpkernelImport;
	}

	return buildModuleSpecifier({
		workspace: context.workspace,
		from: appliedScreenPath,
		target: path.join(context.paths.uiApplied, 'runtime.ts'),
	});
}

function addAdminImports(options: {
	sourceFile: SourceFile;
	listRoutePath: string | null;
	wpkernelImport: string;
	wpkernelSymbol: string;
	resourceImport: string;
	resourceSymbol: string;
}) {
	const {
		sourceFile,
		listRoutePath,
		wpkernelImport,
		wpkernelSymbol,
		resourceImport,
		resourceSymbol,
	} = options;

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
	if (listRoutePath) {
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wordpress/api-fetch',
			defaultImport: 'apiFetch',
		});
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wordpress/url',
			namedImports: ['addQueryArgs'],
		});
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wpkernel/core/resource',
			namedImports: [{ name: 'ListResponse', isTypeOnly: true }],
		});
	}
	sourceFile.addImportDeclaration({
		moduleSpecifier: wpkernelImport,
		namedImports: [{ name: wpkernelSymbol }],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: resourceImport,
		namedImports: [{ name: resourceSymbol }],
	});
}

function addDataViewConfigVariable(options: {
	sourceFile: SourceFile;
	VariableDeclarationKind: VariableDeclarationKindValue;
	descriptor: ResourceDescriptor;
	dataViewConfigIdentifier: string;
}) {
	const {
		sourceFile,
		VariableDeclarationKind,
		descriptor,
		dataViewConfigIdentifier,
	} = options;
	sourceFile.addVariableStatement({
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: dataViewConfigIdentifier,
				initializer: (writer) => {
					writer.writeLine('{');
					writer.indent(() => {
						writer.writeLine('fields: [],');
						writer.writeLine('defaultView: { type: "table" },');
						writer.writeLine(
							`preferencesKey: ${JSON.stringify(
								`${descriptor.config.namespace ?? descriptor.name}/dataviews/${descriptor.name}`
							)},`
						);
						writer.writeLine(
							'mapQuery: (query: Record<string, unknown>) => query ?? {},'
						);
					});
					writer.write('}');
				},
			},
		],
	});
}

function addRouteVariable(options: {
	sourceFile: SourceFile;
	componentIdentifierCamel: string;
	descriptor: ResourceDescriptor;
	VariableDeclarationKind: VariableDeclarationKindValue;
}) {
	const {
		sourceFile,
		componentIdentifierCamel,
		descriptor,
		VariableDeclarationKind,
	} = options;
	const route = resolveAdminScreenRoute(descriptor);
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

function addInteractivityHelpers(options: {
	sourceFile: SourceFile;
	descriptor: ResourceDescriptor;
	componentIdentifier: string;
	componentIdentifierCamel: string;
	resourceSymbol: string;
	VariableDeclarationKind: VariableDeclarationKindValue;
}) {
	const {
		sourceFile,
		descriptor,
		componentIdentifier,
		componentIdentifierCamel,
		resourceSymbol,
		VariableDeclarationKind,
	} = options;
	const interactivityFeature = resolveInteractivityFeature(descriptor);
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
			writer.writeLine('return cleaned.length > 0 ? cleaned : fallback;');
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
			writer.writeLine("const rawSegment = storeKey.split('/').pop();");
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

	return { contextIdentifier, namespaceFunctionName };
}

function addContentComponent(options: {
	sourceFile: SourceFile;
	listRoutePath: string | null;
	resourceSymbol: string;
	dataViewConfigIdentifier: string;
	descriptor: ResourceDescriptor;
	componentIdentifier: string;
}) {
	const {
		sourceFile,
		listRoutePath,
		resourceSymbol,
		dataViewConfigIdentifier,
		descriptor,
		componentIdentifier,
	} = options;

	sourceFile.addFunction({
		name: `${componentIdentifier}Content`,
		statements: (writer) => {
			writer.writeLine('const runtime = useWPKernelUI();');
			writer.writeLine(
				`const controller = runtime?.dataviews?.controllers.get('${descriptor.key}') ?? undefined;`
			);
			if (listRoutePath) {
				writer.writeLine(
					'const fetchList = async (query: Record<string, unknown>): Promise<ListResponse<unknown>> => {'
				);
				writer.indent(() => {
					writer.writeLine(
						`const path = addQueryArgs('${listRoutePath}', query);`
					);
					writer.writeLine('try {');
					writer.indent(() => {
						writer.writeLine(
							'const response = (await apiFetch({ path })) as { items?: unknown[]; total?: number } | undefined;'
						);
						writer.writeLine(
							'const items = Array.isArray(response?.items) ? response.items : [];'
						);
						writer.writeLine(
							"const total = typeof response?.total === 'number' ? response.total : items.length;"
						);
						writer.writeLine('return { items, total };');
					});
					writer.writeLine('} catch (error) {');
					writer.indent(() => {
						writer.writeLine(
							"const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';"
						);
						writer.writeLine("if (code.includes('forbidden')) {");
						writer.indent(() => {
							writer.writeLine(
								'return { items: [], total: 0, error: new WPKernelError({ code: "wpk_capability_denied", message: "You do not have permission to view this list.", data: { capability: String(code) } }) };'
							);
						});
						writer.writeLine('}');
						writer.writeLine('throw error;');
					});
					writer.writeLine('}');
				});
				writer.writeLine('};');
			}
			writer.writeLine('return (');
			writer.indent(() => {
				writer.writeLine('<ResourceDataView');
				writer.indent(() => {
					writer.writeLine(`resource={${resourceSymbol}}`);
					writer.writeLine(`config={${dataViewConfigIdentifier}}`);
					writer.writeLine('runtime={runtime}');
					writer.writeLine('controller={controller}');
					if (listRoutePath) {
						writer.writeLine('fetchList={fetchList}');
					}
				});
				writer.writeLine('/>');
			});
			writer.writeLine(');');
		},
	});
}

function addAdminComponent(options: {
	sourceFile: SourceFile;
	descriptor: ResourceDescriptor;
	componentIdentifier: string;
	contextIdentifier: string;
	namespaceFunctionName: string;
	wpkernelSymbol: string;
	contentComponentName: string;
}) {
	const {
		sourceFile,
		descriptor,
		componentIdentifier,
		contextIdentifier,
		namespaceFunctionName,
		wpkernelSymbol,
		contentComponentName,
	} = options;
	sourceFile.addFunction({
		name: componentIdentifier,
		isExported: true,
		statements: (writer) => {
			writer.writeLine(
				`const runtime = ${wpkernelSymbol}.getUIRuntime?.();`
			);
			writer.writeLine('if (!runtime) {');
			writer.indent(() => {
				writer.writeLine("throw new WPKernelError('DeveloperError', {");
				writer.indent(() => {
					writer.writeLine("message: 'UI runtime not attached.',");
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
					writer.writeLine(`data-wp-context={${contextIdentifier}}`);
				});
				writer.writeLine('>');
				writer.indent(() => {
					writer.writeLine('<WPKernelUIProvider runtime={runtime}>');
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
}
