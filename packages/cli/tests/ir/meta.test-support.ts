import type { IRPluginMeta } from '../../src/ir/publicTypes';
import { toPascalCase } from '../../src/utils';

const FALLBACK_NAMESPACE = 'demo-plugin';

function sanitiseNamespace(value: string | undefined): string {
	if (!value) {
		return FALLBACK_NAMESPACE;
	}

	const slug = value
		.toLowerCase()
		.trim()
		.replace(/[\s_]+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug.length > 0 ? slug : FALLBACK_NAMESPACE;
}

function buildTitleFromNamespace(namespace: string): string {
	return namespace
		.split('-')
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join(' ');
}

const trim = (value?: string): string | undefined =>
	value?.trim() ? value.trim() : undefined;

const withFallback = (value: string | undefined, fallback: string): string =>
	trim(value) ?? fallback;

export function buildPluginMetaFixture({
	namespace,
	overrides = {},
}: {
	namespace?: string;
	overrides?: Partial<IRPluginMeta>;
} = {}): IRPluginMeta {
	const sanitized = sanitiseNamespace(namespace);
	const name = withFallback(
		overrides.name,
		buildTitleFromNamespace(sanitized)
	);
	const description = withFallback(
		overrides.description,
		`Bootstrap loader for the ${name} WPKernel integration.`
	);

	return {
		name,
		description,
		version: withFallback(overrides.version, '0.1.0'),
		requiresAtLeast: withFallback(overrides.requiresAtLeast, '6.7'),
		requiresPhp: withFallback(overrides.requiresPhp, '8.1'),
		textDomain: withFallback(overrides.textDomain, sanitized),
		author: withFallback(overrides.author, 'WPKernel Contributors'),
		authorUri: trim(overrides.authorUri),
		pluginUri: trim(overrides.pluginUri),
		license: withFallback(overrides.license, 'GPL-2.0-or-later'),
		licenseUri: trim(overrides.licenseUri),
	};
}

export function buildControllerClassName(
	namespace: string,
	resourceName: string
): string {
	const phpNamespace = namespace
		.split('-')
		.filter(Boolean)
		.map(
			(segment) =>
				segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
		)
		.join('\\');

	const resourceClass = toPascalCase(resourceName);

	return `${phpNamespace}\\Generated\\Rest\\${resourceClass}Controller`;
}
