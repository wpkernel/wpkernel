// packages/cli/src/ir/fragments/ui.ts
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
			const namespaceInfo = resolveNamespaceInfo(input);
			const surfaceResources = collectUiResourceDescriptors(
				namespaceInfo.preferencesNamespace,
				namespaceInfo.namespaceSlug,
				input.draft.resources ?? []
			);
			const loader = buildUiLoader(
				surfaceResources,
				namespaceInfo.slug,
				namespaceInfo.namespace
			);
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
	preferencesNamespace: string,
	namespaceSlug: string,
	resources: readonly IRResource[]
): IRUiResourceDescriptor[] {
	const descriptors: IRUiResourceDescriptor[] = [];

	for (const resource of resources) {
		const admin = resource.ui?.admin as
			| {
					view?: string;
					menu?: ResourceDataViewsMenuConfig | null;
			  }
			| undefined;

		const usesDataViews = admin?.view === 'dataviews';
		if (!usesDataViews) {
			continue;
		}

		const preferencesKey = `${preferencesNamespace}/dataviews/${resource.name}`;
		const inferredDataviews = {
			fields: [],
			defaultView: { type: 'table' },
			preferencesKey,
		} satisfies Record<string, unknown>;

		const menu = normaliseMenu(admin?.menu, namespaceSlug);

		descriptors.push(
			menu
				? {
						resource: resource.name,
						preferencesKey,
						menu,
						dataviews: inferredDataviews as Record<string, unknown>,
					}
				: {
						resource: resource.name,
						preferencesKey,
						dataviews: inferredDataviews as Record<string, unknown>,
					}
		);
	}

	return descriptors;
}

type MutableMenuConfig = {
	-readonly [Key in keyof IRUiMenuConfig]?: IRUiMenuConfig[Key];
};

function resolveNamespaceInfo(input: IrFragmentApplyOptions['input']): {
	namespace: string;
	preferencesNamespace: string;
	namespaceSlug: string;
	slug: string | undefined;
} {
	const meta = (input.draft.meta ?? {}) as {
		namespace?: string;
		sanitizedNamespace?: string;
	};
	const optionsNamespace = input.options.namespace ?? '';
	const namespace = meta.namespace ?? optionsNamespace;
	const namespaceSlug = meta.sanitizedNamespace ?? optionsNamespace;
	const preferencesNamespace = meta.sanitizedNamespace ?? namespace;
	const slug = meta.sanitizedNamespace?.trim();

	return { namespace, preferencesNamespace, namespaceSlug, slug };
}

function buildUiLoader(
	surfaceResources: readonly IRUiResourceDescriptor[],
	slug: string | undefined,
	namespace: string
) {
	if (surfaceResources.length === 0 || !slug) {
		return undefined;
	}

	return {
		handle: `wp-${slug}-ui`,
		assetPath: DEFAULT_UI_ASSET_PATH,
		scriptPath: DEFAULT_UI_SCRIPT_PATH,
		localizationObject: UI_LOCALIZATION_OBJECT,
		namespace,
	};
}

function normaliseMenu(
	menu: ResourceDataViewsMenuConfig | null | undefined,
	namespaceSlug: string
): IRUiMenuConfig | undefined {
	if (!menu) {
		return undefined;
	}

	const normalized: MutableMenuConfig = {};

	assignSlug(normalized, menu.slug, namespaceSlug);
	assignTitle(normalized, menu.title);
	assignCapability(normalized, menu.capability);
	assignParent(normalized, menu.parent, namespaceSlug);
	assignPosition(normalized, menu.position);

	return Object.keys(normalized).length > 0
		? (normalized as IRUiMenuConfig)
		: undefined;
}

function assignSlug(
	target: MutableMenuConfig,
	slug: unknown,
	namespaceSlug: string
): void {
	if (typeof slug !== 'string' || slug.trim().length === 0) {
		return;
	}
	const trimmed = slug.trim();
	target.slug =
		namespaceSlug &&
		!trimmed.startsWith(`${namespaceSlug}-`) &&
		trimmed !== namespaceSlug
			? `${namespaceSlug}-${trimmed}`
			: trimmed;
}

function assignTitle(target: MutableMenuConfig, title: unknown): void {
	if (typeof title === 'string' && title.trim().length > 0) {
		target.title = title.trim();
	}
}

function assignCapability(
	target: MutableMenuConfig,
	capability: unknown
): void {
	if (typeof capability === 'string' && capability.trim().length > 0) {
		target.capability = capability.trim();
	}
}

function assignParent(
	target: MutableMenuConfig,
	parent: unknown,
	namespaceSlug: string
): void {
	if (typeof parent !== 'string' || parent.trim().length === 0) {
		return;
	}
	const trimmed = parent.trim();
	target.parent =
		namespaceSlug &&
		!trimmed.startsWith(`${namespaceSlug}-`) &&
		trimmed !== namespaceSlug
			? `${namespaceSlug}-${trimmed}`
			: trimmed;
}

function assignPosition(target: MutableMenuConfig, position: unknown): void {
	if (typeof position === 'number' && Number.isFinite(position)) {
		target.position = position;
	}
}
