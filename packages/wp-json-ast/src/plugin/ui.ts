import {
	buildArg,
	buildArray,
	buildArrayDimFetch,
	buildArrayItem,
	buildAssign,
	buildBinaryOperation,
	buildBooleanNot,
	buildContinue,
	buildDocComment,
	buildExpressionStatement,
	buildForeach,
	buildFuncCall,
	buildIdentifier,
	buildIfStatement,
	buildName,
	buildReturn,
	buildScalarString,
	buildTernary,
	buildVariable,
	mergeNodeAttributes,
	type PhpStmt,
	type PhpStmtFunction,
} from '@wpkernel/php-json-ast';
import {
	buildNodeFunction,
	buildElseBranch,
	buildConstFetchExpression,
	buildLocalizationArray,
	buildMenuLocalizationArray,
} from './helpers';
import type { PluginLoaderProgramConfig } from './types';

export function buildRegisterUiAssetsFunction(
	config: PluginLoaderProgramConfig
): PhpStmtFunction | null {
	const ui = config.ui;
	if (!ui || ui.resources.length === 0) {
		return null;
	}

	const pluginPages = ui.resources
		.map((resource) => resource.menu?.slug)
		.filter((slug): slug is string => Boolean(slug && slug.length > 0));

	const pageAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('page'),
			buildTernary(
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('_GET'),
							buildScalarString('page')
						)
					),
				]),
				buildFuncCall(buildName(['sanitize_key']), [
					buildArg(
						buildFuncCall(buildName(['strval']), [
							buildArg(
								buildArrayDimFetch(
									buildVariable('_GET'),
									buildScalarString('page')
								)
							),
						])
					),
				]),
				buildScalarString('')
			)
		)
	);

	const pluginPagesAssign =
		pluginPages.length > 0
			? buildExpressionStatement(
					buildAssign(
						buildVariable('plugin_pages'),
						buildArray(
							pluginPages.map((slug) =>
								buildArrayItem(buildScalarString(slug))
							)
						)
					)
				)
			: null;

	const guardNonPluginPage =
		pluginPagesAssign && pluginPages.length > 0
			? buildIfStatement(
					buildBooleanNot(
						buildFuncCall(buildName(['in_array']), [
							buildArg(buildVariable('page')),
							buildArg(buildVariable('plugin_pages')),
							buildArg(buildConstFetchExpression('true')),
						])
					),
					[buildReturn(null)]
				)
			: null;

	const assetPathAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('asset_path'),
			buildBinaryOperation(
				'Concat',
				buildFuncCall(buildName(['plugin_dir_path']), [
					buildArg(buildConstFetchExpression('__FILE__')),
				]),
				buildScalarString(ui.assetPath)
			)
		)
	);

	const guardMissingAsset = buildIfStatement(
		buildBooleanNot(
			buildFuncCall(buildName(['file_exists']), [
				buildArg(buildVariable('asset_path')),
			])
		),
		[buildReturn(null)]
	);

	const assetContentsAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('asset_contents'),
			buildFuncCall(buildName(['file_get_contents']), [
				buildArg(buildVariable('asset_path')),
			])
		)
	);

	const guardUnreadableAsset = buildIfStatement(
		buildBinaryOperation(
			'Identical',
			buildVariable('asset_contents'),
			buildConstFetchExpression('false')
		),
		[buildReturn(null)]
	);

	const decodeAsset = buildExpressionStatement(
		buildAssign(
			buildVariable('asset'),
			buildFuncCall(buildName(['json_decode']), [
				buildArg(buildVariable('asset_contents')),
				buildArg(buildConstFetchExpression('true')),
			])
		)
	);

	const initialiseDependencies = buildExpressionStatement(
		buildAssign(buildVariable('dependencies'), buildArray([]))
	);

	const dependenciesGuard = buildIfStatement(
		buildBinaryOperation(
			'BooleanAnd',
			buildFuncCall(buildName(['is_array']), [
				buildArg(buildVariable('asset')),
			]),
			buildBinaryOperation(
				'BooleanAnd',
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('asset'),
							buildScalarString('dependencies')
						)
					),
				]),
				buildFuncCall(buildName(['is_array']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('asset'),
							buildScalarString('dependencies')
						)
					),
				])
			)
		),
		[
			buildExpressionStatement(
				buildAssign(
					buildVariable('dependencies'),
					buildArrayDimFetch(
						buildVariable('asset'),
						buildScalarString('dependencies')
					)
				)
			),
		]
	);

	const coreBundlesAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('core_bundles'),
			buildArray([
				buildArrayItem(buildScalarString('element.min.js'), {
					key: buildScalarString('wp-element'),
				}),
				buildArrayItem(buildScalarString('dataviews.min.js'), {
					key: buildScalarString('wp-dataviews'),
				}),
				buildArrayItem(buildScalarString('interactivity.min.js'), {
					key: buildScalarString('wp-interactivity'),
				}),
				buildArrayItem(buildScalarString('private-apis.min.js'), {
					key: buildScalarString('wp-private-apis'),
				}),
			])
		)
	);

	const ensureCoreBundles = buildForeach(buildVariable('core_bundles'), {
		keyVar: buildVariable('handle'),
		valueVar: buildVariable('filename'),
		stmts: [
			buildIfStatement(
				buildBooleanNot(
					buildFuncCall(buildName(['in_array']), [
						buildArg(buildVariable('handle')),
						buildArg(buildVariable('dependencies')),
						buildArg(buildConstFetchExpression('true')),
					])
				),
				[buildContinue()]
			),
			buildIfStatement(
				buildBinaryOperation(
					'BooleanOr',
					buildFuncCall(buildName(['wp_script_is']), [
						buildArg(buildVariable('handle')),
						buildArg(buildScalarString('registered')),
					]),
					buildFuncCall(buildName(['wp_script_is']), [
						buildArg(buildVariable('handle')),
						buildArg(buildScalarString('enqueued')),
					])
				),
				[buildContinue()]
			),
			buildExpressionStatement(
				buildFuncCall(buildName(['wp_register_script']), [
					buildArg(buildVariable('handle')),
					buildArg(
						buildFuncCall(buildName(['includes_url']), [
							buildArg(
								buildBinaryOperation(
									'Concat',
									buildScalarString('js/dist/'),
									buildVariable('filename')
								)
							),
						])
					),
					buildArg(buildArray([])),
					buildArg(
						buildFuncCall(buildName(['get_bloginfo']), [
							buildArg(buildScalarString('version')),
						])
					),
					buildArg(buildConstFetchExpression('true')),
				])
			),
		],
	});

	const initialiseVersion = buildExpressionStatement(
		buildAssign(
			buildVariable('version'),
			buildConstFetchExpression('false')
		)
	);

	const versionGuard = buildIfStatement(
		buildBinaryOperation(
			'BooleanAnd',
			buildFuncCall(buildName(['is_array']), [
				buildArg(buildVariable('asset')),
			]),
			buildFuncCall(buildName(['array_key_exists']), [
				buildArg(buildScalarString('version')),
				buildArg(buildVariable('asset')),
			])
		),
		[
			buildExpressionStatement(
				buildAssign(
					buildVariable('version'),
					buildArrayDimFetch(
						buildVariable('asset'),
						buildScalarString('version')
					)
				)
			),
		]
	);

	const scriptUrlAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('script_url'),
			buildFuncCall(buildName(['plugins_url']), [
				buildArg(buildScalarString(ui.scriptPath)),
				buildArg(buildConstFetchExpression('__FILE__')),
			])
		)
	);

	const registerScript = buildExpressionStatement(
		buildFuncCall(buildName(['wp_register_script']), [
			buildArg(buildScalarString(ui.handle)),
			buildArg(buildVariable('script_url')),
			buildArg(buildVariable('dependencies')),
			buildArg(buildVariable('version')),
		])
	);

	const localizationAssign = buildExpressionStatement(
		buildAssign(buildVariable('localization'), buildLocalizationArray(ui))
	);

	const localizeScript = buildExpressionStatement(
		buildFuncCall(buildName(['wp_localize_script']), [
			buildArg(buildScalarString(ui.handle)),
			buildArg(buildScalarString(ui.localizationObject)),
			buildArg(buildVariable('localization')),
		])
	);

	const stylePathAssign = buildExpressionStatement(
		buildAssign(
			buildVariable('style_path'),
			buildBinaryOperation(
				'Concat',
				buildFuncCall(buildName(['plugin_dir_path']), [
					buildArg(buildConstFetchExpression('__FILE__')),
				]),
				buildScalarString('build/index.css')
			)
		)
	);

	const enqueueStyleIfPresent = buildIfStatement(
		buildFuncCall(buildName(['file_exists']), [
			buildArg(buildVariable('style_path')),
		]),
		[
			buildExpressionStatement(
				buildFuncCall(buildName(['wp_enqueue_style']), [
					buildArg(buildScalarString(ui.handle)),
					buildArg(
						buildFuncCall(buildName(['plugins_url']), [
							buildArg(buildScalarString('build/index.css')),
							buildArg(buildConstFetchExpression('__FILE__')),
						])
					),
					buildArg(
						buildArray([
							buildArrayItem(buildScalarString('wp-components')),
						])
					),
					buildArg(buildVariable('version')),
				])
			),
		]
	);

	const enqueueScript = buildExpressionStatement(
		buildFuncCall(buildName(['wp_enqueue_script']), [
			buildArg(buildScalarString(ui.handle)),
		])
	);

	const fn = buildNodeFunction('enqueue_wpkernel_ui_assets', {
		returnType: buildIdentifier('void'),
		statements: [
			pageAssign,
			...(pluginPagesAssign ? [pluginPagesAssign] : []),
			...(guardNonPluginPage ? [guardNonPluginPage] : []),
			assetPathAssign,
			guardMissingAsset,
			assetContentsAssign,
			guardUnreadableAsset,
			decodeAsset,
			initialiseDependencies,
			dependenciesGuard,
			coreBundlesAssign,
			ensureCoreBundles,
			initialiseVersion,
			versionGuard,
			scriptUrlAssign,
			registerScript,
			localizationAssign,
			localizeScript,
			stylePathAssign,
			enqueueStyleIfPresent,
			enqueueScript,
		],
	});

	return mergeNodeAttributes(fn, {
		comments: [
			buildDocComment([
				'Register and enqueue generated UI assets for DataViews screens.',
			]),
		],
	});
}

