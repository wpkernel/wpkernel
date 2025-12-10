import { buildRestControllerClass } from '../class';
import type { RestControllerClassConfig } from '../types';
import {
	buildClassMethod,
	buildIdentifier,
	buildName,
	buildParam,
	buildReturn,
	buildScalarString,
	buildVariable,
	PHP_METHOD_MODIFIER_PUBLIC,
	type PhpStmtClassMethod,
	type PhpStmt,
} from '@wpkernel/php-json-ast';

describe('buildRestControllerClass', () => {
	it('returns a class node with standard methods and collected imports', () => {
		const helperMethod = buildClassMethod(buildIdentifier('helper'), {
			flags: PHP_METHOD_MODIFIER_PUBLIC,
			params: [
				buildParam(buildVariable('post'), {
					type: buildName(['WP_Post']),
				}),
			],
			stmts: [buildReturn(buildScalarString('helper'))],
		});

		const config: RestControllerClassConfig = {
			className: 'JobController',
			resourceName: 'job',
			schemaKey: 'job',
			restArgsExpression: buildScalarString('args'),
			identity: { type: 'number', param: 'id' },
			routes: [
				{
					methodName: 'get_item',
					metadata: {
						method: 'GET',
						path: '/demo/v1/jobs/:id',
						kind: 'get',
					},
					capability: 'job.read',
					statements: [],
				},
			],
			helperMethods: [helperMethod],
			capabilityClass: 'App\\Capability\\Capability',
		};

		const result = buildRestControllerClass(config);

		expect(result.classNode).toMatchObject({
			extends: expect.objectContaining({
				parts: ['BaseController'],
			}),
		});

		const methodNames = (result.classNode.stmts ?? [])
			.filter(
				(stmt): stmt is PhpStmtClassMethod =>
					stmt.nodeType === 'Stmt_ClassMethod'
			)
			.map((stmt) => stmt.name?.name);
		expect(methodNames).toEqual(
			expect.arrayContaining([
				'get_resource_name',
				'get_schema_key',
				'get_rest_args',
				'register_routes',
				'get_item',
				'helper',
			])
		);

		expect(result.uses).toEqual(
			expect.arrayContaining([
				'WP_Error',
				'WP_REST_Request',
				'function is_wp_error',
				'App\\Capability\\Capability',
				'WP_Post',
			])
		);
	});

	it('documents register_routes and keeps permission_callback open for handler enforcement', () => {
		const config: RestControllerClassConfig = {
			className: 'DemoController',
			resourceName: 'demo',
			schemaKey: 'demo',
			restArgsExpression: buildScalarString('args'),
			identity: { type: 'number', param: 'id' },
			routes: [
				{
					methodName: 'get_item',
					metadata: {
						method: 'GET',
						path: '/demo/v1/things/:id',
						kind: 'get',
					},
					statements: [],
				},
			],
			capabilityClass: 'App\\Capability\\Capability',
		};

		const result = buildRestControllerClass(config);
		const registerRoutes = result.classNode.stmts?.find(isRegisterRoutes);

		const commentText =
			(
				registerRoutes?.attributes as
					| { comments?: { text?: string }[] }
					| undefined
			)?.comments?.[0]?.text ?? '';
		expect(commentText).toContain(
			'Register REST routes for this controller.'
		);
		expect(commentText).toContain(
			'Capability enforcement happens inside each handler via Capability::enforce,'
		);
		expect(commentText).toContain(
			'so permission_callback is intentionally __return_true here.'
		);
	});
});

function isRegisterRoutes(
	stmt: PhpStmt
): stmt is PhpStmtClassMethod & { name: { name: string } } {
	return (
		stmt.nodeType === 'Stmt_ClassMethod' &&
		(stmt as PhpStmtClassMethod).name?.name === 'register_routes'
	);
}
