import { toPascalCase } from '../../utils';
import type { IRRoute, IRv1 } from '../../ir/publicTypes';

/**
 * Generates a PHP method name for a WordPress REST route handler.
 *
 * Combines the HTTP method (get, post, etc.) with PascalCase route segments
 * to create semantic method names like `getJobById` or `postApplications`.
 * Strips namespace prefixes to avoid redundant naming.
 *
 * @param    route - IR route definition with method and path
 * @param    ir    - IR program containing namespace metadata
 * @returns PHP method name (e.g., "getJobById", "postApplications")
 * @category AST Builders
 */
export function buildRouteMethodName(route: IRRoute, ir: IRv1): string {
	const method = route.method.toLowerCase();
	const segments = deriveRouteSegments(route.path, ir);
	const suffix = segments.map(toPascalCase).join('') || 'Route';
	return `${method}${suffix}`;
}

/**
 * Extracts meaningful path segments from a WordPress REST route.
 *
 * Strips namespace prefixes, leading slashes, and parameter colons from route paths.
 * Returns normalized segments suitable for generating method names or identifiers.
 *
 * @param    path - REST route path (e.g., "/wpk/v1/jobs/:id")
 * @param    ir   - IR program containing namespace to strip
 * @returns Array of normalized path segments (e.g., ["jobs", "id"])
 * @category AST Builders
 */
export function deriveRouteSegments(path: string, ir: IRv1): string[] {
	const trimmed = path.replace(/^\/+/, '');
	if (!trimmed) {
		return [];
	}

	const segments = trimmed
		.split('/')
		.filter((segment: string): segment is string => segment.length > 0)
		.map((segment: string) => segment.replace(/^:/, ''));

	const namespaceVariants = new Set<string>(
		[
			ir.meta.namespace,
			ir.meta.namespace.replace(/\\/g, '/'),
			ir.meta.sanitizedNamespace,
			ir.meta.sanitizedNamespace.replace(/\\/g, '/'),
		]
			.map((value) =>
				value
					.split('/')
					.filter(
						(segment: string): segment is string =>
							segment.length > 0
					)
					.map((segment: string) => segment.toLowerCase())
			)
			.map((variant: string[]) => variant.join('/'))
	);

	const normalisedSegments = segments.map((segment: string) =>
		segment.toLowerCase()
	);

	for (const variant of namespaceVariants) {
		const variantSegments = variant.split('/');
		let matches = true;
		for (let index = 0; index < variantSegments.length; index += 1) {
			if (normalisedSegments[index] !== variantSegments[index]) {
				matches = false;
				break;
			}
		}

		if (matches) {
			return segments.slice(variantSegments.length);
		}
	}

	return segments;
}
