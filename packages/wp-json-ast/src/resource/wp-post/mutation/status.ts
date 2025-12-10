import {
	buildArg,
	buildAssign,
	buildClassMethod,
	buildExpressionStatement,
	buildForeach,
	buildFuncCall,
	buildIdentifier,
	buildMethodCall,
	buildName,
	buildIfStatement,
	buildParam,
	buildPropertyFetch,
	buildReturn,
	buildScalarBool,
	buildScalarCast,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildNull,
	PHP_METHOD_MODIFIER_PROTECTED,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import {
	buildArrayDimFetch,
	buildBinaryOperation,
	buildArrayLiteral,
	buildBooleanNot as buildBooleanNotExpr,
	buildInstanceof,
} from '../../common/utils';
import { buildHelperMethod, buildTernary } from './helper-utils';
import { ensureStorage, type MutationHelperOptions } from './types';

export function buildGetPostTypeHelper(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const storage = ensureStorage(options.resource);
	const postType = storage.postType ?? options.resource.name;

	return buildClassMethod(
		buildIdentifier(`get${options.pascalName}PostType`),
		{
			flags: PHP_METHOD_MODIFIER_PROTECTED,
			params: [],
			returnType: buildIdentifier('string'),
			stmts: [buildReturn(buildScalarString(postType))],
		}
	);
}

export function buildGetStatusesHelper(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const storage = ensureStorage(options.resource);
	const statuses =
		storage.statuses && storage.statuses.length > 0
			? storage.statuses
			: ['publish', 'draft'];

	return buildClassMethod(
		buildIdentifier(`get${options.pascalName}Statuses`),
		{
			flags: PHP_METHOD_MODIFIER_PROTECTED,
			params: [],
			returnType: buildIdentifier('array'),
			stmts: [
				buildReturn(
					buildArrayLiteral(
						statuses.map((status) => ({
							value: buildScalarString(status),
						}))
					)
				),
			],
		}
	);
}

export function buildNormaliseStatusHelper(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const pascal = options.pascalName;
	const statements: PhpStmt[] = [];

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('allowed'),
				buildMethodCall(
					buildVariable('this'),
					buildIdentifier(`get${pascal}Statuses`)
				)
			)
		)
	);

	statements.push(
		buildExpressionStatement(
			buildAssign(
				buildVariable('candidate'),
				buildTernary(
					buildFuncCall(buildName(['is_string']), [
						buildArg(buildVariable('status')),
					]),
					buildFuncCall(buildName(['strtolower']), [
						buildArg(buildVariable('status')),
					]),
					buildScalarString('')
				)
			)
		)
	);

	statements.push(
		buildForeach(buildVariable('allowed'), {
			valueVar: buildVariable('value'),
			stmts: [
				buildIfStatement(
					buildBinaryOperation(
						'Identical',
						buildVariable('candidate'),
						buildFuncCall(buildName(['strtolower']), [
							buildArg(buildVariable('value')),
						])
					),
					[buildReturn(buildVariable('value'))]
				),
			],
		})
	);

	statements.push(
		buildExpressionStatement(
			buildAssign(buildVariable('fallback'), buildScalarString('draft'))
		)
	);

	statements.push(
		buildIfStatement(
			buildBooleanNotExpr(
				buildFuncCall(buildName(['in_array']), [
					buildArg(buildScalarString('draft')),
					buildArg(buildVariable('allowed')),
					buildArg(buildScalarBool(true)),
				])
			),
			[
				buildIfStatement(
					buildBooleanNotExpr(
						buildFuncCall(buildName(['empty']), [
							buildArg(buildVariable('allowed')),
						])
					),
					[
						buildExpressionStatement(
							buildAssign(
								buildVariable('fallback'),
								buildArrayDimFetch('allowed', buildScalarInt(0))
							)
						),
					]
				),
			]
		)
	);

	statements.push(buildReturn(buildVariable('fallback')));

	return buildClassMethod(buildIdentifier(`normalise${pascal}Status`), {
		flags: PHP_METHOD_MODIFIER_PROTECTED,
		params: [buildParam(buildVariable('status'))],
		returnType: buildIdentifier('string'),
		stmts: statements,
	});
}

