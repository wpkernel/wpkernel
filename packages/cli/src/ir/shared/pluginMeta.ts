import type { PluginMetaConfig } from '../../config/types';
import type { IRPluginMeta } from '../publicTypes';

function buildTitleFromNamespace(namespace: string): string {
	if (!namespace) {
		return 'WPKernel Plugin';
	}

	return namespace
		.split('-')
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

const trimValue = (value?: string): string | undefined =>
	value?.trim() || undefined;

export function buildPluginMeta({
	sanitizedNamespace,
	configMeta,
}: {
	sanitizedNamespace: string;
	configMeta?: PluginMetaConfig;
}): IRPluginMeta {
	const name = resolvePluginName(sanitizedNamespace, configMeta);
	const description = resolvePluginDescription(name, configMeta);
	const meta = buildBasePluginMeta({
		name,
		description,
		sanitizedNamespace,
	});

	applyMetaOverrides(meta, configMeta);

	return meta;
}

function resolvePluginName(
	sanitizedNamespace: string,
	configMeta?: PluginMetaConfig
): string {
	return (
		trimValue(configMeta?.name) ||
		buildTitleFromNamespace(sanitizedNamespace)
	);
}

function resolvePluginDescription(
	name: string,
	configMeta?: PluginMetaConfig
): string {
	return (
		trimValue(configMeta?.description) ||
		`Bootstrap loader for the ${name} WPKernel integration.`
	);
}

function buildBasePluginMeta({
	name,
	description,
	sanitizedNamespace,
}: {
	name: string;
	description: string;
	sanitizedNamespace: string;
}): IRPluginMeta {
	return {
		name,
		description,
		version: '0.1.0',
		requiresAtLeast: '6.7',
		requiresPhp: '8.1',
		textDomain: sanitizedNamespace,
		author: 'WPKernel Contributors',
		license: 'GPL-2.0-or-later',
	};
}

type RequiredMetaKeys =
	| 'version'
	| 'requiresAtLeast'
	| 'requiresPhp'
	| 'textDomain'
	| 'author'
	| 'license';

type OptionalMetaKeys = 'authorUri' | 'pluginUri' | 'licenseUri';

function assignMetaField<K extends RequiredMetaKeys>(
	meta: IRPluginMeta,
	key: K,
	value?: string
) {
	const trimmed = trimValue(value);
	if (trimmed) {
		meta[key] = trimmed;
	}
}

function assignOptionalMetaField<K extends OptionalMetaKeys>(
	meta: IRPluginMeta,
	key: K,
	value?: string
) {
	meta[key] = trimValue(value);
}

function applyMetaOverrides(meta: IRPluginMeta, configMeta?: PluginMetaConfig) {
	if (!configMeta) {
		return;
	}

	assignMetaField(meta, 'version', configMeta.version);
	assignMetaField(meta, 'requiresAtLeast', configMeta.requiresAtLeast);
	assignMetaField(meta, 'requiresPhp', configMeta.requiresPhp);
	assignMetaField(meta, 'textDomain', configMeta.textDomain);
	assignMetaField(meta, 'author', configMeta.author);
	assignMetaField(meta, 'license', configMeta.license);

	assignOptionalMetaField(meta, 'authorUri', configMeta.authorUri);
	assignOptionalMetaField(meta, 'pluginUri', configMeta.pluginUri);
	assignOptionalMetaField(meta, 'licenseUri', configMeta.licenseUri);
}
