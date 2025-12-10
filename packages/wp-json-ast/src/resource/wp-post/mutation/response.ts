import {
	buildArg,
	buildAssign,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildName,
	buildParam,
	buildReturn,
	buildScalarBool,
	buildScalarCast,
	buildScalarString,
	buildVariable,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import {
	buildArrayDimFetch,
	buildArrayLiteral,
	buildPropertyFetch,
} from '../../common/utils';
import { buildIsWpErrorGuard } from '../../errors';
import { toSnakeCase } from '../query/utils';
import {
	ensureStorage,
	type MutationHelperOptions,
	type WpPostMetaDescriptor,
	type WpPostTaxonomyDescriptor,
} from './types';
import { buildHelperMethod } from './helper-utils';

export function prepareWpPostResponse(
	options: MutationHelperOptions
): PhpStmtClassMethod {
	const storage = ensureStorage(options.resource);
	const metaEntries = Object.entries(storage.meta ?? {}) as Array<
		[string, WpPostMetaDescriptor]
	>;
	const taxonomyEntries = Object.entries(storage.taxonomies ?? {}) as Array<
		[string, WpPostTaxonomyDescriptor]
	>;
	const supports = new Set<string>(storage.supports ?? []);

	const statements: PhpStmt[] = [];

	const baseItems = [
		{
			key: 'id',
			value: buildScalarCast('int', buildPropertyFetch('post', 'ID')),
		},
		{
			key: 'status',
			value: buildScalarCast(
				'string',
				buildPropertyFetch('post', 'post_status')
			),
		},
	];

	if (options.identity.param === 'slug') {
		baseItems.splice(1, 0, {
			key: 'slug',
			value: buildScalarCast(
				'string',
				buildPropertyFetch('post', 'post_name')
			),
		});
	}

	statements.push(
		buildExpressionStatement(
			buildAssign(buildVariable('data'), buildArrayLiteral(baseItems))
		)
	);

	appendSupportAssignments(statements, supports);

	for (const [key, descriptor] of metaEntries) {
		const variableName = `${toSnakeCase(key)}Meta`;
		const fetchFlag = descriptor?.single === false ? false : true;

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildFuncCall(buildName(['get_post_meta']), [
						buildArg(buildPropertyFetch('post', 'ID')),
						buildArg(buildScalarString(key)),
						buildArg(buildScalarBool(fetchFlag)),
					])
				)
			)
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString(key)),
					buildVariable(variableName)
				)
			)
		);
	}

	for (const [key, descriptor] of taxonomyEntries) {
		const variableName = `${toSnakeCase(key)}Terms`;

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildFuncCall(buildName(['wp_get_object_terms']), [
						buildArg(buildPropertyFetch('post', 'ID')),
						buildArg(buildScalarString(descriptor.taxonomy)),
						buildArg(
							buildArrayLiteral([
								{
									key: 'fields',
									value: buildScalarString('ids'),
								},
							])
						),
					])
				)
			)
		);

		statements.push(
			buildIsWpErrorGuard({
				expression: buildVariable(variableName),
				statements: [
					buildExpressionStatement(
						buildAssign(
							buildVariable(variableName),
							buildArrayLiteral([])
						)
					),
				],
			})
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildVariable(variableName),
					buildFuncCall(buildName(['array_map']), [
						buildArg(buildScalarString('intval')),
						buildArg(buildVariable(variableName)),
					])
				)
			)
		);

		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString(key)),
					buildVariable(variableName)
				)
			)
		);
	}

	statements.push(buildReturn(buildVariable('data')));

	return buildHelperMethod({
		name: `prepare${options.pascalName}Response`,
		statements,
		params: [
			buildParam(buildVariable('post'), {
				type: buildName(['WP_Post']),
			}),
			buildParam(buildVariable('request'), {
				type: buildName(['WP_REST_Request']),
			}),
		],
		returnType: buildIdentifier('array'),
	});
}

function appendSupportAssignments(
	statements: PhpStmt[],
	supports: ReadonlySet<string>
): void {
	if (supports.has('title')) {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString('title')),
					buildScalarCast(
						'string',
						buildPropertyFetch('post', 'post_title')
					)
				)
			)
		);
	}

	if (supports.has('editor')) {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString('content')),
					buildScalarCast(
						'string',
						buildPropertyFetch('post', 'post_content')
					)
				)
			)
		);
	}

	if (supports.has('excerpt')) {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString('excerpt')),
					buildScalarCast(
						'string',
						buildPropertyFetch('post', 'post_excerpt')
					)
				)
			)
		);
	}

	if (supports.has('custom-fields')) {
		statements.push(
			buildExpressionStatement(
				buildAssign(
					buildArrayDimFetch('data', buildScalarString('meta')),
					buildFuncCall(buildName(['get_post_meta']), [
						buildArg(buildPropertyFetch('post', 'ID')),
					])
				)
			)
		);
	}
}