export function buildRegisterAdminMenuFunction(
	config: PluginLoaderProgramConfig
): PhpStmtFunction | null {
	const ui = config.ui;
	if (!ui) {
		return null;
	}

	const menuResources = ui.resources.filter((resource) => resource.menu);
	if (menuResources.length === 0) {
		return null;
	}

	const parentsArray = buildArray(
		menuResources
			.filter((resource) => !resource.menu?.parent)
			.map((resource) => {
				const menuArray = buildMenuLocalizationArray(resource.menu!);
				if (!menuArray) {
					throw new Error('Menu config expected but missing');
				}

				return buildArrayItem(menuArray);
			})
	);

	const childrenArray = buildArray(
		menuResources
			.filter((resource) => Boolean(resource.menu?.parent))
			.map((resource) => {
				const menuArray = buildMenuLocalizationArray(resource.menu!);
				if (!menuArray) {
					throw new Error('Menu config expected but missing');
				}

				return buildArrayItem(menuArray);
			})
	);

	const parentsAssign = buildExpressionStatement(
		buildAssign(buildVariable('parent_menus'), parentsArray)
	);

	const childrenAssign = buildExpressionStatement(
		buildAssign(buildVariable('child_menus'), childrenArray)
	);

	const foreachParents = buildForeach(buildVariable('parent_menus'), {
		valueVar: buildVariable('menu'),
		stmts: buildMenuRegistrationStatements(),
	});

	const foreachChildren = buildForeach(buildVariable('child_menus'), {
		valueVar: buildVariable('menu'),
		stmts: buildMenuRegistrationStatements(),
	});

	const fn = buildNodeFunction('register_wpkernel_admin_menu', {
		returnType: buildIdentifier('void'),
		statements: [
			parentsAssign,
			childrenAssign,
			foreachParents,
			foreachChildren,
		],
	});

	return mergeNodeAttributes(fn, {
		comments: [
			buildDocComment([
				'Register admin menu entries for WPKernel DataViews screens.',
			]),
		],
	});

	function buildMenuRegistrationStatements(): PhpStmt[] {
		const statements: PhpStmt[] = [];

		const slugAssign = buildExpressionStatement(
			buildAssign(
				buildVariable('slug'),
				buildArrayDimFetch(
					buildVariable('menu'),
					buildScalarString('slug')
				)
			)
		);

		const titleAssign = buildExpressionStatement(
			buildAssign(
				buildVariable('title'),
				buildArrayDimFetch(
					buildVariable('menu'),
					buildScalarString('title')
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
								buildVariable('menu'),
								buildScalarString('capability')
							)
						),
					]),
					buildArrayDimFetch(
						buildVariable('menu'),
						buildScalarString('capability')
					),
					buildScalarString('manage_options')
				)
			)
		);

		const callbackAssign = buildExpressionStatement(
			buildAssign(
				buildVariable('callback'),
				buildBinaryOperation(
					'Concat',
					buildConstFetchExpression('__NAMESPACE__'),
					buildScalarString('\\render_wpkernel_admin_screen')
				)
			)
		);

		const parentGuard = buildIfStatement(
			buildBinaryOperation(
				'BooleanAnd',
				buildFuncCall(buildName(['isset']), [
					buildArg(
						buildArrayDimFetch(
							buildVariable('menu'),
							buildScalarString('parent')
						)
					),
				]),
				buildArrayDimFetch(
					buildVariable('menu'),
					buildScalarString('parent')
				)
			),
			[buildParentMenuRegistration(), buildContinue()]
		);

		const topLevelMenuRegistration = buildTopLevelMenuRegistration();

		statements.push(
			slugAssign,
			titleAssign,
			capabilityAssign,
			callbackAssign,
			parentGuard,
			topLevelMenuRegistration
		);

		return statements;
	}

	function buildParentMenuRegistration(): PhpStmt {
		const parentFetch = buildArrayDimFetch(
			buildVariable('menu'),
			buildScalarString('parent')
		);

		const args = [
			buildArg(parentFetch),
			buildArg(buildVariable('title')),
			buildArg(buildVariable('title')),
			buildArg(buildVariable('capability')),
			buildArg(buildVariable('slug')),
			buildArg(buildVariable('callback')),
		];

		const positionGuard = buildIfStatement(
			buildFuncCall(buildName(['isset']), [
				buildArg(
					buildArrayDimFetch(
						buildVariable('menu'),
						buildScalarString('position')
					)
				),
			]),
			[
				buildExpressionStatement(
					buildFuncCall(buildName(['add_submenu_page']), [
						...args,
						buildArg(
							buildArrayDimFetch(
								buildVariable('menu'),
								buildScalarString('position')
							)
						),
					])
				),
			],
			{
				elseBranch: buildElseBranch([
					buildExpressionStatement(
						buildFuncCall(buildName(['add_submenu_page']), args)
					),
				]),
			}
		);

		return positionGuard;
	}

	function buildTopLevelMenuRegistration(): PhpStmt {
		const args = [
			buildArg(buildVariable('title')),
			buildArg(buildVariable('title')),
			buildArg(buildVariable('capability')),
			buildArg(buildVariable('slug')),
			buildArg(buildVariable('callback')),
			buildArg(buildScalarString('')),
		];

		const positionGuard = buildIfStatement(
			buildFuncCall(buildName(['isset']), [
				buildArg(
					buildArrayDimFetch(
						buildVariable('menu'),
						buildScalarString('position')
					)
				),
			]),
			[
				buildExpressionStatement(
					buildFuncCall(buildName(['add_menu_page']), [
						...args,
						buildArg(
							buildArrayDimFetch(
								buildVariable('menu'),
								buildScalarString('position')
							)
						),
					])
				),
			],
			{
				elseBranch: buildElseBranch([
					buildExpressionStatement(
						buildFuncCall(buildName(['add_menu_page']), args)
					),
				]),
			}
		);

		return positionGuard;
	}
}

