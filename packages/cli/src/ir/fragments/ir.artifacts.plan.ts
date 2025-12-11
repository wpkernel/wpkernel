/**
 * IR Artifacts Fragment
 *
 * Builds a consolidated {@link IRArtifactsPlan} from lower-level IR drafts:
 * layout, resources, blocks, schemas, UI, and PHP.
 *
 * This fragment:
 * - Depends on core IR fragments (layout, meta, resources, blocks, schemas, UI)
 * - Validates core draft invariants once at the fragment entrypoint
 * - Normalises file-system paths for TS/JS runtime, PHP artifacts, and bundler
 * - Provides a single `artifacts` object attached to the IR output
 *
 * The resulting artifacts plan is the main entrypoint for:
 * - JS/TS builders (runtime, UI, bundler)
 * - PHP builders (controllers, block renderers, autoload)
 * - Higher-level orchestration that needs stable, deterministic paths
 */
import path from 'node:path';
import { WPKernelError, WPK_NAMESPACE } from '@wpkernel/core/contracts';
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
import { toPascalCase } from '../../utils';

const ARTIFACTS_FRAGMENT_KEY = 'ir.artifacts.plan';

type LayoutDraft = NonNullable<
	IrFragmentApplyOptions['input']['draft']['layout']
>;
type PhpDraft = NonNullable<IrFragmentApplyOptions['input']['draft']['php']>;
type ResourcesDraft = IrFragmentApplyOptions['input']['draft']['resources'];
type BlocksDraft = IrFragmentApplyOptions['input']['draft']['blocks'];
type SchemasDraft = IrFragmentApplyOptions['input']['draft']['schemas'];
type UiDraft = IrFragmentApplyOptions['input']['draft']['ui'];

/**
 * Creates the `ir.artifacts.plan` fragment.
 *
 * This fragment:
 * - Depends on core IR fragments (layout, meta, resources, blocks, schemas, UI)
 * - Asserts that `layout` and `php` drafts are available up-front
 * - Builds a consolidated {@link IRArtifactsPlan} from draft inputs
 * - Attaches the resulting `artifacts` object to the IR output
 *
 * All downstream helpers receive deterministic inputs (non-null layout/php),
 * so they only validate the parts they uniquely care about (e.g. specific
 * layout ids), rather than re-checking the same invariants.
 *
 * @returns An {@link IrFragment} that produces the artifacts plan.
 */
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
			'ir.ui.core',
		],
		async apply({ input, output }: IrFragmentApplyOptions): Promise<void> {
			const { layout, php, resources, blocks, schemas, ui } = input.draft;

			if (!layout || !php) {
				throw new WPKernelError('EnvironmentalError', {
					message:
						'Artifacts fragment requires layout and php drafts; CLI layout resolution failed.',
					context: {
						subsystem: 'cli.artifacts',
						namespace: WPK_NAMESPACE,
						fragment: ARTIFACTS_FRAGMENT_KEY,
						missing: {
							layout: !layout,
							php: !php,
						},
					},
				});
			}

			// Build shared sub-plans once so we can reuse them (e.g. PHP reuses
			// controllers/blocks) without recomputing or revalidating.
			const controllerPlans = buildControllerPlans(
				resources,
				layout,
				php
			);
			const blockPlans = buildBlockPlans(blocks, layout);
			const blockRoots = buildBlockRoots(layout);
			const schemaPlans = buildSchemaPlans(schemas, layout);

			const runtimePlans = buildRuntimePlans(layout, ui);

			const artifacts: IRArtifactsPlan = {
				pluginLoader: buildPluginLoaderPlan(layout),
				controllers: controllerPlans,
				resources: buildResourcePlans(resources, layout, schemaPlans),
				surfaces: buildSurfacePlans(resources, layout, ui),
				blocks: blockPlans,
				blockRoots,
				schemas: schemaPlans,
				runtime: runtimePlans,
				bundler: buildBundlerPlan(layout, runtimePlans),
				php: buildPhpPlans(layout, blockPlans, controllerPlans),
				plan: buildPlanArtifacts(layout),
			};

			output.assign({ artifacts });
		},
	});
}

