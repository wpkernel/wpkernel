import {
	buildArg,
	buildArray,
	buildArrayDimFetch,
	buildArrayItem,
	buildAssign,
	buildBinaryOperation,
	buildClassMethod,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildNull,
	buildParam,
	buildReturn,
	buildScalarBool,
	buildScalarString,
	buildStaticCall,
	buildTernary,
	buildVariable,
	PHP_METHOD_MODIFIER_PRIVATE,
	PHP_METHOD_MODIFIER_PUBLIC,
	PHP_METHOD_MODIFIER_STATIC,
	type PhpStmt,
	type PhpStmtClassMethod,
} from '@wpkernel/php-json-ast';

import {
	buildDocCommentAttributes,
	buildCapabilityEnforceDocblock,
} from '../common/docblock';

/**
 * @category WordPress AST
 */
export function buildEnforceMethod(): PhpStmtClassMethod {
	const docblock = buildCapabilityEnforceDocblock();

	const definitionAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('definition'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('get_definition'),
				[buildArg(buildVariable('capability_key'))]
			)
		)
	);

	const fallbackAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('fallback'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('fallback'),
				[]
			)
		)
	);

	const capabilityAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('capability'),
			buildTernary(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('definition'),
							buildScalarString('capability')
						)
					),
				]),
				buildArrayDimFetch(
					buildVariable('definition'),
					buildScalarString('capability')
				),
				buildArrayDimFetch(
					buildVariable('fallback'),
					buildScalarString('capability')
				)
			)
		)
	);

	const runtimeCapabilityAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('runtime_capability'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('resolve_capability'),
				[
					buildArg(buildVariable('capability')),
					buildArg(buildVariable('fallback')),
				]
			)
		)
	);

	const scopeAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('scope'),
			buildTernary(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('definition'),
							buildScalarString('appliesTo')
						)
					),
				]),
				buildArrayDimFetch(
					buildVariable('definition'),
					buildScalarString('appliesTo')
				),
				buildArrayDimFetch(
					buildVariable('fallback'),
					buildScalarString('appliesTo')
				)
			)
		)
	);

	const allowedDefaultAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('allowed'),
			buildFuncCall(buildName(['current_user_can']), [
				buildArg(buildVariable('runtime_capability')),
			])
		)
	);

	const bindingAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('binding'),
			buildStaticCall(
				buildName(['self']),
				buildIdentifier('get_binding'),
				[buildArg(buildVariable('definition'))]
			)
		)
	);

	const ensureBindingStatement = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildVariable('binding'),
			buildNull()
		),
		[
			buildExpressionStatement(
				buildAssign(buildVariable('binding'), buildScalarString('id'))
			),
		]
	);

	const objectIdAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('object_id'),
			buildMethodCall(
				buildVariable('request'),
				buildIdentifier('get_param'),
				[buildArg(buildVariable('binding'))]
			)
		)
	);

	const missingObjectGuard = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildVariable('object_id'),
			buildNull()
		),
		[
			buildReturn(
				buildStaticCall(
					buildName(['self']),
					buildIdentifier('create_error'),
					[
						buildArg(
							buildScalarString('wpk_capability_object_missing')
						),
						buildArg(
							buildFuncCall(buildName(['sprintf']), [
								buildArg(
									buildScalarString(
										'Object identifier parameter "%s" missing for capability "%s".'
									)
								),
								buildArg(buildVariable('binding')),
								buildArg(buildVariable('capability_key')),
							])
						),
					]
				)
			),
		]
	);

	const allowedObjectAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('allowed'),
			buildFuncCall(buildName(['current_user_can']), [
				buildArg(buildVariable('runtime_capability')),
				buildArg(buildVariable('object_id')),
			])
		)
	);

	const objectScopeBlock = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildScalarString('object'),
			buildVariable('scope')
		),
		[
			bindingAssign,
			ensureBindingStatement,
			objectIdAssign,
			missingObjectGuard,
			allowedObjectAssign,
		]
	);

	const allowedGuard = buildIfStatement(buildVariable('allowed'), [
		buildReturn(buildScalarBool(true)),
	]);

	const deniedReturn = buildReturn(
		buildStaticCall(buildName(['self']), buildIdentifier('create_error'), [
			buildArg(buildScalarString('wpk_capability_denied')),
			buildArg(
				buildScalarString('You are not allowed to perform this action.')
			),
			buildArg(
				buildArray([
					buildArrayItem(buildVariable('capability_key'), {
						key: buildScalarString('capability'),
					}),
					buildArrayItem(buildVariable('capability'), {
						key: buildScalarString('capability'),
					}),
				])
			),
		])
	);

	const statements: PhpStmt[] = [
		definitionAssign,
		fallbackAssign,
		capabilityAssign,
		runtimeCapabilityAssign,
		scopeAssign,
		allowedDefaultAssign,
		objectScopeBlock,
		allowedGuard,
		deniedReturn,
	];

	return buildClassMethod(
		buildIdentifier('enforce'),
		{
			flags: PHP_METHOD_MODIFIER_PUBLIC + PHP_METHOD_MODIFIER_STATIC,
			params: [
				buildParam(buildVariable('capability_key'), {
					type: buildIdentifier('string'),
				}),
				buildParam(buildVariable('request'), {
					type: buildName(['WP_REST_Request']),
				}),
			],
			stmts: statements,
		},
		buildDocCommentAttributes(docblock)
	);
}

export function buildResolveCapabilityMethod(): PhpStmtClassMethod {
	const fallbackCapabilityAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('fallback_capability'),
			buildTernary(
				buildBinaryOperation(
					'BooleanAnd',
					buildFuncCall(buildName(['isset']), [
						buildArg(
							buildArrayDimFetch(
								buildVariable('fallback'),
								buildScalarString('capability')
							)
						),
					]),
					buildFuncCall(buildName(['is_string']), [
						buildArg(
							buildArrayDimFetch(
								buildVariable('fallback'),
								buildScalarString('capability')
							)
						),
					])
				),
				buildArrayDimFetch(
					buildVariable('fallback'),
					buildScalarString('capability')
				),
				buildScalarString('manage_options')
			)
		)
	);

	const sameGuard = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildVariable('capability'),
			buildVariable('fallback_capability')
		),
		[buildReturn(buildVariable('capability'))]
	);

	const roleAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('role'),
			buildFuncCall(buildName(['get_role']), [
				buildArg(buildScalarString('administrator')),
			])
		)
	);

	const roleGuard = buildIfStatement(
		buildBinaryOperation(
			'BooleanAnd',
			buildVariable('role'),
			buildMethodCall(buildVariable('role'), buildIdentifier('has_cap'), [
				buildArg(buildVariable('capability')),
			])
		),
		[buildReturn(buildVariable('capability'))]
	);

	const statements: PhpStmt[] = [
		fallbackCapabilityAssign,
		sameGuard,
		buildIfStatement(
			buildFuncCall(buildName(['function_exists']), [
				buildArg(buildScalarString('get_role')),
			]),
			[roleAssign, roleGuard]
		),
		buildReturn(buildVariable('fallback_capability')),
	];

	return buildClassMethod(buildIdentifier('resolve_capability'), {
		flags: PHP_METHOD_MODIFIER_PRIVATE + PHP_METHOD_MODIFIER_STATIC,
		params: [
			buildParam(buildVariable('capability'), {
				type: buildIdentifier('string'),
			}),
			buildParam(buildVariable('fallback'), {
				type: buildIdentifier('array'),
			}),
		],
		returnType: buildIdentifier('string'),
		stmts: statements,
	});
}
