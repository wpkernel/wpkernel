import path from 'node:path';
import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';
import {
	AUTO_GUARD_BEGIN,
	buildPluginLoaderProgram,
	buildProgramTargetPlanner,
	getPhpBuilderChannel,
} from '@wpkernel/wp-json-ast';
import { buildUiConfig } from './pluginLoader.ui';
import { toPascalCase } from './utils';
import {
	type ContentModel,
	type PostTypesMap,
	type TaxonomiesMap,
	type StatusesMap,
	type Resource,
	type WpPostStorage,
	type WpTaxonomyStorage,
} from './types';
/**
 * Creates a PHP builder helper for generating the main plugin loader file (`plugin.php`).
 *
 * This helper generates the primary entry point for the WordPress plugin,
 * which includes and initializes all other generated PHP components.
 * It also checks for an existing `plugin.php` to avoid overwriting user-owned files.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating the plugin loader file.
 */
export function createPhpPluginLoaderHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.plugin-loader',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.core',
			'builder.generate.php.controller.resources',
			'builder.generate.php.capability',
			'builder.generate.php.registration.persistence',
			'ir.resources.core',
			'ir.capability-map.core',
			'ir.layout.core',
		],
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, context, reporter } = options;
			if (!canGeneratePluginLoader(input)) {
				await next?.();
				return;
			}

			const ir = input.ir;
			const resourceClassNames = buildResourceClassNames(ir);
			const uiConfig = buildUiConfig(ir);

			await writeDebugUiFile({
				workspace: context.workspace,
				ir,
				uiResources: ir.ui?.resources ?? [],
				uiConfig,
			});

			if (
				await pluginLoaderIsUserOwned({
					workspace: context.workspace,
					reporter,
				})
			) {
				await next?.();
				return;
			}

			const loaderConfig = buildLoaderConfig({
				ir,
				resourceClassNames,
				uiConfig,
			});

			const program = buildPluginLoaderProgram(loaderConfig);
			const pluginRootDir = resolvePluginRootDir(ir);

			const planner = buildProgramTargetPlanner({
				workspace: context.workspace,
				outputDir: pluginRootDir,
				channel: getPhpBuilderChannel(context),
			});

			planner.queueFile({
				fileName: 'plugin.php',
				program,
				metadata: { kind: 'plugin-loader' },
				docblock: [],
				uses: [],
				statements: [],
			});

			reporter.debug(
				'createPhpPluginLoaderHelper: queued plugin loader.',
				{ outputDir: pluginRootDir }
			);

			await next?.();
		},
	});
}

export type GeneratePhaseInput = BuilderApplyOptions['input'] & {
	phase: 'generate';
	ir: NonNullable<BuilderApplyOptions['input']['ir']>;
};

function canGeneratePluginLoader(
	input: BuilderApplyOptions['input']
): input is GeneratePhaseInput {
	return input.phase === 'generate' && Boolean(input.ir);
}

function buildResourceClassNames(ir: GeneratePhaseInput['ir']): string[] {
	return ir.resources.map((resource) => {
		if (resource.controllerClass) {
			return resource.controllerClass;
		}
		const pascal = toPascalCase(resource.name);
		return `${ir.php.namespace}\\Generated\\Rest\\${pascal}Controller`;
	});
}

function resolvePluginRootDir(ir: GeneratePhaseInput['ir']): string {
	return ir.layout!.resolve('php.generated');
}

function buildLoaderConfig({
	ir,
	resourceClassNames,
	uiConfig,
}: {
	ir: GeneratePhaseInput['ir'];
	resourceClassNames: string[];
	uiConfig: ReturnType<typeof buildUiConfig>;
}): Parameters<typeof buildPluginLoaderProgram>[0] {
	const base = {
		origin: ir.meta.origin,
		namespace: ir.php.namespace,
		sanitizedNamespace: ir.meta.sanitizedNamespace,
		plugin: ir.meta.plugin,
		resourceClassNames,
		phpGeneratedPath: ir.layout!.resolve('php.generated'),
	};

	const contentModel = buildContentModelConfig(ir);

	return uiConfig
		? { ...base, ui: uiConfig, contentModel }
		: { ...base, contentModel };
}

