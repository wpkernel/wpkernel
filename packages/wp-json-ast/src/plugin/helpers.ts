import {
	buildArray,
	buildArrayItem,
	buildComment,
	buildDocComment,
	buildIdentifier,
	buildName,
	buildNamespace,
	buildNode,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	type PhpExpr,
	type PhpExprArrayItem,
	type PhpExprConstFetch,
	type PhpStmt,
	type PhpStmtElse,
	type PhpStmtFunction,
} from '@wpkernel/php-json-ast';
import type {
	PluginLoaderProgramConfig,
	PluginLoaderUiConfig,
	PluginLoaderUiResourceConfig,
} from './types';
import {
	DEFAULT_DOC_HEADER,
	AUTO_GUARD_BEGIN,
	AUTO_GUARD_END,
} from '../constants';
import { buildBootstrapFunction, buildBootstrapInvocation } from './bootstrap';
import { buildRegisterContentModelFunction } from './content-model';
import {
	buildGetControllersFunction,
	buildRegisterRoutesFunction,
} from './controllers';
import { buildAccessGuardStatement } from './header';
import {
	buildRegisterUiAssetsFunction,
	buildRegisterAdminMenuFunction,
	buildRenderAdminScreenFunction,
} from './ui';

/**
 * Builds a function node with the given name, return type, and statements.
 *
 * Kept as a shared helper to avoid duplicating the boilerplate across loader modules.
 * @param name
 * @param options
 * @param options.returnType
 * @param options.statements
 */
export function buildNodeFunction(
	name: string,
	options: {
		readonly returnType: ReturnType<typeof buildIdentifier> | null;
		readonly statements: readonly PhpStmt[];
	}
): PhpStmtFunction {
	return buildNode<PhpStmtFunction>('Stmt_Function', {
		byRef: false,
		name: buildIdentifier(name),
		params: [],
		returnType: options.returnType,
		stmts: [...options.statements],
		attrGroups: [],
		namespacedName: null,
	});
}

export function buildConstFetchExpression(name: string): PhpExprConstFetch {
	return buildNode('Expr_ConstFetch', {
		name: buildName([name]),
	});
}

export function buildElseBranch(stmts: readonly PhpStmt[]): PhpStmtElse {
	return buildNode<PhpStmtElse>('Stmt_Else', { stmts: [...stmts] });
}
export function buildLocalizationArray(ui: PluginLoaderUiConfig): PhpExpr {
	const resourceItems: PhpExprArrayItem[] = ui.resources.map((resource) =>
		buildArrayItem(buildResourceLocalizationArray(resource))
	);

	return buildArray([
		buildArrayItem(buildScalarString(ui.namespace), {
			key: buildScalarString('namespace'),
		}),
		buildArrayItem(buildArray(resourceItems), {
			key: buildScalarString('resources'),
		}),
	]);
}
function buildResourceLocalizationArray(
	resource: PluginLoaderUiResourceConfig
): PhpExpr {
	const items: PhpExprArrayItem[] = [
		buildArrayItem(buildScalarString(resource.resource), {
			key: buildScalarString('resource'),
		}),
		buildArrayItem(buildScalarString(resource.preferencesKey), {
			key: buildScalarString('preferencesKey'),
		}),
	];

	if (resource.menu) {
		const menuArray = buildMenuLocalizationArray(resource.menu);
		if (menuArray) {
			items.push(
				buildArrayItem(menuArray, {
					key: buildScalarString('menu'),
				})
			);
		}
	}

	return buildArray(items);
}
export function buildMenuLocalizationArray(
	menu: NonNullable<PluginLoaderUiResourceConfig['menu']>
): PhpExpr | null {
	const items: PhpExprArrayItem[] = [];

	if (menu.slug) {
		items.push(
			buildArrayItem(buildScalarString(menu.slug), {
				key: buildScalarString('slug'),
			})
		);
	}

	if (menu.title) {
		items.push(
			buildArrayItem(buildScalarString(menu.title), {
				key: buildScalarString('title'),
			})
		);
	}

	if (menu.capability) {
		items.push(
			buildArrayItem(buildScalarString(menu.capability), {
				key: buildScalarString('capability'),
			})
		);
	}

	if (menu.parent) {
		items.push(
			buildArrayItem(buildScalarString(menu.parent), {
				key: buildScalarString('parent'),
			})
		);
	}

	if (typeof menu.position === 'number') {
		items.push(
			buildArrayItem(buildScalarInt(menu.position), {
				key: buildScalarString('position'),
			})
		);
	}

	if (items.length === 0) {
		return null;
	}

	return buildArray(items);
}
export function splitNamespace(value: string): string[] {
	return value.split('\\').filter(Boolean);
}
export function normaliseRelativeDirectory(value: string): string {
	const trimmed = value.replace(/^\.?\//, '').replace(/\/+$/, '');
	return trimmed;
}
export function buildNamespaceStatements(
	config: PluginLoaderProgramConfig
): PhpStmt {
	const namespaceNode = buildName(config.namespace.split('\\'));
	const statements: PhpStmt[] = [];

	statements.push(
		buildStmtNop({
			comments: [
				buildDocComment([
					...DEFAULT_DOC_HEADER,
					`Source: ${config.origin} → plugin/loader`,
				]),
			],
		})
	);
	statements.push(
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_BEGIN}`)] })
	);
	statements.push(buildAccessGuardStatement());
	statements.push(buildGetControllersFunction(config));
	statements.push(buildRegisterRoutesFunction());

	const contentModelFunction = buildRegisterContentModelFunction(config);
	if (contentModelFunction) {
		statements.push(contentModelFunction);
	}

	const registerUiAssetsFunction = buildRegisterUiAssetsFunction(config);
	if (registerUiAssetsFunction) {
		statements.push(registerUiAssetsFunction);
	}

	const registerAdminMenuFunction = buildRegisterAdminMenuFunction(config);
	if (registerAdminMenuFunction) {
		statements.push(registerAdminMenuFunction);
		statements.push(buildRenderAdminScreenFunction(config));
	}

	statements.push(buildBootstrapFunction(config));
	statements.push(buildBootstrapInvocation());
	statements.push(
		buildStmtNop({ comments: [buildComment(`// ${AUTO_GUARD_END}`)] })
	);
	statements.push(
		buildStmtNop({
			comments: [
				buildComment(
					'// Custom plugin logic may be added below. This area is left untouched by the generator.'
				),
			],
		})
	);

	return buildNamespace(namespaceNode, statements);
}
