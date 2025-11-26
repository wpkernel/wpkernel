import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import type {
	IRUiSurface,
	IRUiResourceDescriptor,
	IRUiMenuConfig,
	IRResource,
} from '../publicTypes';
import type { ResourceDataViewsMenuConfig } from '@wpkernel/core/resource';

const DEFAULT_UI_ASSET_PATH = 'build/index.asset.json';
const DEFAULT_UI_SCRIPT_PATH = 'build/index.js';
const UI_LOCALIZATION_OBJECT = 'wpKernelUISettings';

/**
 * Fragment key for UI aggregation.
 */
export const UI_FRAGMENT_KEY = 'ir.ui.resources';

/**
 * Builds normalized UI metadata from resource DataViews definitions.
 *
 * @category IR
 */
export function createUiFragment(): IrFragment {
	return createHelper({
		key: UI_FRAGMENT_KEY,
		kind: 'fragment',
		dependsOn: ['ir.meta.core', 'ir.resources.core'],
		async apply({ input, output }: IrFragmentApplyOptions) {
			const namespace =
				input.draft.meta?.namespace ?? input.options.namespace ?? '';
			const resources = input.draft.resources ?? [];

			const slug = input.draft.meta?.sanitizedNamespace?.trim();
			const surfaceResources = collectUiResourceDescriptors(
				namespace,
				resources
			);
			const loader =
				surfaceResources.length > 0 && slug
					? {
							handle: `wp-${slug}-ui`,
							assetPath: DEFAULT_UI_ASSET_PATH,
							scriptPath: DEFAULT_UI_SCRIPT_PATH,
							localizationObject: UI_LOCALIZATION_OBJECT,
							namespace,
						}
					: undefined;
			const surface: IRUiSurface = loader
				? { resources: surfaceResources, loader }
				: { resources: surfaceResources };
			output.assign({
				ui: surface,
			});
		},
	});
}

function collectUiResourceDescriptors(
	namespace: string,
	resources: readonly IRResource[]
): IRUiResourceDescriptor[] {
	const descriptors: IRUiResourceDescriptor[] = [];

	for (const resource of resources) {
		const admin = resource.ui?.admin;
		const usesDataViews = admin?.view === 'dataviews';
		if (!usesDataViews) {
			continue;
		}

		const inferredDataviews: Record<string, unknown> = {
			fields: [],
			defaultView: { type: 'table' },
			mapQuery: (view: Record<string, unknown>) => view ?? {},
			preferencesKey: `${namespace}/dataviews/${resource.name}`,
		};

		const preferencesKey = `${namespace}/dataviews/${resource.name}`;
		const menu = normaliseMenu(undefined);

		descriptors.push(
			menu
				? {
						resource: resource.name,
						preferencesKey,
						menu,
						dataviews: inferredDataviews,
					}
				: {
						resource: resource.name,
						preferencesKey,
						dataviews: inferredDataviews,
					}
		);
	}

	return descriptors;
}

type MutableMenuConfig = {
	-readonly [Key in keyof IRUiMenuConfig]?: IRUiMenuConfig[Key];
};

function normaliseMenu(
	menu?: ResourceDataViewsMenuConfig | null
): IRUiMenuConfig | undefined {
	if (!menu) {
		return undefined;
	}

	const normalized: MutableMenuConfig = {};

	if (typeof menu.position === 'number' && Number.isFinite(menu.position)) {
		normalized.position = menu.position;
	}

	return Object.keys(normalized).length > 0
		? (normalized as IRUiMenuConfig)
		: undefined;
}
