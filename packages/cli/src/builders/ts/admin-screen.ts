import path from 'path';
import { writeAdminRuntimeStub, buildTsMorphAccessor } from './imports';
import { toPascalCase, toCamelCase } from './metadata';
import { createHelper } from '../../runtime';
import type { BuilderApplyOptions } from '../../runtime/types';
import type {
	IRv1,
	IRResource,
	IRUiResourceDescriptor,
	IRUiResourcePlan,
} from '../../ir/publicTypes';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceDescriptor, AdminDataViews } from '../types';
import {
	type AdminScreenResourceDescriptor,
	resolveAdminScreenComponentMetadata,
	resolveAdminScreenRoute,
	resolveInteractivityFeature,
	type AdminDataViewsWithInteractivity,
	resolveMenuSlug,
	resolveListRoutePath,
} from './admin-shared';
import type { CodeBlockWriter } from 'ts-morph';

/**
 * Creates a helper for generating admin screen components from the IR.
 *
 * Generated screens:
 * - Wrap content in `<WPKernelScreen>` using the resolved runtime.
 * - Stamp `data-wp-interactive` and `data-wp-context` for use with wp-interactivity.
 *
 * @category AST Builders
 */
export function createAdminScreenBuilder() {
	return createHelper({
		key: 'builder.generate.ts.adminScreen.core',
		kind: 'builder',
		dependsOn: [
			'ir.ui.resources',
			'ir.artifacts.plan',
			'ir.resources.core',
		],
		async apply(options: BuilderApplyOptions) {
			const { input, context, output, reporter } = options;

			const ir: IRv1 | null = input.ir;
			if (input.phase !== 'generate' || !ir?.artifacts) {
				reporter?.debug('admin screen builder: prerequisites missing', {
					phase: input.phase,
					hasIr: Boolean(ir),
					hasArtifacts: Boolean(ir?.artifacts),
				});
				return;
			}

			const uiResources: readonly IRUiResourceDescriptor[] =
				ir.ui?.resources ?? [];
			const artifacts = ir.artifacts;

			if (uiResources.length === 0) {
				reporter?.debug('admin screen builder: no UI resources.');
				return;
			}

			await generateAdminScreens({
				ir,
				artifacts,
				uiResources,
				context,
				output,
				reporter,
			});
		},
	});
}

async function generateAdminScreens(options: {
	readonly ir: IRv1;
	readonly artifacts: IRv1['artifacts'];
	readonly uiResources: readonly IRUiResourceDescriptor[];
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderApplyOptions['output'];
	readonly reporter?: BuilderApplyOptions['reporter'];
}) {
	const { ir, artifacts, uiResources, context, output, reporter } = options;
	const { createSourceFile, VariableDeclarationKind } =
		await buildTsMorphAccessor({
			workspace: context.workspace,
		});

	const resourceByName = new Map<string, IRResource>(
		ir.resources.map((resource) => [resource.name, resource])
	);

	for (const uiResource of uiResources) {
		await generateAdminScreen({
			uiResource,
			ir,
			artifacts,
			createSourceFile,
			VariableDeclarationKind,
			resourceByName,
			output,
			context,
			reporter,
		});
	}
}

