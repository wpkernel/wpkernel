import path from 'path';
import { createHelper } from '../../runtime';
import type { BuilderApplyOptions } from '../../runtime/types';
import { buildTsMorphAccessor, writeAdminRuntimeStub } from './imports';
import {
	resolveInteractivityFeature,
	resolveAdminScreenComponentMetadata,
	type AdminDataViewsWithInteractivity,
	type AdminScreenResourceDescriptor,
} from './admin-shared';
import type { IRResource, IRSurfacePlan } from '../../ir/publicTypes';
import type { CodeBlockWriter } from 'ts-morph';
import { toCamelCase } from '../../utils';

export function createDataViewInteractivityFixtureBuilder() {
	return createHelper({
		key: 'builder.generate.ts.dataviewInteractivityFixture.core',
		kind: 'builder',
		dependsOn: ['ir.artifacts.plan', 'ir.ui.core', 'ir.resources.core'],
		async apply({ input, context, output, reporter }: BuilderApplyOptions) {
			if (input.phase !== 'generate' || !input.ir?.artifacts) {
				reporter?.debug(
					'interactivity fixture builder: prerequisites missing',
					{
						phase: input.phase,
						hasIr: Boolean(input.ir),
						hasArtifacts: Boolean(input.ir?.artifacts),
					}
				);
				return;
			}

			await generateInteractivityFixtures({
				ir: input.ir,
				context,
				output,
				reporter,
			});
		},
	});
}

/* eslint-disable complexity */
async function generateInteractivityFixtures(options: {
	readonly ir: NonNullable<BuilderApplyOptions['input']['ir']>;
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderApplyOptions['output'];
	readonly reporter?: BuilderApplyOptions['reporter'];
}) {
	const { ir, context, output, reporter } = options;
	const surfaces = Object.values(ir.artifacts.surfaces ?? {});
	if (surfaces.length === 0) {
		reporter?.debug('interactivity fixture builder: no UI resources.');
		return;
	}
	const runtimePath = ir.artifacts.runtime?.runtime.generated;
	if (!runtimePath) {
		reporter?.debug(
			'interactivity fixture builder: missing runtime path in artifacts.'
		);
		return;
	}

	const { project, VariableDeclarationKind } = await buildTsMorphAccessor({
		workspace: context.workspace,
	});
	const resourceByName = new Map<string, IRResource>(
		ir.resources.map((resource) => [resource.name, resource])
	);
	for (const uiResource of surfaces) {
		const validated = validateInteractivityInputs({
			uiResource,
			ir,
			resourceByName,
			reporter,
		});
		if (!validated) {
			continue;
		}

		if (!uiResource.generatedAppDir || !uiResource.appDir) {
			reporter?.debug(
				'interactivity fixture builder: missing surface plan paths',
				{ resource: validated.resource.name }
			);
			continue;
		}

		await emitFixture({
			ir,
			resource: validated.resource,
			uiResource,
			resourcePlan: validated.resourcePlan,
			generatedRoot: uiResource.generatedAppDir ?? '',
			appliedRoot: uiResource.appDir ?? '',
			project,
			VariableDeclarationKind,
			context,
			output,
			reporter,
			runtimePath,
		});
	}
}
/* eslint-enable complexity */

function validateInteractivityInputs(options: {
	readonly uiResource: IRSurfacePlan;
	readonly ir: NonNullable<BuilderApplyOptions['input']['ir']>;
	readonly resourceByName: Map<string, IRResource>;
	readonly reporter?: BuilderApplyOptions['reporter'];
}): { resource: IRResource; resourcePlan: { modulePath: string } } | null {
	const { uiResource, ir, resourceByName, reporter } = options;
	const resource = resourceByName.get(uiResource.resource);
	if (!resource) {
		reporter?.warn(
			'builder.generate.ts.dataviewInteractivityFixture.missing-resource',
			{ resource: uiResource.resource }
		);
		return null;
	}

	const resourcePlan = ir.artifacts.resources[resource.id];
	if (!resourcePlan?.modulePath) {
		reporter?.debug('interactivity fixture builder: missing plan/data', {
			resource: resource.name,
		});
		return null;
	}

	return { resource, resourcePlan };
}

