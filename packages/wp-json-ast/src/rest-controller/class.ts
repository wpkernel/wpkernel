import {
	buildClass,
	buildClassMethod,
	buildExpressionStatement,
	buildIdentifier,
	buildName,
	buildArray,
	buildArrayItem,
	buildArg,
	buildFuncCall,
	buildVariable,
	buildReturn,
	buildScalarString,
	buildDocComment,
	buildComment,
	buildStmtNop,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpExpr,
	type PhpStmtClassMethod,
	type PhpStmtClass,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

import type {
	RestControllerClassBuildResult,
	RestControllerClassConfig,
	RestControllerIdentity,
	RestRouteConfig,
} from './types';
import { buildRestRoute } from './route';
import { deriveRestControllerImports } from './imports';

/**
 * @param    config
 * @category WordPress AST
 */
export function buildRestControllerClass(
	config: RestControllerClassConfig
): RestControllerClassBuildResult {
	const methods = buildControllerMethods(config);

	const classNode: PhpStmtClass = buildClass(
		buildIdentifier(config.className),
		{
			extends: buildName(['BaseController']),
			stmts: methods,
		}
	);

	const imports = deriveRestControllerImports(config.routes, {
		capabilityClass: config.capabilityClass,
		helperMethods: config.helperMethods,
	});

	return {
		classNode,
		uses: [...imports],
	};
}

function buildControllerMethods(
	config: RestControllerClassConfig
): PhpStmtClassMethod[] {
	const routeMethods = config.routes.map((route) =>
		buildRestRoute({
			route,
			identity: config.identity,
		})
	);

	return [
		buildGetResourceNameMethod(config.resourceName),
		buildGetSchemaKeyMethod(config.schemaKey),
		buildGetRestArgsMethod(config.restArgsExpression),
		buildRegisterRoutesMethod(config),
		...routeMethods,
		...Array.from(config.helperMethods ?? []),
	];
}

function buildGetResourceNameMethod(resourceName: string): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_resource_name'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('string'),
		stmts: [buildReturnScalar(resourceName)],
	});
}

function buildGetSchemaKeyMethod(schemaKey: string): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_schema_key'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('string'),
		stmts: [buildReturnScalar(schemaKey)],
	});
}

function buildGetRestArgsMethod(expression: PhpExpr): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier('get_rest_args'), {
		flags: PHP_METHOD_MODIFIER_PUBLIC,
		returnType: buildIdentifier('array'),
		stmts: [buildReturn(expression)],
	});
}

function buildRegisterRoutesMethod(
	config: RestControllerClassConfig
): PhpStmtClassMethod {
	const routesByPath = groupRoutesByPath(config.routes, config.identity);

	const registerCalls: PhpStmt[] = [];

	for (const { namespace, route, handlers } of routesByPath.values()) {
		registerCalls.push(
			buildStmtNop({
				comments: [
					buildComment(
						'// permission_callback is __return_true; capabilities enforced inside handlers.'
					),
				],
			})
		);
		registerCalls.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['register_rest_route']), [
					buildArg(buildScalarString(namespace)),
					buildArg(buildScalarString(route)),
					buildArg(buildArray(handlers)),
				])
			)
		);
	}

	const method = buildClassMethod(
		buildIdentifier('register_routes'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			returnType: buildIdentifier('void'),
			stmts: registerCalls,
		},
		{
			comments: [
				buildDocComment([
					'Register REST routes for this controller.',
					'Capability enforcement happens inside each handler via Capability::enforce,',
					'so permission_callback is intentionally __return_true here.',
				]),
			],
		}
	);

	return method;
}

function groupRoutesByPath(
	routes: readonly RestRouteConfig[],
	identity: RestControllerIdentity
): Map<
	string,
	{
		namespace: string;
		route: string;
		handlers: ReturnType<typeof buildArrayItem>[];
	}
> {
	const grouped = new Map<
		string,
		{
			namespace: string;
			route: string;
			handlers: ReturnType<typeof buildArrayItem>[];
		}
	>();

	for (const route of routes) {
		const { namespace, route: routePath } = splitNamespaceAndRoute(
			route.metadata.path
		);
		const pattern = buildRoutePattern(routePath, identity);
		const key = `${namespace}|${pattern}`;

		const handler = buildArrayItem(
			buildArray([
				buildArrayItem(buildScalarString(route.metadata.method), {
					key: buildScalarString('methods'),
				}),
				buildArrayItem(
					buildArray([
						buildArrayItem(buildVariable('this'), {
							key: null,
						}),
						buildArrayItem(buildScalarString(route.methodName), {
							key: null,
						}),
					]),
					{ key: buildScalarString('callback') }
				),
				buildArrayItem(buildScalarString('__return_true'), {
					key: buildScalarString('permission_callback'),
				}),
			])
		);

		if (!grouped.has(key)) {
			grouped.set(key, {
				namespace,
				route: pattern,
				handlers: [handler],
			});
			continue;
		}

		grouped.get(key)!.handlers.push(handler);
	}

	return grouped;
}

function splitNamespaceAndRoute(path: string): {
	namespace: string;
	route: string;
} {
	const trimmed = path.replace(/^\/+/, '');
	const segments = trimmed.split('/').filter(Boolean);
	if (segments.length === 0) {
		return { namespace: '', route: '/' };
	}

	const namespace =
		segments.length >= 2 ? `${segments[0]!}/${segments[1]!}` : segments[0]!;
	const routeSegments = segments.slice(namespace.split('/').length);
	const route =
		routeSegments.length > 0 ? `/${routeSegments.join('/')}` : '/';

	return { namespace, route };
}

function buildRoutePattern(
	route: string,
	identity: RestControllerIdentity
): string {
	if (!route) {
		return '/';
	}
	if (!route.includes(':')) {
		return route;
	}

	const segments = route.split('/').filter((segment) => segment.length > 0);
	const rewritten = segments
		.map((segment) => {
			if (!segment.startsWith(':')) {
				return segment;
			}
			const param = segment.slice(1);
			const pattern =
				param === identity.param && identity.type === 'number'
					? '[\\\\d]+'
					: '[\\\\w-]+';
			return `(?P<${param}>${pattern})`;
		})
		.join('/');

	return `/${rewritten}`;
}

function buildReturnScalar(value: string) {
	return buildReturn(buildScalarString(value));
}
