import path from 'node:path';
import { createHelper } from '../../runtime';
import type { BuilderApplyOptions, BuilderHelper } from '../../runtime/types';
import { resolveAdminScreenComponentMetadata } from './admin-shared';
import { resolveAdminPaths } from './admin-screen';
import { writeAdminRuntimeStub } from './imports';
import { loadTsMorph } from './runtime-loader';
import type { SourceFile, VariableDeclarationKind } from 'ts-morph';
import type { ResourceDescriptor } from '../types';
import type {
	IRBlockPlan,
	IRResource,
	IRSurfacePlan,
	IRv1,
} from '../../ir/publicTypes';
import { toCamelCase } from '../../utils';

const DEFAULT_RUNTIME_SYMBOL = 'adminScreenRuntime';

type PlannedUiResource = {
	readonly uiResource: IRSurfacePlan;
	readonly resource: IRResource;
	readonly uiPlan: IRSurfacePlan;
	readonly resourcePlan: IRv1['artifacts']['resources'][string];
};

type ScreenImport = {
	readonly component: string;
	readonly routeConst: string;
	readonly moduleSpecifier: string;
};

export function createUiEntryBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.ts.ui-entry',
		kind: 'builder',
		dependsOn: [
			'ir.resources.core',
			'ir.capability-map.core',
			'ir.blocks.core',
			'ir.meta.core',
			'ir.artifacts.plan',
		],
		async apply({ context, input, output, reporter }) {
			const ir = input.ir as IRv1 | null;
			if (input.phase !== 'generate' || !ir?.artifacts) {
				reporter.debug('createUiEntryBuilder: missing prerequisites.', {
					phase: input.phase,
					hasIr: Boolean(ir),
					hasArtifacts: Boolean(ir?.artifacts),
				});
				return;
			}

			const plannedResources = prepareUiPlans(ir);
			if (plannedResources.length === 0) {
				await removeEntryIfPresent(ir, context, reporter);
				return;
			}

			await emitUiEntry({
				ir,
				plannedResources,
				context,
				output,
			});
		},
	});
}

function prepareUiPlans(ir: IRv1): PlannedUiResource[] {
	const surfaces: readonly IRSurfacePlan[] = Object.values(
		ir.artifacts.surfaces ?? {}
	);
	if (surfaces.length === 0) {
		return [];
	}

	const resourcesByName = new Map<string, IRResource>(
		ir.resources.map((res) => [res.name, res])
	);

	const planned: PlannedUiResource[] = [];
	for (const uiResource of surfaces) {
		const resource = resourcesByName.get(uiResource.resource);
		if (!resource) {
			continue;
		}
		const uiPlan = ir.artifacts.surfaces[resource.id];
		const resourcePlan = ir.artifacts.resources[resource.id];
		if (!uiPlan || !resourcePlan) {
			continue;
		}
		planned.push({ uiResource, resource, uiPlan, resourcePlan });
	}

	return planned;
}

async function emitUiEntry(options: {
	readonly ir: IRv1;
	readonly plannedResources: readonly PlannedUiResource[];
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderApplyOptions['output'];
}): Promise<void> {
	const { ir, plannedResources, context, output } = options;
	if (!ir.artifacts.runtime?.entry.generated) {
		context.reporter.debug(
			'createUiEntryBuilder: missing entry path in artifacts.'
		);
		return;
	}
	const entryPaths = await createEntrySource(ir);
	addBaseImports(entryPaths.sourceFile, ir, entryPaths.entryModulePath);
	addResourceImports(
		entryPaths.sourceFile,
		plannedResources,
		entryPaths.entryModulePath
	);

	const autoRegisterImport = await resolveAutoRegisterImport({
		blockPlans: ir.artifacts.blocks,
		entryModulePath: entryPaths.entryModulePath,
		workspace: context.workspace,
	});

	if (autoRegisterImport) {
		entryPaths.sourceFile.addImportDeclaration({
			moduleSpecifier: autoRegisterImport,
			namedImports: ['registerGeneratedBlocks'],
		});
	}

	const screenImports = buildScreenImports(
		plannedResources,
		entryPaths.entryModulePath
	);
	addScreenImports(entryPaths.sourceFile, screenImports);
	writeAdminScaffold(
		entryPaths.sourceFile,
		screenImports,
		entryPaths.variableKind
	);

	entryPaths.sourceFile.formatText({ ensureNewLineAtEndOfFile: true });

	const runtimePath = ir.artifacts.runtime?.runtime.generated;
	if (!runtimePath) {
		context.reporter.debug(
			'createUiEntryBuilder: missing runtime path in artifacts.'
		);
		return;
	}

	await writeAdminRuntimeStub(context.workspace, runtimePath);

	const contents = entryPaths.sourceFile.getFullText();
	await context.workspace.write(entryPaths.entryPath, contents, {
		ensureDir: true,
	});
	output.queueWrite({ file: entryPaths.entryPath, contents });
}

