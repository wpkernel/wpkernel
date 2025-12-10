/**
 * @category WordPress AST
 */

export interface PluginLoaderProgramConfig {
	readonly origin: string;
	readonly namespace: string;
	readonly sanitizedNamespace: string;
	readonly plugin: PluginLoaderMeta;
	readonly phpGeneratedPath: string;
	readonly resourceClassNames: readonly string[];
	readonly contentModel?: PluginContentModelConfig;
	readonly ui?: PluginLoaderUiConfig;
}
export interface PluginLoaderUiResourceConfig {
	readonly resource: string;
	readonly menu?: {
		readonly slug?: string;
		readonly title?: string;
		readonly capability?: string;
		readonly parent?: string;
		readonly position?: number;
	};
}
export interface PluginLoaderUiConfig {
	readonly handle: string;
	readonly assetPath: string;
	readonly scriptPath: string;
	readonly localizationObject: string;
	readonly namespace: string;
	readonly resources: readonly PluginLoaderUiResourceConfig[];
}
interface PluginContentModelConfig {
	readonly statuses: readonly PluginPostStatusConfig[];
	readonly postTypes: readonly PluginPostTypeConfig[];
	readonly taxonomies: readonly PluginTaxonomyConfig[];
}
interface PluginPostStatusConfig {
	readonly slug: string;
	readonly label: string;
	readonly public?: boolean;
	readonly showInAdminAllList?: boolean;
	readonly showInAdminStatusList?: boolean;
}
export interface PluginPostTypeConfig {
	readonly slug: string;
	readonly labels: Readonly<Record<string, string>>;
	readonly supports?: readonly string[];
	readonly taxonomies?: readonly string[];
	readonly showUi?: boolean;
	readonly showInMenu?: boolean;
	readonly showInRest?: boolean;
	readonly rewrite?: boolean;
	readonly capabilityType?: string;
	readonly mapMetaCap?: boolean;
	readonly public?: boolean;
}
export interface PluginTaxonomyConfig {
	readonly slug: string;
	readonly objectTypes: readonly string[];
	readonly hierarchical?: boolean;
	readonly labels: Readonly<Record<string, string>>;
	readonly showUi?: boolean;
	readonly showAdminColumn?: boolean;
	readonly showInRest?: boolean;
}

export interface PluginLoaderMeta {
	readonly name: string;
	readonly description: string;
	readonly version: string;
	readonly requiresAtLeast: string;
	readonly requiresPhp: string;
	readonly textDomain: string;
	readonly author: string;
	readonly authorUri?: string;
	readonly pluginUri?: string;
	readonly license: string;
	readonly licenseUri?: string;
}
