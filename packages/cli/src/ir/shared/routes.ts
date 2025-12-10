import { WPKernelError } from '@wpkernel/core/error';
import type { ResourceConfig, ResourceRoute } from '@wpkernel/core/resource';
import type { IRRoute, IRWarning } from '../publicTypes';
import { buildHashProvenance } from './hashing';
import { isAbsoluteUrl } from '../../utils';

const RESERVED_ROUTE_PREFIXES = [
	'/wp/v2',
	'/wp-json',
	'/oembed/1.0',
	'/wp-site-health',
];

const ROUTE_NORMALISATION_REGEX = /\/+$/;

/**
 * Normalise and validate a resource's configured routes into IRRoute
 * records.
 *
 * This performs path normalisation, transport detection (local vs remote),
 * reserved prefix checks, duplicate detection (for local routes), and
 * produces a deterministic hash for each route. Any warnings produced by
 * the analysis are returned alongside the normalised routes.
 *
 * @param    options                    - Options for normalisation
 * @param    options.resourceKey        - Resource key owning the routes
 * @param    options.routes             - Raw routes from the resource config
 * @param    options.duplicateDetector  - Shared map used to detect duplicate local routes
 * @param    options.sanitizedNamespace - Namespace to consider local routes
 * @returns Object containing an array of normalised `IRRoute`s and any `IRWarning`s
 * @category IR
 */
export function normaliseRoutes(options: {
	resourceKey: string;
	routes: ResourceConfig['routes'];
	duplicateDetector: Map<string, { resource: string; route: string }>;
	sanitizedNamespace: string;
}): { routes: IRRoute[]; warnings: IRWarning[] } {
	const { resourceKey, routes, duplicateDetector, sanitizedNamespace } =
		options;
	const irRoutes: IRRoute[] = [];
	const warnings: IRWarning[] = [];

	const routeEntries = Object.entries(routes).filter(
		(entry): entry is [string, ResourceRoute] =>
			typeof entry[1] !== 'undefined'
	);

	for (const [routeKey, route] of routeEntries) {
		const method = route.method.toUpperCase();
		const analysis = analyseRoutePath({
			candidate: route.path,
			resourceKey,
			routeKey,
			sanitizedNamespace,
		});

		// Only check for duplicates on local routes - remote routes can be reused
		// across resources as they don't collide within the WordPress namespace
		if (analysis.transport === 'local') {
			const duplicateKey = `${method} ${analysis.normalisedPath}`;
			if (duplicateDetector.has(duplicateKey)) {
				const existing = duplicateDetector.get(duplicateKey)!;
				throw new WPKernelError('ValidationError', {
					message: `Duplicate route detected for ${method} ${analysis.normalisedPath}.`,
					context: {
						resource: resourceKey,
						route: routeKey,
						conflict: existing,
					},
				});
			}

			duplicateDetector.set(duplicateKey, {
				resource: resourceKey,
				route: routeKey,
			});
		}

		if (analysis.warnings.length > 0) {
			warnings.push(...analysis.warnings);
		}

		irRoutes.push({
			method,
			path: analysis.normalisedPath,
			capability: route.capability,
			transport: analysis.transport,
			hash: buildHashProvenance(
				['method', 'path', 'capability', 'transport'],
				{
					method,
					path: analysis.normalisedPath,
					capability: route.capability ?? null,
					transport: analysis.transport,
				}
			),
		});
	}

	irRoutes.sort((a, b) => {
		const methodComparison = a.method.localeCompare(b.method);
		if (methodComparison !== 0) {
			return methodComparison;
		}

		return a.path.localeCompare(b.path);
	});

	return { routes: irRoutes, warnings };
}

function analyseRoutePath(options: {
	candidate: string;
	resourceKey: string;
	routeKey: string;
	sanitizedNamespace: string;
}): {
	normalisedPath: string;
	transport: IRRoute['transport'];
	warnings: IRWarning[];
} {
	const { candidate, resourceKey, routeKey, sanitizedNamespace } = options;
	const trimmed = candidate.trim();

	if (!trimmed) {
		throw new WPKernelError('ValidationError', {
			message: `Route ${routeKey} for resource "${resourceKey}" is empty.`,
			context: { resource: resourceKey, route: routeKey },
		});
	}

	if (trimmed.includes('../') || trimmed.includes('..\\')) {
		throw new WPKernelError('ValidationError', {
			message: `Route ${routeKey} for resource "${resourceKey}" contains disallowed path traversal segments.`,
			context: { resource: resourceKey, route: routeKey, path: trimmed },
		});
	}

	if (isAbsoluteUrl(trimmed)) {
		return {
			normalisedPath: trimmed,
			transport: 'remote',
			warnings: [
				{
					code: 'route.remote.absolute',
					message: `Route ${routeKey} for resource "${resourceKey}" points to a remote transport (absolute URL).`,
					context: {
						resource: resourceKey,
						route: routeKey,
						path: trimmed,
					},
				},
			],
		};
	}

	const normalised = `/${trimmed.replace(/^\/+/, '')}`.replace(
		ROUTE_NORMALISATION_REGEX,
		''
	);
	const collapsed = normalised.replace(/\/{2,}/g, '/');

	for (const prefix of RESERVED_ROUTE_PREFIXES) {
		if (collapsed.startsWith(prefix)) {
			throw new WPKernelError('ValidationError', {
				message: `Route ${routeKey} for resource "${resourceKey}" uses reserved prefix "${prefix}".`,
				context: {
					resource: resourceKey,
					route: routeKey,
					path: collapsed,
				},
			});
		}
	}

	const warnings: IRWarning[] = [];
	const namespacePrefix = `/${sanitizedNamespace}/`;
	const transport: IRRoute['transport'] = collapsed.startsWith(
		namespacePrefix
	)
		? 'local'
		: 'remote';

	if (transport === 'remote') {
		warnings.push({
			code: 'route.remote.namespace',
			message: `Route ${routeKey} for resource "${resourceKey}" does not match namespace "${sanitizedNamespace}" and will be treated as remote.`,
			context: {
				resource: resourceKey,
				route: routeKey,
				path: collapsed,
			},
		});
	}

	return { normalisedPath: collapsed || '/', transport, warnings };
}