/**
 * Builds the plugin loader plan.
 *
 * Describes the main entrypoint that boots the plugin in WordPress, typically
 * a file that wires up hooks and initialisation logic.
 *
 * Requires the `plugin.loader` layout id to be present; if it is missing, the
 * layout manifest is inconsistent with the Golden Path.
 *
 * @param layout - Resolved layout draft.
 * @returns The plugin loader portion of the artifacts plan.
 */
function buildPluginLoaderPlan(
	layout: LayoutDraft
): IRArtifactsPlan['pluginLoader'] {
	const loaderPath = layout.resolve('plugin.loader');

	return {
		id: 'plugin.loader',
		absolutePath: loaderPath,
		importSpecifier: undefined,
	};
}

/**
 * Builds REST controller plans for each resource.
 *
 * For each resource, this constructs:
 * - A PHP controller class name (e.g. `PostsController`)
 * - Applied and generated file paths for the controller
 * - A `Rest` sub-namespace under the PHP namespace
 *
 * If `controllers.applied` is not available in the layout, controllers are
 * treated as optional and an empty map is returned.
 *
 * @param resources - IR resources collection.
 * @param layout    - Resolved layout draft.
 * @param php       - PHP draft containing namespace information.
 * @returns A map of resource id to {@link IRControllerPlan}.
 */