async function createEntrySource(ir: IRv1): Promise<{
	readonly sourceFile: SourceFile;
	readonly entryPath: string;
	readonly entryModulePath: string;
	readonly variableKind: VariableDeclarationKind;
}> {
	const {
		Project,
		VariableDeclarationKind,
		IndentationText,
		QuoteKind,
		NewLineKind,
	} = await loadTsMorph();

	const entryPath = ir.artifacts.runtime?.entry.generated ?? '';
	const entryModulePath = entryPath;
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

	return {
		sourceFile,
		entryPath,
		entryModulePath,
		variableKind: VariableDeclarationKind.Const,
	};
}

function addBaseImports(
	sourceFile: SourceFile,
	ir: IRv1,
	entryModulePath: string
): void {
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/dataviews/build-style/style.css',
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/components/build-style/style.css',
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core',
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/element',
		namedImports: ['renderToString'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wordpress/dom-ready',
		defaultImport: 'domReady',
	});

	sourceFile.addImportDeclaration({
		moduleSpecifier: buildRelativeImport(
			entryModulePath,
			ir.artifacts.runtime?.runtime.generated ?? ''
		),
		namedImports: ['capabilities'],
	});

	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/data',
		namedImports: ['configureWPKernel'],
	});
	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/ui',
		namedImports: ['WPKernelUIProvider', 'attachUIBindings'],
	});

	sourceFile.addImportDeclaration({
		moduleSpecifier: buildRelativeImport(
			entryModulePath,
			ir.artifacts.runtime!.runtime.generated
		),
		namedImports: [DEFAULT_RUNTIME_SYMBOL],
	});
}

function addResourceImports(
	sourceFile: SourceFile,
	plannedResources: readonly PlannedUiResource[],
	entryModulePath: string
): void {
	for (const { resource, resourcePlan } of plannedResources) {
		const resourceName = toCamelCase(resource.name);
		sourceFile.addImportDeclaration({
			moduleSpecifier: buildRelativeImport(
				entryModulePath,
				resourcePlan.modulePath
			),
			namedImports: [resourceName],
		});
	}
}

function buildScreenImports(
	plannedResources: readonly PlannedUiResource[],
	entryModulePath: string
): ScreenImport[] {
	return plannedResources.map(({ uiResource, resource, uiPlan }) => {
		const descriptor: ResourceDescriptor = {
			key: uiResource.resource,
			name: resource.name,
			resource,
		};

		const metadata = resolveAdminScreenComponentMetadata(descriptor);
		const routeConst = `${toCamelCase(metadata.identifier)}Route`;
		const { appliedScreenPath } = resolveAdminPaths(uiPlan, metadata);
		const moduleSpecifier = buildRelativeImport(
			entryModulePath,
			appliedScreenPath
		);

		return {
			component: metadata.identifier,
			routeConst,
			moduleSpecifier,
		};
	});
}

function addScreenImports(
	sourceFile: SourceFile,
	screenImports: readonly ScreenImport[]
): void {
	for (const screenImport of screenImports) {
		sourceFile.addImportDeclaration({
			moduleSpecifier: screenImport.moduleSpecifier,
			namedImports: [
				{ name: screenImport.component },
				{ name: screenImport.routeConst },
			],
		});
	}
}