function buildContentModelConfig(ir: GeneratePhaseInput['ir']): ContentModel {
	const postTypes: PostTypesMap = new Map();
	const taxonomies: TaxonomiesMap = new Map();
	const statuses: StatusesMap = new Map();

	for (const resource of ir.resources) {
		const storage = resource.storage;
		if (!storage) {
			continue;
		}

		if (storage.mode === 'wp-post') {
			addPostTypeFromResource({
				resource,
				storage,
				postTypes,
				taxonomies,
				statuses,
			});
			continue;
		}

		if (storage.mode === 'wp-taxonomy') {
			addTaxonomyFromStorage({
				storage,
				taxonomies,
			});
		}
	}

	if (postTypes.size === 0 && taxonomies.size === 0 && statuses.size === 0) {
		return undefined;
	}

	return {
		postTypes: buildPostTypesArray(postTypes),
		taxonomies: buildTaxonomiesArray(taxonomies),
		statuses: buildStatusesArray(statuses),
	};
}

function addPostTypeFromResource({
	resource,
	storage,
	postTypes,
	taxonomies,
	statuses,
}: {
	resource: Resource;
	storage: WpPostStorage;
	postTypes: PostTypesMap;
	taxonomies: TaxonomiesMap;
	statuses: StatusesMap;
}): void {
	const postTypeSlug = storage.postType ?? resource.name;
	const labels = buildLabelsFromResource(resource);
	const existing = postTypes.get(postTypeSlug);
	const taxonomySet = existing?.taxonomies ?? new Set<string>();

	addTaxonomiesForPostType({
		storage,
		postTypeSlug,
		taxonomySet,
		taxonomies,
	});

	const supports = getSupportsForPostType(storage);

	postTypes.set(postTypeSlug, {
		labels,
		supports,
		taxonomies: taxonomySet,
	});

	addStatusesFromStorage(storage, statuses);
}

function addTaxonomiesForPostType({
	storage,
	postTypeSlug,
	taxonomySet,
	taxonomies,
}: {
	storage: WpPostStorage;
	postTypeSlug: string;
	taxonomySet: Set<string>;
	taxonomies: TaxonomiesMap;
}): void {
	const storageTaxonomies = storage.taxonomies ?? {};
	for (const descriptor of Object.values(storageTaxonomies)) {
		if (!descriptor?.taxonomy) {
			continue;
		}

		taxonomySet.add(descriptor.taxonomy);

		if (!descriptor.register) {
			continue;
		}

		upsertRegisteredTaxonomy({
			slug: descriptor.taxonomy,
			postTypeSlug,
			hierarchical: descriptor.hierarchical,
			taxonomies,
		});
	}
}

function getSupportsForPostType(
	storage: WpPostStorage
): readonly string[] | undefined {
	if (!storage.supports || storage.supports.length === 0) {
		return undefined;
	}
	return storage.supports;
}

function addStatusesFromStorage(
	storage: WpPostStorage,
	statuses: StatusesMap
): void {
	for (const status of storage.statuses ?? []) {
		const label = toLabel(status);
		statuses.set(status, {
			label,
			public: false,
			showInAdminAllList: true,
			showInAdminStatusList: true,
		});
	}
}

function addTaxonomyFromStorage({
	storage,
	taxonomies,
}: {
	storage: WpTaxonomyStorage;
	taxonomies: TaxonomiesMap;
}): void {
	const slug = storage.taxonomy;
	if (!slug) {
		return;
	}

	const existing = taxonomies.get(slug) ?? {
		objectTypes: new Set<string>(),
		hierarchical: storage.hierarchical,
		labels: buildTaxonomyLabels(slug),
	};

	if (typeof storage.hierarchical === 'boolean') {
		existing.hierarchical = storage.hierarchical;
	}

	taxonomies.set(slug, existing);
}

function upsertRegisteredTaxonomy({
	slug,
	postTypeSlug,
	hierarchical,
	taxonomies,
}: {
	slug: string;
	postTypeSlug: string;
	hierarchical?: boolean;
	taxonomies: TaxonomiesMap;
}): void {
	const existing = taxonomies.get(slug) ?? {
		objectTypes: new Set<string>(),
		hierarchical,
		labels: buildTaxonomyLabels(slug),
	};

	existing.objectTypes.add(postTypeSlug);

	if (typeof hierarchical === 'boolean') {
		existing.hierarchical = hierarchical;
	}

	taxonomies.set(slug, existing);
}