async function generateAdminScreen(options: {
	readonly uiResource: IRUiResourceDescriptor;
	readonly ir: IRv1;
	readonly artifacts: IRv1['artifacts'];
	readonly createSourceFile: Awaited<
		ReturnType<typeof buildTsMorphAccessor>
	>['createSourceFile'];
	readonly VariableDeclarationKind: Awaited<
		ReturnType<typeof buildTsMorphAccessor>
	>['VariableDeclarationKind'];
	readonly resourceByName: Map<string, IRResource>;
	readonly output: BuilderApplyOptions['output'];
	readonly context: BuilderApplyOptions['context'];
	readonly reporter?: BuilderApplyOptions['reporter'];
}) {
	const {
		uiResource,
		ir,
		artifacts,
		createSourceFile,
		VariableDeclarationKind,
		resourceByName,
		output,
		context,
		reporter,
	} = options;

	const resolved = resolveAdminScreenContext({
		uiResource,
		artifacts,
		resourceByName,
		reporter,
	});
	if (!resolved) {
		return;
	}
	const { resource, resourcePlan, uiPlan } = resolved;

	const descriptor: AdminScreenResourceDescriptor = {
		key: uiResource.resource,
		name: resource.name,
		namespace: ir.meta.namespace,
		resource,
		dataviews: uiResource.dataviews as AdminDataViews,
		menu: uiResource.menu,
	};

	const dataviews = ensureAdminDataViews(descriptor, reporter);
	if (!dataviews) {
		return;
	}
	const listRoutePath = resolveListRoutePath(descriptor);
	const componentMeta = resolveAdminScreenComponentMetadata(descriptor);
	const names = resolveAdminNames(descriptor, componentMeta);
	const paths = resolveAdminPaths(uiPlan, descriptor, componentMeta);

	const resourceImport = buildRelativeImport(
		paths.appliedScreenPath,
		resourcePlan.modulePath
	);

	if (!ir.artifacts.js?.uiRuntimePath) {
		reporter?.debug(
			'admin screen builder: missing JS runtime path in artifacts.'
		);
		return;
	}

	await writeAdminRuntimeStub(
		context.workspace,
		ir.artifacts.js.uiRuntimePath
	);

	const wpkernelImport = buildRelativeImport(
		paths.appliedScreenPath,
		path.join(ir.layout.resolve('ui.applied'), 'runtime.ts')
	);

	const sourceFile = createSourceFile(paths.generatedScreenPath);

	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core',
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: 'react',
		namedImports: ['useMemo', 'useState'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/components',
		namedImports: ['Button'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/http',
		namedImports: [{ name: 'fetch', alias: 'wpkFetch' }],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/reporter',
		namedImports: ['getWPKernelReporter'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/url',
		namedImports: ['addQueryArgs'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/resource',
		namedImports: [
			{ name: 'ListResponse', isTypeOnly: true },
			{ name: 'ResourceObject', isTypeOnly: true },
		],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/contracts',
		namedImports: ['WPKernelError', 'WPK_NAMESPACE'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/ui/dataviews',
		namedImports: [
			{ name: 'DataViewsRuntimeContext', isTypeOnly: true },
			{
				name: 'ResourceDataViewController',
				isTypeOnly: true,
			},
			{ name: 'ResourceDataViewConfig', isTypeOnly: true },
			'ResourceDataView',
		],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/ui',
		namedImports: ['useWPKernelUI', 'WPKernelScreen'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: resourceImport,
		namedImports: [{ name: names.resourceSymbol }],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: wpkernelImport,
		namedImports: [{ name: names.wpkernelSymbol }],
	});

	const pascalName = toPascalCase(descriptor.name);
	const entityType = `${pascalName}Entity`;
	const actionsBuilder = `build${pascalName}Actions`;
	const quickForm = `${pascalName}QuickForm`;

	sourceFile.addImportDeclaration({
		moduleSpecifier: './form',
		namedImports: [
			quickForm,
			actionsBuilder,
			{ name: entityType, isTypeOnly: true },
		],
	});

	sourceFile.addImportDeclaration({
		moduleSpecifier: './config',
		namedImports: [names.dataViewConfigIdentifier],
	});

	const route = resolveAdminScreenRoute(descriptor);

	sourceFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: `${names.componentIdentifierCamel}Route`,
				initializer: (writer: CodeBlockWriter) => {
					writer.quote(route);
				},
			},
		],
	});

	sourceFile.addFunction({
		name: `${names.componentIdentifier}List`,
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine('const runtime = useWPKernelUI();');
			writer.writeLine('const reporter = getWPKernelReporter();');
			writer.writeLine(
				'const maybeRuntime = runtime as unknown as Partial<DataViewsRuntimeContext>;'
			);
			writer.writeLine('if (!maybeRuntime.dataviews) {');
			writer.indent(() => {
				writer.writeLine(
					"throw new WPKernelError('DeveloperError', { message: 'DataViews runtime unavailable.' });"
				);
			});
			writer.writeLine('}');
			writer.writeLine(
				'const dataViewsRuntime = maybeRuntime as DataViewsRuntimeContext;'
			);

			writer.writeLine(
				`const controller = dataViewsRuntime.dataviews.controllers.get('${descriptor.key}') as ResourceDataViewController<${entityType}, Record<string, unknown>> | undefined;`
			);

			writer.writeLine(
				`const resource: ResourceObject<${entityType}, Record<string, unknown>> = (controller?.resource as ResourceObject<${entityType}, Record<string, unknown>>) ?? (${names.resourceSymbol} as unknown as ResourceObject<${entityType}, Record<string, unknown>>);`
			);
			writer.blankLine();

			writer.writeLine(
				'const [isFormOpen, setFormOpen] = useState(false);'
			);
			writer.writeLine(
				'const [editId, setEditId] = useState<string | number | null>(null);'
			);
			writer.writeLine(
				'const [refreshKey, setRefreshKey] = useState(0);'
			);
			writer.blankLine();

			writer.writeLine('const actions = useMemo(() =>');
			writer.indent(() => {
				writer.writeLine(
					`${actionsBuilder}(controller ?? { resource }, (id) => {`
				);
				writer.indent(() => {
					writer.writeLine('setEditId(id);');
					writer.writeLine('setFormOpen(true);');
				});
				writer.writeLine('}),');
			});
			writer.writeLine('[controller, resource]);');
			writer.blankLine();

			if (listRoutePath) {
				writeFetchList(
					writer,
					entityType,
					listRoutePath,
					descriptor.name,
					ir.meta.namespace,
					names.componentIdentifier
				);
			}

			writeAdminScreenReturn(
				writer,
				pascalName,
				descriptor.name,
				names,
				entityType,
				quickForm,
				listRoutePath
			);
		},
	});

	const interactivityFeature = resolveInteractivityFeature(descriptor);
	const featureIdentifier = `${names.componentIdentifierCamel}InteractivityFeature`;
	const contextIdentifier = `${names.componentIdentifierCamel}InteractivityContext`;
	const segmentFunctionName = `normalize${names.componentIdentifier}InteractivitySegment`;
	const namespaceFunctionName = `get${names.componentIdentifier}InteractivityNamespace`;

	sourceFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: featureIdentifier,
				initializer: (writer: CodeBlockWriter) => {
					writer.quote(interactivityFeature);
				},
			},
		],
	});

	sourceFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: contextIdentifier,
				initializer: (writer: CodeBlockWriter) => {
					writer.quote(
						JSON.stringify({
							feature: interactivityFeature,
							resource: descriptor.name,
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
		statements: (writer: CodeBlockWriter) => {
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
		isExported: true,
		returnType: 'string',
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine(
				`const resource = ${names.resourceSymbol} as { storeKey?: string; name?: string };`
			);
			writer.writeLine(
				"const storeKey = typeof resource.storeKey === 'string' ? resource.storeKey : '';"
			);
			writer.writeLine(
				"const rawSegment = storeKey.split('/').pop() || '';"
			);
			writer.writeLine(
				`const resourceName = typeof resource.name === 'string' && resource.name.length > 0 ? resource.name : ${JSON.stringify(
					descriptor.name
				)};`
			);
			writer.writeLine(
				`const resourceSegment = ${segmentFunctionName}(rawSegment.length > 0 ? rawSegment : resourceName, 'resource');`
			);
			writer.writeLine(
				`const featureSegment = ${segmentFunctionName}(${featureIdentifier}, 'feature');`
			);
			writer.writeLine(
				'const runtimeNamespace = typeof WPK_NAMESPACE === "string" ? WPK_NAMESPACE : "";'
			);
			writer.writeLine(
				'return `${runtimeNamespace}/${resourceSegment}/${featureSegment}`;'
			);
		},
	});

	sourceFile.addFunction({
		name: names.componentIdentifier,
		isExported: true,
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine(
				`const runtime = ${names.wpkernelSymbol}.getUIRuntime();`
			);
			writer.writeLine('if (!runtime) {');
			writer.indent(() => {
				writer.writeLine('return null;');
			});
			writer.writeLine('}');
			writer.blankLine();
			writer.writeLine('return (');
			writer.indent(() => {
				writer.writeLine(
					`<WPKernelScreen resource={${names.resourceSymbol}} feature=${JSON.stringify(
						interactivityFeature
					)} runtime={runtime}>`
				);
				writer.indent(() => {
					writer.writeLine(`<${names.componentIdentifier}List />`);
				});
				writer.writeLine('</WPKernelScreen>');
			});
			writer.writeLine(');');
		},
	});

	const contents = sourceFile.getFullText();

	await context.workspace.write(paths.generatedScreenPath, contents, {
		ensureDir: true,
	});

	output.queueWrite({
		file: paths.generatedScreenPath,
		contents,
	});
}

