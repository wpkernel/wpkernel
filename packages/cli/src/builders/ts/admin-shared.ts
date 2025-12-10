import type { IRUiResourceDescriptor } from '../../ir/publicTypes';
import { toPascalCase } from '../../utils';
import type { AdminDataViews, ResourceDescriptor } from '../types';

export type AdminScreenConfig = {
	readonly route?: string;
	readonly component?: string;
	readonly resourceSymbol?: string;
	readonly wpkernelSymbol?: string;
	readonly wpkernelImport?: string;
	readonly resourceImport?: string;
	readonly menu?: {
		readonly slug?: string;
	};
};

export type AdminDataViewsWithInteractivity = AdminDataViews & {
	readonly interactivity?: { readonly feature?: unknown };
	readonly screen?: AdminScreenConfig;
};

export type AdminScreenComponentMetadata = {
	readonly identifier: string;
	readonly fileName: string;
	readonly directories: readonly string[];
};
export interface AdminScreenResourceDescriptor extends ResourceDescriptor {
	readonly namespace?: string;
	readonly menu?: IRUiResourceDescriptor['menu']; // reuse IR shape instead of `{ slug?: string }`
}
const COMPONENT_EXTENSION_PATTERN = /\.(?:[tj]sx?|mjs|cjs)$/iu;
function ensurePascalIdentifier(value: string, fallback: string): string {
	const candidate = toPascalCase(value);
	const base = candidate.length > 0 ? candidate : fallback;
	if (/^[0-9]/u.test(base)) {
		return `_${base}`;
	}
	return base;
}
function slugifyRouteSegment(value: string, fallback: string): string {
	const cleaned = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/-+/gu, '-')
		.replace(/^-+|-+$/gu, '');

	if (cleaned.length > 0) {
		return cleaned;
	}

	const fallbackSlug = fallback
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/-+/gu, '-')
		.replace(/^-+|-+$/gu, '');

	return fallbackSlug.length > 0 ? fallbackSlug : 'admin-screen';
}
export function resolveMenuSlug(
	descriptor: AdminScreenResourceDescriptor
): string | undefined {
	const dataviews = descriptor.dataviews as
		| AdminDataViewsWithInteractivity
		| undefined;
	const screenConfig = dataviews?.screen ?? {};
	const menu = descriptor.menu;
	return screenConfig.menu?.slug ?? menu?.slug ?? undefined;
}

export function resolveAdminScreenRoute(
	descriptor: AdminScreenResourceDescriptor
): string {
	const dataviews = descriptor.dataviews as
		| AdminDataViewsWithInteractivity
		| undefined;
	const screenConfig = dataviews?.screen ?? {};
	const configuredRoute = screenConfig.route;
	const menuSlug = resolveMenuSlug(descriptor);

	let candidate: string;
	if (
		typeof configuredRoute === 'string' &&
		configuredRoute.trim().length > 0
	) {
		candidate = configuredRoute;
	} else if (typeof menuSlug === 'string' && menuSlug.trim().length > 0) {
		candidate = menuSlug;
	} else {
		candidate = `${descriptor.namespace}-${descriptor.name}`;
	}

	return slugifyRouteSegment(candidate, descriptor.name);
}

export function resolveAdminScreenComponentMetadata(
	descriptor: AdminScreenResourceDescriptor
): AdminScreenComponentMetadata {
	const screenConfig =
		(descriptor.dataviews as AdminDataViewsWithInteractivity | undefined)
			?.screen ?? {};
	const defaultIdentifier = `${toPascalCase(descriptor.name)}AdminScreen`;

	// Default to 'page' for the filename, mimicking Next.js/Showcase conventions
	const defaultFileName = 'page';

	const configured =
		typeof screenConfig.component === 'string'
			? screenConfig.component.trim()
			: '';

	if (configured.length > 0) {
		const withoutExtension = configured.replace(
			COMPONENT_EXTENSION_PATTERN,
			''
		);
		const segments = withoutExtension.split(/[\\/]/u).filter(Boolean);
		const fileName = segments.pop() ?? defaultFileName;
		const directories = segments;
		// If user configured a component path, try to derive identifier from filename
		// unless filename is 'page', then use default identifier.
		const identifierCandidate =
			fileName === 'page' ? defaultIdentifier : fileName;
		const identifier = ensurePascalIdentifier(
			identifierCandidate,
			defaultIdentifier
		);

		return {
			identifier,
			fileName,
			directories,
		};
	}

	return {
		identifier: defaultIdentifier,
		fileName: defaultFileName,
		directories: [],
	};
}
/**
 * Resolves the interactivity feature identifier for a resource.
 *
 * Uses `resource.ui.admin.dataviews.interactivity.feature` when present,
 * otherwise falls back to `'admin-screen'`.
 *
 * @param    descriptor
 * @category AST Builders
 */

export function resolveInteractivityFeature(
	descriptor: ResourceDescriptor
): string {
	const dataviews = descriptor.dataviews as
		| AdminDataViewsWithInteractivity
		| undefined;
	const feature = dataviews?.interactivity?.feature;

	if (typeof feature === 'string') {
		const trimmed = feature.trim();
		if (trimmed.length > 0) {
			return trimmed;
		}
	}

	return 'admin-screen';
}

type DescriptorRoute = {
	method?: string;
	path?: string;
};

export function resolveListRoutePath(
	descriptor: ResourceDescriptor
): string | null {
	const routes = descriptor.resource.routes ?? [];
	if (!Array.isArray(routes) || routes.length === 0) {
		return null;
	}

	const listRoute = routes.find((route) => {
		const { method, path } = route as DescriptorRoute;
		const methodValue = String(method ?? '')
			.toUpperCase()
			.trim();
		const pathValue = String(path ?? '').trim();
		return (
			methodValue === 'GET' &&
			!pathValue.includes('/:') &&
			!pathValue.includes('(?P<') &&
			!pathValue.includes('{id}')
		);
	});

	return listRoute ? ((listRoute as DescriptorRoute).path ?? null) : null;
}
