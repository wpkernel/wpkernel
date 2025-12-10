import type { IRv1 } from '../../ir/publicTypes';
import type { PluginLoaderUiConfig } from './types';

export function buildUiConfig(ir: IRv1): PluginLoaderUiConfig | null {
	const surfaces =
		ir.artifacts.surfaces ??
		(Object.create(null) as NonNullable<IRv1['artifacts']['surfaces']>);
	const resourcesWithMenu = Object.values(surfaces).filter(
		(surface) => surface.menu && surface.menu.slug
	);
	// Without menu-bearing surfaces we skip UI entirely.
	if (resourcesWithMenu.length === 0) {
		return null;
	}

	// The loader metadata comes from the UI fragment; if missing, skip UI.
	const loader = ir.ui?.loader;
	if (!loader) {
		return null;
	}

	return {
		handle: loader.handle,
		assetPath: loader.assetPath,
		scriptPath: loader.scriptPath,
		localizationObject: loader.localizationObject,
		namespace: loader.namespace,
		resources: resourcesWithMenu.map((surface) => ({
			resource: surface.resource,
			menu: surface.menu,
			preferencesKey: surface.resource,
		})),
	};
}