function buildControllerPlans(
	resources: ResourcesDraft,
	layout: LayoutDraft,
	php: PhpDraft
): Record<string, IRControllerPlan> {
	if (!layout.all['controllers.applied']) {
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

/**
 * Builds the runtime artifacts plan for the JS/TS side.
 *
 * This includes:
 * - Generated and applied entry module paths
 * - Generated and applied runtime module paths
 * - The blocks registrar module path for client-side block registration
 * - An optional UI loader module exposed from the UI draft
 *
 * Layout and PHP invariants are already enforced at the fragment entrypoint;
 * this helper focuses solely on runtime-related layout ids.
 *
 * @param layout - Resolved layout draft.
 * @param ui     - UI draft (may be undefined if no UI resources are declared).
 * @returns The runtime artifacts plan.
 */
function buildRuntimePlans(
	layout: LayoutDraft,
	ui: UiDraft
): IRArtifactsPlan['runtime'] {
	const blocksGenerated = layout.resolve('blocks.generated');

	return {
		entry: {
			generated: layout.resolve('entry.generated'),
			applied: layout.resolve('entry.applied'),
		},
		runtime: {
			generated: layout.resolve('runtime.generated'),
			applied: layout.resolve('runtime.applied'),
		},
		blocksRegistrarPath: path.posix.join(
			blocksGenerated,
			'auto-register.ts'
		),
		uiLoader: ui?.loader,
	};
}

/**
 * Builds the bundler artifacts plan.
 *
 * Exposes stable locations for:
 * - Bundler configuration file
 * - Built asset output directory
 * - Shim / polyfill directory
 *
 * Layout invariants are checked once at the fragment entrypoint; this helper
 * assumes the layout is valid and focuses on bundler-related ids.
 *
 * @param layout  - Resolved layout draft.
 * @param runtime
 * @returns The bundler-related portion of the artifacts plan.
 */
function buildBundlerPlan(
	layout: LayoutDraft,
	runtime: IRArtifactsPlan['runtime']
): IRArtifactsPlan['bundler'] {
	const runtimeEntrySource = runtime.entry.generated;
	const runtimeEntry = path.posix.extname(runtimeEntrySource)
		? runtimeEntrySource
		: path.posix.join(runtimeEntrySource, 'index.tsx');
	const aliasRoot = path.posix.dirname(runtime.runtime.generated);

	return {
		configPath: layout.resolve('bundler.config'),
		assetsPath: layout.resolve('bundler.assets'),
		shimsDir: layout.resolve('bundler.shims'),
		aliasRoot,
		entryPoint: runtimeEntry,
	};
}

function buildPlanArtifacts(layout: LayoutDraft): IRArtifactsPlan['plan'] {
	return {
		planManifestPath: layout.resolve('plan.manifest'),
		planBaseDir: layout.resolve('plan.base'),
		planIncomingDir: layout.resolve('plan.incoming'),
		patchManifestPath: layout.resolve('patch.manifest'),
	};
}

/**
 * Builds the schema artifacts plan.
 *
 * Each schema is mapped to a type definition file under `types.generated`
 * using the schema key as the base filename.
 *
 * @param schemas - IR schemas collection.
 * @param layout  - Resolved layout draft.
 * @returns A map of schema id to {@link IRSchemaPlan}.
 */
function buildSchemaPlans(
	schemas: SchemasDraft,
	layout: LayoutDraft
): IRArtifactsPlan['schemas'] {
	const typesRoot = layout.resolve('types.generated');
	return schemas.reduce<Record<string, IRSchemaPlan>>((acc, schema) => {
		acc[schema.id] = buildSchemaPlan(schema, typesRoot);
		return acc;
	}, Object.create(null));
}

/**
 * Builds the artifacts plan for a single schema.
 *
 * @param schema    - The schema IR node.
 * @param typesRoot - Root directory for generated type definitions.
 * @returns A schema plan describing the type definition path.
 */
function buildSchemaPlan(schema: IRSchema, typesRoot: string): IRSchemaPlan {
	const typeName = schema.key;
	return {
		typeDefPath: path.posix.join(typesRoot, `${typeName}.d.ts`),
	};
}

/**
 * Resolves the type information for a resource.
 *
 * Preference order:
 * 1. If the resource's `schemaKey` matches a schema plan, use the schema-derived type.
 * 2. Otherwise, fall back to an inferred type definition named after the resource.
 *
 * @param resource           - The resource, including its `schemaKey` and `name`.
 * @param resource.schemaKey
 * @param schemas            - Map of schema id to schema plan.
 * @param resource.name
 * @param typesRoot          - Root directory for generated type definitions.
 * @returns A subset of {@link IRResourceTsPlan} describing type location and origin.
 */
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

/**
 * Builds the TS resource artifacts plan.
 *
 * For each resource, this defines:
 * - The generated resource module path
 * - The associated type definition file
 * - Whether the types come from an explicit schema or are inferred
 *
 * @param resources - IR resources collection.
 * @param layout    - Resolved layout draft.
 * @param schemas   - Schema plan map from {@link buildSchemaPlans}.
 * @returns A map of resource id to resource artifacts metadata.
 */
function buildResourcePlans(
	resources: ResourcesDraft,
	layout: LayoutDraft,
	schemas: Record<string, IRSchemaPlan>
): IRArtifactsPlan['resources'] {
	const resourcesRoot = layout.resolve('app.generated');
	const typesRoot = layout.resolve('types.generated');

	return resources.reduce<IRArtifactsPlan['resources']>((acc, resource) => {
		const modulePath = path.posix.join(
			resourcesRoot,
			resource.name,
			'resource.ts'
		);
		const typePlan = resolveResourceTypePlan(resource, schemas, typesRoot);
		acc[resource.id] = {
			modulePath,
			typeDefPath: typePlan.typeDefPath,
			typeSource: typePlan.typeSource,
			schemaKey: typePlan.schemaKey,
		};
		return acc;
	}, Object.create(null));
}

/**
 * Builds the UI surface artifacts plan.
 *
 * For each UI resource declared in the UI draft, this plan:
 * - Resolves the backing resource by name
 * - Maps it to an applied and generated app directory
 * - Exposes canonical paths for page, form, and config components
 *
 * If no UI resources are defined, an empty map is returned.
 *
 * @param resources - IR resources collection.
 * @param layout    - Resolved layout draft.
 * @param ui        - UI draft (may be undefined if no UI resources are declared).
 * @returns A map of resource id to surface (UI) artifacts metadata.
 */
function buildSurfacePlans(
	resources: ResourcesDraft,
	layout: LayoutDraft,
	ui: UiDraft
): IRArtifactsPlan['surfaces'] {
	const surfaces = ui?.resources ?? [];
	if (surfaces.length === 0) {
		return Object.create(null);
	}

	const appAppliedRoot = layout.resolve('app.applied');
	const appGeneratedRoot = layout.resolve('app.generated');
	const resourcesByName = new Map(
		resources.map((resource) => [resource.name, resource])
	);

	return surfaces.reduce<IRArtifactsPlan['surfaces']>((acc, uiResource) => {
		const resource = resourcesByName.get(uiResource.resource);
		if (!resource) {
			return acc;
		}
		const slug = resource.name;
		const appDir = path.posix.join(appAppliedRoot, slug);
		const generatedAppDir = path.posix.join(appGeneratedRoot, slug);
		acc[resource.id] = {
			resource: resource.name,
			menu: uiResource.menu,
			appDir,
			generatedAppDir,
			pagePath: path.posix.join(appDir, 'page.tsx'),
			formPath: path.posix.join(appDir, 'form.tsx'),
			configPath: path.posix.join(appDir, 'config.tsx'),
		};
		return acc;
	}, Object.create(null));
}

/**
 * Builds the block artifacts plan for all blocks in the IR.
 *
 * Each block is mapped to:
 * - Applied and generated directories
 * - Block manifest (`block.json`) and TS entry/view/helper modules
 * - Optional PHP render file when SSR is enabled
 * - A mode flag (`'ssr'` vs `'js'`)
 *
 * In the current Golden Path, both `blocks.applied` and `blocks.generated`
 * are layout ids owned by the CLI and are expected to exist regardless of
 * how many blocks are declared. If either is missing, the layout manifest
 * is inconsistent with the framework contract and we fail fast.
 *
 * It is perfectly valid for the blocks collection to be empty; in that case
 * this function returns an empty artifacts map.
 *
 * @param blocks - IR blocks collection (may be empty).
 * @param layout - Resolved layout draft.
 * @returns A map of block id to block artifacts metadata.
 */
function buildBlockPlans(
	blocks: BlocksDraft,
	layout: LayoutDraft
): IRArtifactsPlan['blocks'] {
	const appliedRoot = layout.resolve('blocks.applied');
	const generatedRoot = layout.resolve('blocks.generated');

	return blocks.reduce<Record<string, IRArtifactsPlan['blocks'][string]>>(
		(acc, block) => {
			acc[block.id] = buildBlockPlan(block, appliedRoot, generatedRoot);
			return acc;
		},
		Object.create(null)
	);
}

/**
 * Builds the artifacts plan for a single block.
 *
 * Directory naming follows:
 * - `block.directory` if provided
 * - Otherwise `block.key`
 *
 * Since both applied and generated roots are owned by the CLI, their
 * directories are always emitted; only behavioural concerns (e.g. SSR)
 * are optional at the per-block level.
 *
 * @param block         - The block IR node.
 * @param appliedRoot   - Root directory for applied block files.
 * @param generatedRoot - Root directory for generated block files.
 * @returns A populated block artifacts entry.
 */
function buildBlockPlan(
	block: IRBlock,
	appliedRoot: string,
	generatedRoot: string
): IRArtifactsPlan['blocks'][string] {
	const dirName = block.directory || block.key;
	const appliedDir = path.posix.join(appliedRoot, dirName);
	const generatedDir = path.posix.join(generatedRoot, dirName);

	return {
		key: block.key,
		appliedDir,
		generatedDir,
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

function buildBlockRoots(layout: LayoutDraft): IRArtifactsPlan['blockRoots'] {
	return {
		applied: layout.resolve('blocks.applied'),
		generated: layout.resolve('blocks.generated'),
	};
}

/**
 * Builds the PHP artifacts plan.
 *
 * This includes:
 * - Plugin loader and autoload configuration
 * - SSR block plans (manifest, registrar, render paths)
 * - REST controller class locations (applied vs generated)
 * - Optional debug UI entrypoint
 *
 * Layout and PHP drafts are guaranteed non-null here; this helper focuses on
 * PHP-specific layout ids such as `php.generated`.
 *
 * @param layout      - Resolved layout draft.
 * @param php         - PHP draft.
 * @param blocks      - Block artifacts map (from {@link buildBlockPlans}).
 * @param controllers - Controller plan map (from {@link buildControllerPlans}).
 * @returns A populated {@link IRPhpArtifactsPlan}.
 */
function buildPhpPlans(
	layout: LayoutDraft,
	blocks: IRArtifactsPlan['blocks'],
	controllers: Record<string, IRControllerPlan>
): IRPhpArtifactsPlan {
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
	for (const [blockId, plan] of Object.entries(blocks)) {
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

/**
 * Resolves the PHP autoload strategy for generated code.
 *
 * Currently assumes a Composer-based layout where `php.generated` lives under
 * a directory that has a `vendor/autoload.php` two levels up.
 *
 * @param phpGenerated - Absolute path to the `php.generated` directory.
 * @returns A {@link IRPhpAutoloadPlan} describing the autoload strategy.
 */
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
