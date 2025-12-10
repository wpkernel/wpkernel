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
export const UI_FRAGMENT_KEY = 'ir.ui.core';

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

		const usesDataViews = admin?.view === 'dataview';
		if (!usesDataViews) {
			continue;
		}

		const menu = normaliseMenu(admin?.menu);

		descriptors.push(
			menu
				? { resource: resource.name, menu }
				: { resource: resource.name }
		);
	}

	return descriptors;
}

type MutableMenuConfig = {
	-readonly [Key in keyof IRUiMenuConfig]?: IRUiMenuConfig[Key];
};

function resolveNamespaceInfo(input: IrFragmentApplyOptions['input']): {
	namespace: string;
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
	const slug = meta.sanitizedNamespace?.trim();

	return { namespace, namespaceSlug, slug };
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
	menu: ResourceDataViewsMenuConfig | null | undefined
): IRUiMenuConfig | undefined {
	if (!menu) {
		return undefined;
	}

	const normalized: MutableMenuConfig = {};

	assignSlug(normalized, menu.slug);
	assignTitle(normalized, menu.title);
	assignCapability(normalized, menu.capability);
	assignParent(normalized, menu.parent);
	assignPosition(normalized, menu.position);

	return Object.keys(normalized).length > 0
		? (normalized as IRUiMenuConfig)
		: undefined;
}

function assignSlug(target: MutableMenuConfig, slug: unknown): void {
	if (typeof slug !== 'string' || slug.trim().length === 0) {
		return;
	}
	// Preserve user-provided slug; do not auto-prefix with namespace.
	target.slug = slug.trim();
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

function assignParent(target: MutableMenuConfig, parent: unknown): void {
	if (typeof parent !== 'string' || parent.trim().length === 0) {
		return;
	}
	// Preserve user-provided parent; do not auto-prefix with namespace.
	target.parent = parent.trim();
}

function assignPosition(target: MutableMenuConfig, position: unknown): void {
	if (typeof position === 'number' && Number.isFinite(position)) {
		target.position = position;
	}
}