export function buildResolvePostHelper(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const pascal = options.pascalName;
	const identityParam = options.identity.param;
	const postTypeCall = buildMethodCall(
		buildVariable('this'),
		buildIdentifier(`get${pascal}PostType`)
	);

	const statements: PhpStmt[] = [];

	if (options.identity.type === 'number') {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable('post_id'),
					buildTernary(
						buildFuncCall(buildName(['is_numeric']), [
							buildArg(buildVariable(identityParam)),
						]),
						buildScalarCast('int', buildVariable(identityParam)),
						buildScalarInt(0)
					)
				)
			)
		);

		statements.push(
			buildIfStatement(
				buildBinaryOperation(
					'SmallerOrEqual',
					buildVariable('post_id'),
					buildScalarInt(0)
				),
				[buildReturn(buildNull())]
			)
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable('post'),
					buildFuncCall(buildName(['get_post']), [
						buildArg(buildVariable('post_id')),
					])
				)
			)
		);

		statements.push(
			buildIfStatement(
				buildBooleanNotExpr(buildInstanceof('post', 'WP_Post')),
				[buildReturn(buildNull())]
			)
		);

		statements.push(
			buildIfStatement(
				buildBinaryOperation(
					'NotIdentical',
					buildPropertyFetch(
						buildVariable('post'),
						buildIdentifier('post_type')
					),
					postTypeCall
				),
				[buildReturn(buildNull())]
			)
		);

		statements.push(buildReturn(buildVariable('post')));
	} else {
		statements.push(
			buildExpressionStatement(
				buildAssign(buildVariable('post_type'), postTypeCall)
			)
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable('slug'),
					buildTernary(
						buildFuncCall(buildName(['is_string']), [
							buildArg(buildVariable(identityParam)),
						]),
						buildFuncCall(buildName(['trim']), [
							buildArg(buildVariable(identityParam)),
						]),
						buildScalarString('')
					)
				)
			)
		);

		statements.push(
			buildIfStatement(
				buildBinaryOperation(
					'Identical',
					buildVariable('slug'),
					buildScalarString('')
				),
				[buildReturn(buildNull())]
			)
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable('posts'),
					buildFuncCall(buildName(['get_posts']), [
						buildArg(
							buildArrayLiteral([
								{
									key: 'post_type',
									value: buildVariable('post_type'),
								},
								{
									key: 'posts_per_page',
									value: buildScalarInt(1),
								},
								{
									key: 'fields',
									value: buildScalarString('all'),
								},
								{
									key: 'meta_key',
									value: buildScalarString('uuid'),
								},
								{
									key: 'meta_value',
									value: buildVariable('slug'),
								},
							])
						),
					])
				)
			)
		);

		statements.push(
			buildIfStatement(
				buildBooleanNotExpr(
					buildFuncCall(buildName(['empty']), [
						buildArg(buildVariable('posts')),
					])
				),
				[buildReturn(buildArrayDimFetch('posts', buildScalarInt(0)))]
			)
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable('post'),
					buildFuncCall(buildName(['get_page_by_path']), [
						buildArg(buildVariable('slug')),
						buildArg(buildScalarString('OBJECT')),
						buildArg(buildVariable('post_type')),
					])
				)
			)
		);

		statements.push(
			buildIfStatement(buildInstanceof('post', 'WP_Post'), [
				buildReturn(buildVariable('post')),
			])
		);

		statements.push(buildReturn(buildNull()));
	}

	return buildHelperMethod({
		name: `resolve${pascal}Post`,
		statements,
		params: [buildParam(buildVariable(identityParam))],
		flags: PHP_METHOD_MODIFIER_PROTECTED,
	});
}