export function buildRenderAdminScreenFunction(
	_config: PluginLoaderProgramConfig
): PhpStmtFunction {
	const pageInit = buildExpressionStatement(
		buildAssign(buildVariable('page'), buildScalarString(''))
	);

	const pageGuard = buildIfStatement(
		buildFuncCall(buildName(['isset']), [
			buildArg(
				buildArrayDimFetch(
					buildVariable('_GET'),
					buildScalarString('page')
				)
			),
		]),
		[
			buildExpressionStatement(
				buildAssign(
					buildVariable('page'),
					buildFuncCall(buildName(['sanitize_key']), [
						buildArg(
							buildFuncCall(buildName(['strval']), [
								buildArg(
									buildArrayDimFetch(
										buildVariable('_GET'),
										buildScalarString('page')
									)
								),
							])
						),
					])
				)
			),
		]
	);

	const printScreen = buildExpressionStatement(
		buildFuncCall(buildName(['printf']), [
			buildArg(
				buildScalarString(
					'<div class="wrap"><div id="wpkernel-admin-screen" data-wpkernel-page="%s"></div></div>'
				)
			),
			buildArg(
				buildFuncCall(buildName(['esc_attr']), [
					buildArg(buildVariable('page')),
				])
			),
		])
	);

	const fn = buildNodeFunction('render_wpkernel_admin_screen', {
		returnType: buildIdentifier('void'),
		statements: [pageInit, pageGuard, printScreen],
	});

	return mergeNodeAttributes(fn, {
		comments: [
			buildDocComment([
				'Render container for WPKernel-admin DataViews screens.',
			]),
		],
	});
}
