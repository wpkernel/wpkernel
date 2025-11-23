import {
	buildArg,
	buildArray,
	buildArrayItem,
	buildAssign,
	buildBinaryOperation,
	buildBooleanNot,
	buildContinue,
	buildDocComment,
	buildExpressionStatement,
	buildForeach,
	buildFuncCall,
	buildFullyQualifiedName,
	buildIdentifier,
	buildIfStatement,
	buildMethodCall,
	buildName,
	buildNew,
	buildReturn,
	buildScalarString,
	buildVariable,
	mergeNodeAttributes,
	type PhpStmtFunction,
} from '@wpkernel/php-json-ast';
import {
	buildConstFetchExpression,
	buildNodeFunction,
	normaliseRelativeDirectory,
	splitNamespace,
} from './helpers';
import type { PluginLoaderProgramConfig } from './types';

export function buildGetControllersFunction(
	config: PluginLoaderProgramConfig
): PhpStmtFunction {
	const phpGeneratedPath = normaliseRelativeDirectory(
		config.phpGeneratedPath
	);
	const classmapPathSuffix =
		phpGeneratedPath.length > 0
			? `${phpGeneratedPath}/index.php`
			: 'index.php';

	const returnArray = buildArray(
		config.resourceClassNames.map((className) =>
			buildArrayItem(
				buildNew(buildFullyQualifiedName(splitNamespace(className)))
			)
		)
	);

	const fn = buildNodeFunction('get_wpkernel_controllers', {
		returnType: buildIdentifier('array'),
		statements: [
			buildExpressionStatement(
				buildAssign(
					buildVariable('classmapPath'),
					buildBinaryOperation(
						'Concat',
						buildFuncCall(buildName(['plugin_dir_path']), [
							buildArg(buildConstFetchExpression('__FILE__')),
						]),
						buildScalarString(`${classmapPathSuffix}`)
					)
				)
			),
			buildIfStatement(
				buildFuncCall(buildName(['file_exists']), [
					buildArg(buildVariable('classmapPath')),
				]),
				[
					buildExpressionStatement(
						buildAssign(
							buildVariable('classmap'),
							buildFuncCall(buildName(['require']), [
								buildArg(buildVariable('classmapPath')),
							])
						)
					),
					buildIfStatement(
						buildFuncCall(buildName(['is_array']), [
							buildArg(buildVariable('classmap')),
						]),
						[
							buildForeach(buildVariable('classmap'), {
								keyVar: buildVariable('class'),
								valueVar: buildVariable('path'),
								stmts: [
									buildIfStatement(
										buildBinaryOperation(
											'BooleanAnd',
											buildBooleanNot(
												buildFuncCall(
													buildName(['class_exists']),
													[
														buildArg(
															buildVariable(
																'class'
															)
														),
													]
												)
											),
											buildFuncCall(
												buildName(['file_exists']),
												[
													buildArg(
														buildVariable('path')
													),
												]
											)
										),
										[
											buildExpressionStatement(
												buildFuncCall(
													buildName(['require_once']),
													[
														buildArg(
															buildVariable(
																'path'
															)
														),
													]
												)
											),
										]
									),
								],
							}),
						]
					),
				]
			),
			buildReturn(returnArray),
		],
	});

	return mergeNodeAttributes(fn, {
		comments: [
			buildDocComment([
				'Retrieve WPKernel REST controllers generated for this plugin.',
				'@return array<int, object>',
			]),
		],
	});
}

export function buildRegisterRoutesFunction(): PhpStmtFunction {
	const controllersAssignment = buildExpressionStatement(
		buildAssign(
			buildVariable('controllers'),
			buildFuncCall(buildName(['get_wpkernel_controllers']))
		)
	);

	const methodExistsCall = buildFuncCall(buildName(['method_exists']), [
		buildArg(buildVariable('controller')),
		buildArg(buildScalarString('register_routes')),
	]);

	const guard = buildIfStatement(buildBooleanNot(methodExistsCall), [
		buildContinue(),
	]);

	const registerCall = buildExpressionStatement(
		buildMethodCall(
			buildVariable('controller'),
			buildIdentifier('register_routes')
		)
	);

	const foreachLoop = buildForeach(buildVariable('controllers'), {
		valueVar: buildVariable('controller'),
		stmts: [guard, registerCall],
	});

	const fn = buildNodeFunction('register_wpkernel_routes', {
		returnType: buildIdentifier('void'),
		statements: [controllersAssignment, foreachLoop],
	});

	return mergeNodeAttributes(fn, {
		comments: [
			buildDocComment([
				'Register WPKernel REST controllers with WordPress.',
			]),
		],
	});
}