async function emitFixture(options: {
	readonly ir: NonNullable<BuilderApplyOptions['input']['ir']>;
	readonly resource: IRResource;
	readonly uiResource: IRSurfacePlan;
	readonly resourcePlan: { modulePath: string };
	readonly generatedRoot: string;
	readonly appliedRoot: string;
	readonly runtimePath: string;
	readonly project: Awaited<
		ReturnType<typeof buildTsMorphAccessor>
	>['project'];
	readonly VariableDeclarationKind: Awaited<
		ReturnType<typeof buildTsMorphAccessor>
	>['VariableDeclarationKind'];
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderApplyOptions['output'];
	readonly reporter?: BuilderApplyOptions['reporter'];
}) {
	const {
		ir,
		resource,
		uiResource,
		resourcePlan,
		generatedRoot,
		appliedRoot,
		runtimePath,
		project,
		VariableDeclarationKind,
		context,
		output,
		reporter,
	} = options;

	const descriptor: AdminScreenResourceDescriptor = {
		key: uiResource.resource,
		name: resource.name,
		namespace: ir.meta.namespace,
		resource,
		menu: uiResource.menu,
	};

	const dataviews = descriptor.dataviews as AdminDataViewsWithInteractivity;
	const screenConfig = dataviews?.screen ?? {};
	const { identifier: componentIdentifier } =
		resolveAdminScreenComponentMetadata(descriptor);
	const componentIdentifierCamel = toCamelCase(componentIdentifier);
	const resourceSymbol =
		screenConfig.resourceSymbol ?? toCamelCase(descriptor.name);
	const wpkernelSymbol = screenConfig.wpkernelSymbol ?? 'adminScreenRuntime';
	const interactivityFeature = resolveInteractivityFeature(descriptor);

	const generatedFixturePath = path.join(
		generatedRoot,
		'fixtures',
		'interactivity',
		`${descriptor.key}.ts`
	);
	const appliedFixturePath = path.join(
		appliedRoot,
		'fixtures',
		'interactivity',
		`${descriptor.key}.ts`
	);

	const resourceImport = buildRelativeImport(
		appliedFixturePath,
		resourcePlan.modulePath
	);
	const wpkernelImport = buildRelativeImport(appliedFixturePath, runtimePath);
	if (!resourceImport || !wpkernelImport) {
		reporter?.debug('interactivity fixture builder: missing imports', {
			resource: resource.name,
		});
		return;
	}

	await writeAdminRuntimeStub(context.workspace, runtimePath);

	const sourceFile = project.createSourceFile(generatedFixturePath, '', {
		overwrite: true,
	});

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
		moduleSpecifier: '@wpkernel/core',
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
				initializer: (writer: CodeBlockWriter) => {
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
				initializer: (writer: CodeBlockWriter) => {
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
		returnType: 'string',
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine(
				`const resource = ${resourceSymbol} as { storeKey?: string; name?: string };`
			);
			writer.writeLine(
				"const storeKey = typeof resource.storeKey === 'string' ? resource.storeKey : '';"
			);
			writer.writeLine("const rawSegment = storeKey.split('/').pop();");
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
		statements: (writer: CodeBlockWriter) => {
			writer.writeLine(
				`const actions = ${resourceSymbol}.ui?.admin?.dataviews?.actions;`
			);
			writer.writeLine('if (!Array.isArray(actions)) {');
			writer.indent(() => {
				writer.writeLine('return undefined;');
			});
			writer.writeLine('}');
			writer.writeLine('const bindings: InteractionActionsRecord = {};');
			writer.writeLine('for (const entry of actions) {');
			writer.indent(() => {
				writer.writeLine('if (!entry || typeof entry !== "object") {');
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
		statements: (writer: CodeBlockWriter) => {
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
				writer.writeLine("throw new WPKernelError('DeveloperError', {");
				writer.indent(() => {
					writer.writeLine("message: 'UI runtime not attached.',");
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
		statements: (writer: CodeBlockWriter) => {
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
				writer.writeLine(`resourceName: ${resourceNameIdentifier},`);
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

	sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
	const contents = sourceFile.getFullText();

	await context.workspace.write(generatedFixturePath, contents, {
		ensureDir: true,
	});
	output.queueWrite({ file: generatedFixturePath, contents });
}

function buildRelativeImport(
	from: string,
	target: string | undefined
): string | null {
	if (!target) {
		return null;
	}
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
