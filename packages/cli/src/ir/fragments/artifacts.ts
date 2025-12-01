import path from 'node:path';
import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import type {
	IRArtifactsPlan,
	IRBlock,
	IRControllerPlan,
	IRSchema,
	IRSchemaPlan,
	IRResourceTsPlan,
	IRPhpArtifactsPlan,
	IRPhpBlockPlan,
	IRPhpAutoloadPlan,
	IRPhpControllerPlan,
} from '../publicTypes';

const ARTIFACTS_FRAGMENT_KEY = 'ir.artifacts.plan';

export function createArtifactsFragment(): IrFragment {
	return createHelper({
		key: ARTIFACTS_FRAGMENT_KEY,
		kind: 'fragment',
		dependsOn: [
			'ir.layout.core',
			'ir.meta.core',
			'ir.resources.core',
			'ir.blocks.core',
			'ir.schemas.core',
			'ir.ui.resources',
		],
		async apply({ input, output }: IrFragmentApplyOptions): Promise<void> {
			if (!input.draft.layout || !input.draft.php) {
				throw new Error(
					'Artifacts fragment requires layout and php to be resolved.'
				);
			}

			const artifacts: IRArtifactsPlan = {
				pluginLoader: buildPluginLoaderPlan(input),
				controllers: buildControllerPlans(input),
				resources: buildResourcePlans(input),
				uiResources: buildUiResourcePlans(input),
				blocks: buildBlockPlans(input),
				schemas: buildSchemaPlans(input),
				js: buildJsPlans(input),
				php: buildPhpPlans(input),
			};

			output.assign({ artifacts });
		},
	});
}

function buildPhpPlans(
	input: IrFragmentApplyOptions['input']
): IRPhpArtifactsPlan | undefined {
	const { layout, php } = input.draft;
	if (!layout || !php || !hasLayoutId(layout, 'php.generated')) {
		return undefined;
	}

	const phpGenerated = layout.resolve('php.generated');
	const blocksManifestPath =
		(layout.all['blocks.manifest'] ?? layout.all['blocks.manifest.applied'])
			? layout.resolve('blocks.manifest')
			: path.posix.join(phpGenerated, 'build', 'blocks-manifest.php');
	const blocksRegistrarPath = path.posix.join(
		phpGenerated,
		'Blocks',
		'Register.php'
	);

	const blockPlans: Record<string, IRPhpBlockPlan> = Object.create(null);
	for (const [blockId, plan] of Object.entries(
		buildBlockPlans(input) ?? {}
	)) {
		if (plan.mode !== 'ssr') {
			continue;
		}
		blockPlans[blockId] = {
			mode: plan.mode,
			manifestPath: path.posix.join(
				path.posix.dirname(blocksManifestPath),
				`${path.posix.basename(plan.appliedDir)}/block.json`
			),
			registrarPath: blocksRegistrarPath,
			renderPath: plan.phpRenderPath,
		};
	}

	const controllerPlans: Record<string, IRPhpControllerPlan> =
		Object.create(null);
	const controllers = buildControllerPlans(input);
	for (const [resourceId, controller] of Object.entries(controllers)) {
		controllerPlans[resourceId] = {
			className: controller.className,
			namespace: controller.namespace,
			appliedPath: controller.appliedPath,
			generatedPath: controller.generatedPath,
		};
	}

	return {
		pluginLoaderPath: layout.resolve('plugin.loader'),
		autoload: resolvePhpAutoloadPlan(phpGenerated),
		blocksManifestPath,
		blocksRegistrarPath,
		blocks: blockPlans,
		controllers: controllerPlans,
		debugUiPath: layout.resolve('debug.ui'),
	};
}

function resolvePhpAutoloadPlan(phpGenerated: string): IRPhpAutoloadPlan {
	// Default to require_once for now; composer detection can be added if needed.
	const composerAutoload = path.posix.join(
		path.posix.dirname(path.posix.dirname(phpGenerated)),
		'vendor',
		'autoload.php'
	);

	return {
		strategy: 'composer',
		autoloadPath: composerAutoload,
	};
}

