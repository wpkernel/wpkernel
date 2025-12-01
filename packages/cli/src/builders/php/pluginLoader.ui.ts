import type { IRv1 } from '../../ir/publicTypes';
import type { PluginLoaderUiConfig } from './types';

export function buildUiConfig(ir: IRv1): PluginLoaderUiConfig | null {
	const resourcesWithMenu = (ir.ui?.resources ?? []).filter(
		(resource) => resource.menu && resource.menu.slug
	);
	const loader = ir.ui?.loader;
	if (resourcesWithMenu.length === 0 || !loader) {
		return null;
	}

	return {
		handle: loader.handle,
		assetPath: loader.assetPath,
		scriptPath: loader.scriptPath,
		localizationObject: loader.localizationObject,
		namespace: loader.namespace,
		resources: resourcesWithMenu,
	};
}
