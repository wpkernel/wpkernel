import {
	buildArg,
	buildBinaryOperation,
	buildDocComment,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildName,
	buildScalarInt,
	buildScalarString,
	mergeNodeAttributes,
	type PhpStmt,
	type PhpStmtFunction,
} from '@wpkernel/php-json-ast';
import { buildNodeFunction, buildConstFetchExpression } from './helpers';
import type { PluginLoaderProgramConfig } from './types';

export function buildBootstrapFunction(
	config: PluginLoaderProgramConfig
): PhpStmtFunction {
	const namespaceConst = buildConstFetchExpression('__NAMESPACE__');
	const restCallback = buildBinaryOperation(
		'Concat',
		namespaceConst,
		buildScalarString('\\register_wpkernel_routes')
	);
	const hasAdminMenu = Boolean(
		config.ui?.resources.some((resource) => Boolean(resource.menu))
	);

	const statements: PhpStmt[] = [
		buildExpressionStatement(
			buildFuncCall(buildName(['add_action']), [
				buildArg(buildScalarString('rest_api_init')),
				buildArg(restCallback),
			])
		),
	];

	if (
		config.contentModel &&
		(config.contentModel.postTypes.length > 0 ||
			config.contentModel.taxonomies.length > 0 ||
			config.contentModel.statuses.length > 0)
	) {
		const contentModelCallback = buildBinaryOperation(
			'Concat',
			namespaceConst,
			buildScalarString('\\register_wpkernel_content_model')
		);
		statements.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['add_action']), [
					buildArg(buildScalarString('init')),
					buildArg(contentModelCallback),
					buildArg(buildScalarInt(5)),
				])
			)
		);
	}

	if (config.ui) {
		const uiCallback = buildBinaryOperation(
			'Concat',
			namespaceConst,
			buildScalarString('\\enqueue_wpkernel_ui_assets')
		);
		statements.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['add_action']), [
					buildArg(buildScalarString('admin_enqueue_scripts')),
					buildArg(uiCallback),
				])
			)
		);
	}

	if (hasAdminMenu) {
		const adminMenuCallback = buildBinaryOperation(
			'Concat',
			namespaceConst,
			buildScalarString('\\register_wpkernel_admin_menu')
		);
		statements.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['add_action']), [
					buildArg(buildScalarString('admin_menu')),
					buildArg(adminMenuCallback),
				])
			)
		);
	}

	const fn = buildNodeFunction('bootstrap_wpk', {
		returnType: buildIdentifier('void'),
		statements,
	});

	return mergeNodeAttributes(fn, {
		comments: [
			buildDocComment([
				'Attach wpk hooks required for REST registration.',
			]),
		],
	});
}

export function buildBootstrapInvocation(): PhpStmt {
	return buildExpressionStatement(
		buildFuncCall(buildName(['bootstrap_wpk']))
	);
}