function buildJsPlans(
	input: IrFragmentApplyOptions['input']
): IRArtifactsPlan['js'] {
	const layout = input.draft.layout;
	if (!layout) {
		return undefined;
	}

	const jsGenerated = layout.resolve('js.generated');
	const uiGenerated = layout.resolve('ui.generated');
	const blocksGenerated = layout.resolve('blocks.generated');

	return {
		capabilities: {
			modulePath: path.posix.join(jsGenerated, 'capabilities.ts'),
			declarationPath: path.posix.join(jsGenerated, 'capabilities.d.ts'),
		},
		index: {
			modulePath: path.posix.join(jsGenerated, 'index.ts'),
			declarationPath: path.posix.join(jsGenerated, 'index.d.ts'),
		},
		uiRuntimePath: path.posix.join(uiGenerated, 'runtime.ts'),
		uiEntryPath: path.posix.join(uiGenerated, 'index.tsx'),
		blocksRegistrarPath: path.posix.join(
			blocksGenerated,
			'auto-register.ts'
		),
	};
}

function buildPluginLoaderPlan(
	input: IrFragmentApplyOptions['input']
): IRArtifactsPlan['pluginLoader'] {
	if (!hasLayoutId(input.draft.layout, 'plugin.loader')) {
		return undefined;
	}
	const loaderPath = input.draft.layout!.resolve('plugin.loader');

	return {
		id: 'plugin.loader',
		absolutePath: loaderPath,
		importSpecifier: undefined,
	};
}

function buildControllerPlans(
	input: IrFragmentApplyOptions['input']
): Record<string, IRControllerPlan> {
	const { resources, layout, php } = input.draft;
	if (!layout || !php || !hasLayoutId(layout, 'controllers.applied')) {
		return Object.create(null);
	}

	const appliedRoot = layout.resolve('controllers.applied');
	const generatedRoot = layout.resolve('php.generated');

	return resources.reduce<Record<string, IRControllerPlan>>(
		(acc, resource) => {
			const className = `${toPascalCase(resource.name)}Controller`;
			acc[resource.id] = {
				appliedPath: path.posix.join(appliedRoot, className + '.php'),
				generatedPath: path.posix.join(
					generatedRoot,
					'Rest',
					className + '.php'
				),
				className,
				namespace: `${php.namespace}\\Rest`,
			};
			return acc;
		},
		Object.create(null)
	);
}

function buildResourcePlans(
	input: IrFragmentApplyOptions['input']
): IRArtifactsPlan['resources'] {
	if (!input.draft.layout) {
		throw new Error('Artifacts fragment requires layout for resources.');
	}

	const resourcesRoot = input.draft.layout.resolve('ui.resources.applied');
	const typesRoot = path.posix.join(resourcesRoot, '..', 'types');
	const schemaPlans = buildSchemaPlans(input);

	return input.draft.resources.reduce<IRArtifactsPlan['resources']>(
		(acc, resource) => {
			const modulePath = path.posix.join(
				resourcesRoot,
				`${resource.name}.ts`
			);
			const typePlan = resolveResourceTypePlan(
				resource,
				schemaPlans,
				typesRoot
			);
			acc[resource.id] = {
				modulePath,
				typeDefPath: typePlan.typeDefPath,
				typeSource: typePlan.typeSource,
				schemaKey: typePlan.schemaKey,
			};
			return acc;
		},
		Object.create(null)
	);
}

