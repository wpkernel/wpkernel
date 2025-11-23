import {
	buildArray,
	buildArrayItem,
	buildName,
	buildArg,
	buildDocComment,
	buildExpressionStatement,
	buildFuncCall,
	buildIdentifier,
	buildScalarString,
	mergeNodeAttributes,
	type PhpExpr,
	type PhpExprArrayItem,
	type PhpStmtFunction,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { buildNodeFunction, buildConstFetchExpression } from './helpers';
import type {
	PluginLoaderProgramConfig,
	PluginPostTypeConfig,
	PluginTaxonomyConfig,
} from './types';

type ContentModelConfig = NonNullable<
	PluginLoaderProgramConfig['contentModel']
>;

const CORE_POST_STATUSES = new Set([
	'publish',
	'future',
	'draft',
	'pending',
	'private',
	'trash',
	'auto-draft',
	'inherit',
]);

export function buildRegisterContentModelFunction(
	config: PluginLoaderProgramConfig
): PhpStmtFunction | null {
	const contentModel = config.contentModel;
	if (
		!contentModel ||
		(contentModel.postTypes.length === 0 &&
			contentModel.taxonomies.length === 0 &&
			contentModel.statuses.length === 0)
	) {
		return null;
	}

	const statements: PhpStmtFunction['stmts'] = [
		...buildStatusRegistrations(contentModel),
		...buildPostTypeRegistrations(contentModel),
		...buildTaxonomyRegistrations(contentModel),
	];

	const fn = buildNodeFunction('register_wpkernel_content_model', {
		returnType: buildIdentifier('void'),
		statements,
	});

	return mergeNodeAttributes(fn, {
		comments: [
			buildDocComment([
				'Register content model (post types, taxonomies, statuses) for generated resources.',
			]),
		],
	});
}

function buildStatusRegistrations(contentModel: ContentModelConfig): PhpStmt[] {
	const statements: PhpStmt[] = [];

	for (const status of contentModel.statuses) {
		if (CORE_POST_STATUSES.has(status.slug)) {
			continue;
		}

		const args = [
			buildArg(buildScalarString(status.slug)),
			buildArg(
				buildArray([
					buildArrayItem(buildScalarString(status.label), {
						key: buildScalarString('label'),
					}),
					buildArrayItem(
						buildConstFetchExpression(
							status.public ? 'true' : 'false'
						),
						{
							key: buildScalarString('public'),
						}
					),
					buildArrayItem(
						buildConstFetchExpression(
							status.showInAdminAllList ? 'true' : 'false'
						),
						{
							key: buildScalarString('show_in_admin_all_list'),
						}
					),
					buildArrayItem(
						buildConstFetchExpression(
							status.showInAdminStatusList ? 'true' : 'false'
						),
						{
							key: buildScalarString('show_in_admin_status_list'),
						}
					),
					buildArrayItem(
						buildFuncCall(buildName(['_n_noop']), [
							buildArg(
								buildScalarString(
									`${status.label} <span class="count">(%s)</span>`
								)
							),
							buildArg(
								buildScalarString(
									`${status.label} <span class="count">(%s)</span>`
								)
							),
						]),
						{
							key: buildScalarString('label_count'),
						}
					),
				])
			),
		];

		statements.push(
			buildExpressionStatement(
				buildFuncCall(buildName(['register_post_status']), args)
			)
		);
	}

	return statements;
}

function buildPostTypeRegistrations(
	contentModel: ContentModelConfig
): PhpStmt[] {
	return contentModel.postTypes.map((postType) =>
		buildExpressionStatement(
			buildFuncCall(buildName(['register_post_type']), [
				buildArg(buildScalarString(postType.slug)),
				buildArg(buildPostTypeArgs(postType)),
			])
		)
	);
}

function buildTaxonomyRegistrations(
	contentModel: ContentModelConfig
): PhpStmt[] {
	return contentModel.taxonomies.map((taxonomy) =>
		buildExpressionStatement(
			buildFuncCall(buildName(['register_taxonomy']), [
				buildArg(buildScalarString(taxonomy.slug)),
				buildArg(
					buildArray(
						(taxonomy.objectTypes ?? []).map((type: string) =>
							buildArrayItem(buildScalarString(type))
						)
					)
				),
				buildArg(buildTaxonomyArgs(taxonomy)),
			])
		)
	);
}

// eslint-disable-next-line complexity
function buildPostTypeArgs(postType: PluginPostTypeConfig): PhpExpr {
	const items: PhpExprArrayItem[] = [];

	items.push(
		buildArrayItem(buildScalarStringArray(postType.labels), {
			key: buildScalarString('labels'),
		})
	);

	if (postType.supports?.length) {
		items.push(
			buildArrayItem(
				buildArray(
					postType.supports.map((support: string) =>
						buildArrayItem(buildScalarString(support))
					)
				),
				{ key: buildScalarString('supports') }
			)
		);
	}

	if (postType.taxonomies?.length) {
		items.push(
			buildArrayItem(
				buildArray(
					postType.taxonomies.map((taxonomy: string) =>
						buildArrayItem(buildScalarString(taxonomy))
					)
				),
				{ key: buildScalarString('taxonomies') }
			)
		);
	}

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				postType.showUi === false ? 'false' : 'true'
			),
			{
				key: buildScalarString('show_ui'),
			}
		)
	);

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				postType.showInMenu === false ? 'false' : 'true'
			),
			{
				key: buildScalarString('show_in_menu'),
			}
		)
	);

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				postType.showInRest === false ? 'false' : 'true'
			),
			{
				key: buildScalarString('show_in_rest'),
			}
		)
	);

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				postType.rewrite === false ? 'false' : 'true'
			),
			{
				key: buildScalarString('rewrite'),
			}
		)
	);

	if (postType.capabilityType) {
		items.push(
			buildArrayItem(buildScalarString(postType.capabilityType), {
				key: buildScalarString('capability_type'),
			})
		);
	}

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				postType.mapMetaCap === false ? 'false' : 'true'
			),
			{
				key: buildScalarString('map_meta_cap'),
			}
		)
	);

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				postType.public === true ? 'true' : 'false'
			),
			{
				key: buildScalarString('public'),
			}
		)
	);

	return buildArray(items);
}

function buildTaxonomyArgs(taxonomy: PluginTaxonomyConfig): PhpExpr {
	const items: PhpExprArrayItem[] = [];

	items.push(
		buildArrayItem(buildScalarStringArray(taxonomy.labels), {
			key: buildScalarString('labels'),
		})
	);

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				taxonomy.hierarchical === true ? 'true' : 'false'
			),
			{
				key: buildScalarString('hierarchical'),
			}
		)
	);

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				taxonomy.showUi === false ? 'false' : 'true'
			),
			{
				key: buildScalarString('show_ui'),
			}
		)
	);

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				taxonomy.showAdminColumn === false ? 'false' : 'true'
			),
			{
				key: buildScalarString('show_admin_column'),
			}
		)
	);

	items.push(
		buildArrayItem(
			buildConstFetchExpression(
				taxonomy.showInRest === false ? 'false' : 'true'
			),
			{
				key: buildScalarString('show_in_rest'),
			}
		)
	);

	return buildArray(items);
}

function buildScalarStringArray(
	entries: Readonly<Record<string, string>>
): PhpExpr {
	return buildArray(
		Object.entries(entries).map(([key, value]) =>
			buildArrayItem(buildScalarString(value), {
				key: buildScalarString(key),
			})
		)
	);
}