function buildPostTypesArray(postTypes: PostTypesMap) {
	return Array.from(postTypes.entries()).map(
		([slug, { labels, supports, taxonomies: taxonomySet }]) => ({
			slug,
			labels,
			supports,
			taxonomies: Array.from(taxonomySet),
			showUi: true,
			showInMenu: true,
			showInRest: true,
			rewrite: false,
			capabilityType: 'post',
			mapMetaCap: true,
			public: false,
		})
	);
}

function buildTaxonomiesArray(taxonomies: TaxonomiesMap) {
	return Array.from(taxonomies.entries()).map(
		([slug, { objectTypes, hierarchical, labels: taxonomyLabels }]) => ({
			slug,
			objectTypes: Array.from(objectTypes),
			hierarchical,
			labels: taxonomyLabels,
			showUi: true,
			showAdminColumn: true,
			showInRest: true,
		})
	);
}

function buildStatusesArray(statuses: StatusesMap) {
	return Array.from(statuses.entries()).map(
		([
			slug,
			{
				label,
				public: isPublic,
				showInAdminAllList,
				showInAdminStatusList,
			},
		]) => ({
			slug,
			label,
			public: isPublic,
			showInAdminAllList,
			showInAdminStatusList,
		})
	);
}

function buildLabelsFromResource(
	resource: GeneratePhaseInput['ir']['resources'][number]
): Record<string, string> {
	const singular = toLabel(resource.name);
	const plural = `${singular}s`;

	return {
		name: plural,
		singular_name: singular,
		add_new_item: `Add New ${singular}`,
		edit_item: `Edit ${singular}`,
		new_item: `New ${singular}`,
		view_item: `View ${singular}`,
		search_items: `Search ${plural}`,
		not_found: `No ${plural.toLowerCase()} found`,
		not_found_in_trash: `No ${plural.toLowerCase()} found in Trash`,
		all_items: `All ${plural}`,
		menu_name: plural,
	};
}

function buildTaxonomyLabels(taxonomy: string): Record<string, string> {
	const singular = toLabel(taxonomy);
	const plural = `${singular}s`;
	return {
		name: plural,
		singular_name: singular,
		search_items: `Search ${plural}`,
		all_items: `All ${plural}`,
		parent_item: `Parent ${singular}`,
		parent_item_colon: `Parent ${singular}:`,
		edit_item: `Edit ${singular}`,
		update_item: `Update ${singular}`,
		add_new_item: `Add New ${singular}`,
		new_item_name: `New ${singular} Name`,
		menu_name: plural,
	};
}

function toLabel(value: string): string {
	const spaced = value
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();

	return spaced
		.split(' ')
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

async function writeDebugUiFile({
	workspace,
	ir,
	uiResources,
	uiConfig,
}: {
	workspace: BuilderApplyOptions['context']['workspace'];
	ir: GeneratePhaseInput['ir'];
	uiResources: NonNullable<GeneratePhaseInput['ir']['ui']>['resources'] | [];
	uiConfig: ReturnType<typeof buildUiConfig>;
}): Promise<void> {
	const debugUiPath =
		ir.layout?.resolve('debug.ui') ??
		path.posix.join('.wpk', 'debug-ui.json');

	await workspace.write(
		debugUiPath,
		JSON.stringify(
			{
				namespace: ir.meta.namespace,
				sanitizedNamespace: ir.meta.sanitizedNamespace,
				uiResources,
				uiConfig: uiConfig ?? null,
			},
			null,
			2
		),
		{ ensureDir: true }
	);
}

async function pluginLoaderIsUserOwned({
	workspace,
	reporter,
}: {
	workspace: BuilderApplyOptions['context']['workspace'];
	reporter: BuilderApplyOptions['reporter'];
}): Promise<boolean> {
	try {
		const existingPlugin = await workspace.readText('plugin.php');
		if (
			existingPlugin &&
			!new RegExp(AUTO_GUARD_BEGIN, 'u').test(existingPlugin)
		) {
			reporter.info(
				'createPhpPluginLoaderHelper: skipping generation because plugin.php exists and appears user-owned.'
			);
			return true;
		}
	} catch {
		// ignore - file does not exist or cannot be read
	}

	return false;
}