function buildUiResourcePlans(
	input: IrFragmentApplyOptions['input']
): IRArtifactsPlan['uiResources'] {
	if (!input.draft.layout) {
		throw new Error('Artifacts fragment requires layout for UI plans.');
	}

	const uiResources = input.draft.ui?.resources ?? [];
	if (uiResources.length === 0) {
		return Object.create(null);
	}

	const uiAppliedRoot = input.draft.layout.resolve('ui.applied');
	const uiGeneratedRoot = input.draft.layout.resolve('ui.generated');
	const resourcesByName = new Map(
		input.draft.resources.map((resource) => [resource.name, resource])
	);

	return uiResources.reduce<IRArtifactsPlan['uiResources']>(
		(acc, uiResource) => {
			const resource = resourcesByName.get(uiResource.resource);
			if (!resource) {
				return acc;
			}
			const slug = resource.name;
			const appDir = path.posix.join(uiAppliedRoot, 'app', slug);
			const generatedAppDir = path.posix.join(
				uiGeneratedRoot,
				'app',
				slug
			);
			acc[resource.id] = {
				appDir,
				generatedAppDir,
				pagePath: path.posix.join(appDir, 'page.tsx'),
				formPath: path.posix.join(appDir, 'form.tsx'),
				configPath: path.posix.join(appDir, 'config.tsx'),
			};
			return acc;
		},
		Object.create(null)
	);
}

function buildBlockPlans(
	input: IrFragmentApplyOptions['input']
): IRArtifactsPlan['blocks'] {
	if (!input.draft.layout) {
		throw new Error('Artifacts fragment requires layout for blocks.');
	}
	const appliedRoot = input.draft.layout.resolve('blocks.applied');
	const generatedRoot = input.draft.layout.resolve('blocks.generated');

	return input.draft.blocks.reduce<
		Record<string, IRArtifactsPlan['blocks'][string]>
	>((acc, block) => {
		acc[block.id] = buildBlockPlan(block, appliedRoot, generatedRoot);
		return acc;
	}, Object.create(null));
}

function buildBlockPlan(
	block: IRBlock,
	appliedRoot: string,
	generatedRoot?: string | null
): IRArtifactsPlan['blocks'][string] {
	const dirName = block.directory || block.key;
	const appliedDir = path.posix.join(appliedRoot, dirName);
	return {
		key: block.key,
		appliedDir,
		generatedDir: generatedRoot
			? path.posix.join(generatedRoot, dirName)
			: undefined,
		jsonPath: path.posix.join(appliedDir, 'block.json'),
		tsEntry: path.posix.join(appliedDir, 'index.tsx'),
		tsView: path.posix.join(appliedDir, 'view.tsx'),
		tsHelper: path.posix.join(appliedDir, 'view.ts'),
		phpRenderPath: block.hasRender
			? path.posix.join(appliedDir, 'render.php')
			: undefined,
		mode: block.hasRender ? 'ssr' : 'js',
	};
}

function buildSchemaPlans(
	input: IrFragmentApplyOptions['input']
): IRArtifactsPlan['schemas'] {
	if (!input.draft.layout) {
		throw new Error('Artifacts fragment requires layout for schemas.');
	}
	const typesRoot = path.posix.join(
		input.draft.layout.resolve('ui.resources.applied'),
		'..',
		'types'
	);
	return input.draft.schemas.reduce<Record<string, IRSchemaPlan>>(
		(acc, schema) => {
			acc[schema.id] = buildSchemaPlan(schema, typesRoot);
			return acc;
		},
		Object.create(null)
	);
}

function buildSchemaPlan(schema: IRSchema, typesRoot: string): IRSchemaPlan {
	const typeName = schema.key;
	return {
		typeDefPath: path.posix.join(typesRoot, `${typeName}.d.ts`),
	};
}

function resolveResourceTypePlan(
	resource: { schemaKey: string; name: string },
	schemas: Record<string, IRSchemaPlan>,
	typesRoot: string
): Pick<IRResourceTsPlan, 'typeDefPath' | 'typeSource' | 'schemaKey'> {
	const schemaPlan = schemas[resource.schemaKey];
	if (schemaPlan) {
		return {
			typeDefPath: schemaPlan.typeDefPath,
			typeSource: 'schema',
			schemaKey: resource.schemaKey,
		};
	}

	return {
		typeDefPath: path.posix.join(typesRoot, `${resource.name}.d.ts`),
		typeSource: 'inferred',
		schemaKey: undefined,
	};
}

function hasLayoutId(
	layout: IrFragmentApplyOptions['input']['draft']['layout'],
	id: string
): boolean {
	if (!layout) {
		return false;
	}
	return Boolean(layout.all[id] || layout.all[`${id}.applied`]);
}

function toPascalCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join('');
}