function ensureAdminDataViews(
	descriptor: ResourceDescriptor,
	reporter: Reporter | undefined
): AdminDataViewsWithInteractivity | null {
	if (!descriptor.dataviews) {
		reporter?.debug(
			'admin screen builder: missing dataviews for resource',
			{ resource: descriptor.key }
		);
		return null;
	}
	return descriptor.dataviews as AdminDataViewsWithInteractivity;
}

export function resolveAdminNames(
	descriptor: ResourceDescriptor,
	componentMeta: ReturnType<typeof resolveAdminScreenComponentMetadata>
) {
	const dataViewConfigIdentifier = `${toCamelCase(
		descriptor.name
	)}DataViewConfig`;
	const componentIdentifierCamel = toCamelCase(componentMeta.identifier);
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

export function resolveAdminPaths(
	plan: IRUiResourcePlan,
	descriptor: AdminScreenResourceDescriptor,
	componentMeta: ReturnType<typeof resolveAdminScreenComponentMetadata>
) {
	const menuSlug = resolveMenuSlug(descriptor);
	const directory =
		menuSlug && menuSlug.length > 0 ? menuSlug : descriptor.name;
	const appliedRoot = path.posix.dirname(plan.appDir);
	const generatedRoot = plan.generatedAppDir
		? path.posix.dirname(plan.generatedAppDir)
		: appliedRoot;

	// Flattened structure: .wpk/generate/ui/app/<slug>/page.tsx
	const generatedScreenPath = path.join(
		generatedRoot,
		directory,
		...componentMeta.directories,
		`${componentMeta.fileName}.tsx`
	);
	const appliedScreenPath = path.join(
		appliedRoot,
		directory,
		...componentMeta.directories,
		`${componentMeta.fileName}.tsx`
	);

	return { generatedScreenPath, appliedScreenPath };
}

function resolveAdminScreenContext(options: {
	readonly uiResource: IRUiResourceDescriptor;
	readonly artifacts: IRv1['artifacts'];
	readonly resourceByName: Map<string, IRResource>;
	readonly reporter?: BuilderApplyOptions['reporter'];
}): {
	readonly resource: IRResource;
	readonly resourcePlan: IRv1['artifacts']['resources'][string];
	readonly uiPlan: IRUiResourcePlan;
} | null {
	const { uiResource, artifacts, resourceByName, reporter } = options;
	const resource = resourceByName.get(uiResource.resource);
	const resourcePlan = resource
		? artifacts.resources[resource.id]
		: undefined;
	const uiPlan = resource ? artifacts.uiResources[resource.id] : undefined;

	if (!resource || !resourcePlan || !uiPlan || !uiPlan.generatedAppDir) {
		reporter?.debug('admin screen builder: missing artifact plan', {
			resource: uiResource.resource,
		});
		return null;
	}

	return { resource, resourcePlan, uiPlan };
}

function buildRelativeImport(from: string, target: string): string {
	const relative = path.posix.relative(path.posix.dirname(from), target);
	const withoutExtension = relative.replace(
		/\.(ts|tsx|js|jsx|mjs|cjs)$/u,
		''
	);
	if (withoutExtension.startsWith('.')) {
		return withoutExtension.replace(/\\/g, '/');
	}
	return `./${withoutExtension.replace(/\\/g, '/')}`;
}

function writeFetchList(
	writer: CodeBlockWriter,
	entityType: string,
	listRoutePath: string,
	resourceName: string,
	namespace: string,
	componentIdentifier: string
): void {
	writer.writeLine(
		`const fetchList = async (query: Record<string, unknown>): Promise<ListResponse<${entityType}>> => {`
	);
	writer.indent(() => {
		writer.writeLine('const apiQuery = { status: "any", ...query };');
		writer.writeLine(
			`const path = addQueryArgs('${listRoutePath}', apiQuery);`
		);
		writer.writeLine('try {');
		writer.indent(() => {
			writer.writeLine('const { data } = (await wpkFetch({');
			writer.indent(() => {
				writer.writeLine('path,');
				writer.writeLine("method: 'GET',");
				writer.writeLine(
					`meta: { namespace: ${JSON.stringify(namespace)}, resourceName: ${JSON.stringify(resourceName)} },`
				);
			});
			writer.writeLine(
				'})) as { data: { items?: unknown[]; total?: number } | undefined };'
			);
			writer.writeLine(
				`reporter?.debug('[${componentIdentifier}List] fetchList response:', JSON.stringify(data));`
			);
			writer.writeLine(
				`const items = Array.isArray(data?.items) ? (data!.items as ${entityType}[]) : [];`
			);
			writer.writeLine(
				"const total = typeof data?.total === 'number' ? data!.total : items.length;"
			);
			writer.writeLine('return { items, total };');
		});
		writer.writeLine('} catch (error) {');
		writer.indent(() => {
			writer.writeLine(
				"const code = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code ? String((error as { code?: unknown }).code) : '';"
			);
			writer.writeLine("if (code.includes('forbidden')) {");
			writer.indent(() => {
				writer.writeLine('return { items: [], total: 0 };');
			});
			writer.writeLine('}');
			writer.writeLine('throw error;');
		});
		writer.writeLine('}');
	});
	writer.writeLine('};');
}

type AdminNames = ReturnType<typeof resolveAdminNames>;

function writeAdminScreenReturn(
	writer: CodeBlockWriter,
	pascalName: string,
	resourceName: string,
	names: AdminNames,
	entityType: string,
	quickForm: string,
	listRoutePath: string | null
): void {
	writer.writeLine('return (');
	writer.indent(() => {
		writer.writeLine('<div className="wrap">');
		writer.indent(() => {
			writeAdminHeader(writer, pascalName, resourceName);
			writer.writeLine('<hr className="wp-header-end" />');
			writer.blankLine();
			writeResourceDataViewBlock(
				writer,
				names,
				entityType,
				listRoutePath
			);
			writeQuickFormSection(writer, quickForm);
		});
		writer.writeLine('</div>');
	});
	writer.writeLine(');');
}

function writeAdminHeader(
	writer: CodeBlockWriter,
	pascalName: string,
	resourceName: string
): void {
	writer.writeLine(
		'<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>'
	);
	writer.indent(() => {
		writer.writeLine(
			`<h1 className="wp-heading-inline">${pascalName}s</h1>`
		);
		writer.writeLine(
			'<Button variant="primary" onClick={() => { setEditId(null); setFormOpen(true); }}>'
		);
		writer.indent(() => {
			writer.writeLine(`Create ${resourceName}`);
		});
		writer.writeLine('</Button>');
	});
	writer.writeLine('</div>');
}

function writeResourceDataViewBlock(
	writer: CodeBlockWriter,
	names: AdminNames,
	entityType: string,
	listRoutePath: string | null
): void {
	writer.writeLine('<ResourceDataView');
	writer.indent(() => {
		writer.writeLine('resource={resource}');
		writer.writeLine(
			`config={{ ...${names.dataViewConfigIdentifier}, actions } as unknown as ResourceDataViewConfig<${entityType}, Record<string, unknown>>}`
		);
		writer.writeLine('runtime={dataViewsRuntime}');
		writer.writeLine('key={refreshKey}');
		writer.writeLine(
			`controller={controller ? ({ ...controller, config: { ...controller.config, actions } } as ResourceDataViewController<${entityType}, Record<string, unknown>>) : undefined}`
		);
		if (listRoutePath) {
			writer.writeLine('fetchList={fetchList}');
		}
	});
	writer.writeLine('/>');
}

function writeQuickFormSection(
	writer: CodeBlockWriter,
	quickForm: string
): void {
	writer.writeLine('{isFormOpen && resource ? (');
	writer.indent(() => {
		writer.writeLine(`<${quickForm}`);
		writer.indent(() => {
			writer.writeLine('resource={resource}');
			writer.writeLine('runtime={dataViewsRuntime}');
			writer.writeLine(
				'onRefresh={() => setRefreshKey((value) => value + 1)}'
			);
			writer.writeLine(
				'onClose={() => { setFormOpen(false); setEditId(null); }}'
			);
			writer.writeLine('editId={editId}');
		});
		writer.writeLine('/>');
	});
	writer.writeLine(') : null}');
}