function writeAdminScaffold(
	sourceFile: SourceFile,
	screenImports: readonly ScreenImport[],
	variableKind: VariableDeclarationKind
): void {
	sourceFile.addTypeAlias({
		name: 'WPKInstance',
		type: 'ReturnType<typeof configureWPKernel>',
	});

	sourceFile.addInterface({
		name: 'KernelGlobal',
		properties: [
			{
				name: '__WP_KERNEL_ACTION_RUNTIME__',
				hasQuestionToken: true,
				type: `{ capability?: typeof capabilities; }`,
			},
			{
				name: 'getWPData',
				hasQuestionToken: true,
				type: '() => unknown',
			},
		],
	});

	sourceFile.addVariableStatement({
		declarationKind: variableKind,
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
					writer.write('} as const');
				},
			},
		],
	});

	sourceFile.addTypeAlias({
		name: 'AdminScreenName',
		type: 'keyof typeof adminScreens',
	});

	sourceFile.addFunction({
		name: 'mountAdminScreen',
		statements: (writer) => {
			writer.writeLine(
				"const container = document.getElementById('wpkernel-admin-screen');"
			);
			writer.writeLine('if (!container) return;');
			writer.blankLine();
			writer.writeLine('const dataset = container.dataset ?? {};');
			writer.writeLine(
				`const screenKey = (container.getAttribute('data-wpkernel-page') ?? dataset.wpkernelPage ?? '') as AdminScreenName;`
			);
			writer.writeLine(
				`const capabilitiesJson = dataset.wpkernelCapabilities ?? '';`
			);
			writer.writeLine(
				`const rawCapabilities = capabilitiesJson.length > 0 ? capabilitiesJson : undefined;`
			);
			writer.writeLine(
				`const capability = rawCapabilities ? JSON.parse(rawCapabilities) : capabilities;`
			);
			writer.writeLine('const component = adminScreens[screenKey];');
			writer.writeLine('if (!component) return;');
			writer.blankLine();
			writer.writeLine(
				'const bindingTarget = container.querySelector('.concat(
					"`[data-wp-interactive='wpkernel/admin-screen']`",
					');'
				)
			);
			writer.writeLine('if (!bindingTarget) return;');
			writer.blankLine();
			writer.writeLine('const bootstrap = async () => {');
			writer.indent(() => {
				writer.writeLine(
					`const dataStore = (globalThis as KernelGlobal).__WP_KERNEL_ACTION_RUNTIME__ ?? configureWPKernel({ capability });`
				);
				writer.writeLine(
					`const page = renderToString(<component adminStore={dataStore} />);`
				);
				writer.writeLine(
					"bindingTarget.innerHTML = `<div data-wp-interactive='wpkernel/admin-screen' data-wp-context='{\"wpkernel/admin-screen\": {}}'>${page}</div>`;"
				);
				writer.writeLine(
					'await attachUIBindings(bindingTarget, { wpkernel: dataStore }, {});'
				);
			});
			writer.writeLine('};');
			writer.blankLine();
			writer.writeLine('if (typeof domReady === "function") {');
			writer.indent(() => {
				writer.writeLine('domReady(bootstrap);');
			});
			writer.writeLine('} else {');
			writer.indent(() => writer.writeLine('bootstrap();'));
			writer.writeLine('}');
		},
	});

	sourceFile.addFunction({
		name: 'renderRoot',
		isExported: true,
		statements: (writer) => {
			writer.writeLine("if (typeof document === 'undefined') return;");
			writer.writeLine('mountAdminScreen();');
		},
	});

	sourceFile.addVariableStatement({
		declarationKind: variableKind,
		declarations: [
			{
				name: 'globalAny',
				initializer: 'globalThis as unknown as KernelGlobal',
			},
		],
	});

	sourceFile.addStatements((writer) => {
		writer.writeLine(
			'globalAny.__WP_KERNEL_ACTION_RUNTIME__ ??= configureWPKernel({ capability: capabilities });'
		);
		writer.writeLine(
			'globalAny.__WP_KERNEL_ACTION_RUNTIME__.capability = capabilities;'
		);
		writer.writeLine('renderRoot();');
	});
}

async function resolveAutoRegisterImport(options: {
	readonly blockPlans: Record<string, IRBlockPlan>;
	readonly entryModulePath: string;
	readonly workspace: BuilderApplyOptions['context']['workspace'];
}): Promise<string | null> {
	const roots = resolveBlocksRoots(options.blockPlans);
	let candidate: string | null = null;
	if (roots.generated) {
		candidate = path.posix.join(roots.generated, 'auto-register.ts');
	} else if (roots.applied) {
		candidate = path.posix.join(roots.applied, 'auto-register.ts');
	}

	if (!candidate) {
		return null;
	}

	const exists = await options.workspace.exists(candidate);
	if (!exists) {
		return null;
	}

	const target = roots.applied
		? path.posix.join(roots.applied, 'auto-register.ts')
		: candidate;

	return buildRelativeImport(options.entryModulePath, target);
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

async function removeEntryIfPresent(
	ir: IRv1,
	context: BuilderApplyOptions['context'],
	reporter: BuilderApplyOptions['reporter']
): Promise<void> {
	const entryPath = ir.artifacts.runtime?.entry.generated;
	if (!entryPath) {
		return;
	}
	if (await context.workspace.exists(entryPath)) {
		await context.workspace.rm(entryPath);
		reporter?.debug(
			'createUiEntryBuilder: removed UI entry (no admin screens).'
		);
	}
}

function resolveBlocksRoots(plans: Record<string, IRBlockPlan>): {
	generated?: string;
	applied?: string;
} {
	const entries = Object.values(plans);
	const [first] = entries;
	if (!first) {
		return {};
	}

	const firstWithGenerated = entries.find((plan) => plan.generatedDir);
	const generated = firstWithGenerated
		? path.posix.dirname(firstWithGenerated.generatedDir as string)
		: undefined;
	const applied = path.posix.dirname(first.appliedDir);

	return { generated, applied };
}
