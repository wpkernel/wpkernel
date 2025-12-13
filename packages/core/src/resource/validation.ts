/**
 * Resource configuration validation
 *
 * Validates resource configuration at definition time to catch
 * developer errors early with helpful error messages.
 *
 * @see Product Specification § 4.1 Resources
 */
import { WPKernelError } from '../error/index';
import type { ResourceConfig } from './types';

/**
 * Validate resource configuration
 *
 * Throws DeveloperError for invalid configs to catch issues at dev time.
 * Validates:
 * - Resource name (required, kebab-case)
 * - Routes object (at least one route required)
 * - Each route definition (path, method)
 * - HTTP method validity
 *
 * @param config - Resource configuration to validate
 * @throws DeveloperError if configuration is invalid
 *
 * @example
 * ```ts
 * validateConfig({
 *   name: 'thing',
 *   routes: {
 *     list: { path: '/my-plugin/v1/things', method: 'GET' }
 *   }
 * }); // ✓ Valid
 *
 * validateConfig({
 *   name: 'Thing', // ✗ Must be kebab-case
 *   routes: {}
 * }); // Throws DeveloperError
 * ```
 */
export function validateConfig<T, TQuery>(
	config: ResourceConfig<T, TQuery>
): void {
	const resourceName = validateName(config);
	const routes = validateRoutesObject(config, resourceName);

	for (const [routeName, route] of routes) {
		validateRouteDefinition(routeName, route, resourceName);
	}

	validateStoreOptions(config, resourceName);
}

const VALID_ROUTE_NAMES = new Set<
	keyof ResourceConfig<unknown, unknown>['routes']
>(['list', 'get', 'create', 'update', 'remove']);
const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

function failValidation(
	message: string,
	field: string,
	options: { code?: string; resourceName?: string } = {}
): never {
	const { code, resourceName } = options;
	throw new WPKernelError('DeveloperError', {
		message,
		data: {
			validationErrors: [
				{
					field,
					message,
					...(code ? { code } : {}),
				},
			],
		},
		context: resourceName ? { resourceName } : undefined,
	});
}

function validateName<T, TQuery>(config: ResourceConfig<T, TQuery>): string {
	if (!config.name || typeof config.name !== 'string') {
		failValidation(
			'Resource config must have a valid "name" property',
			'name'
		);
	}

	if (!/^[a-z][a-z0-9-]*(:[a-z][a-z0-9-]*)?$/.test(config.name)) {
		failValidation(
			`Resource name "${config.name}" must be lowercase with hyphens only (kebab-case), optionally namespaced (namespace:resource)`,
			'name'
		);
	}

	return config.name;
}

function validateRoutesObject<T, TQuery>(
	config: ResourceConfig<T, TQuery>,
	resourceName: string
): Array<
	[
		keyof ResourceConfig<T, TQuery>['routes'],
		ResourceConfig<T, TQuery>['routes'][keyof ResourceConfig<
			T,
			TQuery
		>['routes']],
	]
> {
	if (!config.routes || typeof config.routes !== 'object') {
		failValidation(
			'Resource config must have a "routes" object',
			'routes',
			{ resourceName }
		);
	}

	const entries = Object.entries(config.routes) as Array<
		[
			keyof ResourceConfig<T, TQuery>['routes'],
			ResourceConfig<T, TQuery>['routes'][keyof ResourceConfig<
				T,
				TQuery
			>['routes']],
		]
	>;
	if (entries.length === 0) {
		failValidation(
			`Resource "${resourceName}" must define at least one route`,
			'routes',
			{ resourceName }
		);
	}

	return entries;
}

function validateRouteDefinition(
	routeName: keyof ResourceConfig<unknown, unknown>['routes'],
	route: ResourceConfig<unknown, unknown>['routes'][keyof ResourceConfig<
		unknown,
		unknown
	>['routes']],
	resourceName: string
): void {
	if (!VALID_ROUTE_NAMES.has(routeName)) {
		failValidation(
			`Invalid route name "${routeName}" in resource "${resourceName}"`,
			`routes.${routeName}`,
			{ code: 'INVALID_ROUTE_NAME', resourceName }
		);
	}

	if (!route || typeof route !== 'object') {
		failValidation(
			`Route "${routeName}" in resource "${resourceName}" must be an object`,
			`routes.${routeName}`,
			{ code: 'INVALID_ROUTE_TYPE', resourceName }
		);
	}

	if (!route.path || typeof route.path !== 'string') {
		failValidation(
			`Route "${routeName}" in resource "${resourceName}" must have a valid "path"`,
			`routes.${routeName}.path`,
			{ code: 'MISSING_PATH', resourceName }
		);
	}

	if (!route.method || typeof route.method !== 'string') {
		failValidation(
			`Route "${routeName}" in resource "${resourceName}" must have a valid "method"`,
			`routes.${routeName}.method`,
			{ code: 'MISSING_METHOD', resourceName }
		);
	}

	if (!VALID_METHODS.has(route.method)) {
		failValidation(
			`Invalid HTTP method "${route.method}" for route "${routeName}" in resource "${resourceName}"`,
			`routes.${routeName}.method`,
			{ code: 'INVALID_METHOD', resourceName }
		);
	}
}

function validateStoreOptions<T, TQuery>(
	config: ResourceConfig<T, TQuery>,
	resourceName: string
): void {
	if (config.store === undefined) {
		return;
	}

	if (config.store === null || typeof config.store !== 'object') {
		failValidation(
			`Resource "${resourceName}" store configuration must be an object`,
			'store',
			{ code: 'INVALID_STORE_CONFIG', resourceName }
		);
	}

	const { getId, getQueryKey } = config.store;

	if (getId !== undefined && typeof getId !== 'function') {
		failValidation(
			`Resource "${resourceName}" store.getId must be a function`,
			'store.getId',
			{ code: 'INVALID_STORE_GET_ID', resourceName }
		);
	}

	if (getQueryKey !== undefined && typeof getQueryKey !== 'function') {
		failValidation(
			`Resource "${resourceName}" store.getQueryKey must be a function`,
			'store.getQueryKey',
			{ code: 'INVALID_STORE_GET_QUERY_KEY', resourceName }
		);
	}
}
