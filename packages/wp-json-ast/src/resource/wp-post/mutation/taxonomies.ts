import {
	buildArg,
	buildAssign,
	buildBooleanNot,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildName,
	buildIfStatement,
	buildParam,
	buildReturn,
	buildScalarBool,
	buildScalarString,
	buildVariable,
	buildNull,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import {
	buildArrayLiteral,
	buildBinaryOperation,
	buildFunctionCallAssignmentStatement,
} from '../../common/utils';
import { buildReturnIfWpError } from '../../errors';
import { toSnakeCase } from '../query/utils';
import {
	ensureStorage,
	type MutationHelperOptions,
	type WpPostTaxonomyDescriptor,
} from './types';
import { buildHelperMethod } from './helper-utils';

export function syncWpPostTaxonomies(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const storage = ensureStorage(options.resource);
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;

	const statements: PhpStmt[] = [];

	if (taxonomyEntries.length === 0) {
		statements.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['unset']), [
					buildArg(buildVariable('post_id')),
					buildArg(buildVariable('request')),
				])
			)
		);
		statements.push(buildReturn(buildScalarBool(true)));

		return buildHelperMethod({
			name: `sync${options.pascalName}Taxonomies`,
			statements,
			params: [
				buildParam(buildVariable('post_id'), {
					type: buildIdentifier('int'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
		});
	}

	statements.push(
		buildExpressionStatement(
			buildAssign(buildVariable('result'), buildScalarBool(true))
		)
	);

	for (const [key, descriptor] of taxonomyEntries) {
		const variableName = `${toSnakeCase(key)}Terms`;

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
			buildIfStatement(
				buildBooleanNot(
					buildFuncCall(buildName(['is_array']), [
						buildArg(buildVariable(variableName)),
					])
				),
				[
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildArrayLiteral([
								{
									value: buildVariable(variableName),
								},
							])
						)
					),
				]
			),
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildFuncCall(buildName(['array_filter']), [
						buildArg(
							buildFuncCall(buildName(['array_map']), [
								buildArg(buildScalarString('intval')),
								buildArg(buildVariable(variableName)),
							])
						),
					])
				)
			),
			buildFunctionCallAssignmentStatement({
				variable: 'result',
				functionName: 'wp_set_object_terms',
				args: [
					buildArg(buildVariable('post_id')),
					buildArg(buildVariable(variableName)),
					buildArg(buildScalarString(descriptor.taxonomy)),
					buildArg(buildScalarBool(false)),
				],
			}),
			buildReturnIfWpError(buildVariable('result')),
		];

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

	statements.push(buildReturn(buildVariable('result')));

	return buildHelperMethod({
		name: `sync${options.pascalName}Taxonomies`,
		statements,
		params: [
			buildParam(buildVariable('post_id'), {
				type: buildIdentifier('int'),
			}),
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
	});
}
