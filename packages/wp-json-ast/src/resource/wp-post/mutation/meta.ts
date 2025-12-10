import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildName,
	buildParam,
	buildScalarFloat,
	buildScalarInt,
	buildScalarString,
	buildVariable,
	buildNull,
	PHP_METHOD_MODIFIER_PRIVATE,
	type PhpStmt,
	type PhpStmtClassMethod,
	buildIfStatement,
} from '@wpkernel/php-json-ast';

import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildForeachStatement,
	buildReturnVoid,
	buildScalarCast,
} from '../../common/utils';
import { toSnakeCase } from '../query/utils';
import {
	ensureStorage,
	type MutationHelperOptions,
	type WpPostMetaDescriptor,
} from './types';
import { buildHelperMethod, buildTernary, variableExpr } from './helper-utils';

export function syncWpPostMeta(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const storage = ensureStorage(options.resource);
	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;

	const statements: PhpStmt[] = [];

	if (metaEntries.length === 0) {
		statements.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['unset']), [
					buildArg(buildVariable('post_id')),
					buildArg(buildVariable('request')),
				])
			)
		);
		statements.push(buildReturnVoid());

		return buildHelperMethod({
			name: `sync${options.pascalName}Meta`,
			statements,
			params: [
				buildParam(buildVariable('post_id'), {
					type: buildIdentifier('int'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			returnType: buildIdentifier('void'),
			flags: PHP_METHOD_MODIFIER_PRIVATE,
		});
	}

	for (const [key, descriptor] of metaEntries) {
		const variableName = `${toSnakeCase(key)}Meta`;

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildFuncCall(
						buildName(['rest_sanitize_value_from_request']),
						[
							buildArg(buildScalarString(key)),
							buildArg(buildVariable('request')),
						]
					)
				)
			)
		);

		const branchStatements: PhpStmt[] = [
			...buildMetaSanitizerStatements(variableName, descriptor),
		];

		if (descriptor?.single === false) {
			branchStatements.push(
				buildExpressionStatement(
					buildFuncCall(buildName(['delete_post_meta']), [
						buildArg(buildVariable('post_id')),
						buildArg(buildScalarString(key)),
					])
				)
			);

			branchStatements.push(
				buildForeachStatement({
					iterable: buildScalarCast(
						'array',
						buildVariable(variableName)
					),
					value: 'value',
					statements: [
						buildExpressionStatement(
							buildFuncCall(buildName(['add_post_meta']), [
								buildArg(buildVariable('post_id')),
								buildArg(buildScalarString(key)),
								buildArg(buildVariable('value')),
							])
						),
					],
				})
			);
		} else {
			branchStatements.push(
				buildExpressionStatement(
					buildFuncCall(buildName(['update_post_meta']), [
						buildArg(buildVariable('post_id')),
						buildArg(buildScalarString(key)),
						buildArg(buildVariable(variableName)),
					])
				)
			);
		}

		statements.push(
			buildIfStatement(
				buildBinaryOperation(
					'NotIdentical',
					buildNull(),
					buildVariable(variableName)
				),
				branchStatements
			)
		);
	}

	return buildHelperMethod({
		name: `sync${options.pascalName}Meta`,
		statements,
		params: [
			buildParam(buildVariable('post_id'), {
				type: buildIdentifier('int'),
			}),
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
		returnType: buildIdentifier('void'),
		flags: PHP_METHOD_MODIFIER_PRIVATE,
	});
}

function buildMetaSanitizerStatements(
	variableName: string,
	descriptor: WpPostMetaDescriptor
): PhpStmt[] {
	const statements: PhpStmt[] = [];
	const valueType = descriptor?.type ?? 'string';

	switch (valueType) {
		case 'integer': {
			const condition = buildFuncCall(buildName(['is_numeric']), [
				buildArg(variableExpr(variableName)),
			]);
			const ternary = buildTernary(
				condition,
				buildScalarCast('int', variableExpr(variableName)),
				buildScalarInt(0)
			);
			statements.push(
				buildExpressionStatement(
					buildAssign(variableExpr(variableName), ternary)
				)
			);
			break;
		}
		case 'number': {
			const condition = buildFuncCall(buildName(['is_numeric']), [
				buildArg(variableExpr(variableName)),
			]);
			const ternary = buildTernary(
				condition,
				buildScalarCast('float', variableExpr(variableName)),
				buildScalarFloat(0)
			);
			statements.push(
				buildExpressionStatement(
					buildAssign(variableExpr(variableName), ternary)
				)
			);
			break;
		}
		case 'boolean': {
			statements.push(
				buildExpressionStatement(
					buildAssign(
						variableExpr(variableName),
						buildFuncCall(buildName(['rest_sanitize_boolean']), [
							buildArg(variableExpr(variableName)),
						])
					)
				)
			);
			break;
		}
		case 'array': {
			statements.push(
				buildExpressionStatement(
					buildAssign(
						variableExpr(variableName),
						buildFuncCall(buildName(['array_values']), [
							buildArg(
								buildScalarCast(
									'array',
									variableExpr(variableName)
								)
							),
						])
					)
				)
			);
			break;
		}
		case 'object': {
			const condition = buildFuncCall(buildName(['is_array']), [
				buildArg(variableExpr(variableName)),
			]);
			const ternary = buildTernary(
				condition,
				variableExpr(variableName),
				buildArrayLiteral([])
			);
			statements.push(
				buildExpressionStatement(
					buildAssign(variableExpr(variableName), ternary)
				)
			);
			break;
		}
		default: {
			const condition = buildFuncCall(buildName(['is_string']), [
				buildArg(variableExpr(variableName)),
			]);
			const ternary = buildTernary(
				condition,
				variableExpr(variableName),
				buildScalarCast('string', variableExpr(variableName))
			);
			statements.push(
				buildExpressionStatement(
					buildAssign(variableExpr(variableName), ternary)
				)
			);
		}
	}

	return statements;
}
