import {
	buildGetPostTypeHelper,
	buildGetStatusesHelper,
	buildNormaliseStatusHelper,
	buildResolvePostHelper,
} from '../../mutation';
import type { MutationHelperOptions } from '../../mutation';
import type {
	PhpExpr,
	PhpExprArray,
	PhpExprAssign,
	PhpExprVariable,
	PhpScalarBase,
	PhpScalarString,
	PhpStmt,
	PhpStmtExpression,
	PhpStmtForeach,
	PhpStmtReturn,
} from '@wpkernel/php-json-ast';

const BASE_OPTIONS: Pick<MutationHelperOptions, 'resource' | 'identity'> = {
	resource: {
		name: 'jobs',
		storage: {
			mode: 'wp-post',
			postType: 'acme_job',
			statuses: ['publish', 'draft', 'closed'],
		},
	},
	identity: { type: 'number', param: 'id' },
};

describe('wp-post status helpers', () => {
	it('returns the configured post type or falls back to the resource name', () => {
		const helper = buildGetPostTypeHelper({
			...BASE_OPTIONS,
			pascalName: 'Job',
		});

		const fallbackHelper = buildGetPostTypeHelper({
			resource: { name: 'articles', storage: { mode: 'wp-post' } },
			identity: BASE_OPTIONS.identity,
			pascalName: 'Article',
		});

		const helperReturn = getReturn(helper.stmts?.[0]);
		const fallbackReturn = getReturn(fallbackHelper.stmts?.[0]);

		expect(helperReturn?.value).toEqual('acme_job');
		expect(fallbackReturn?.value).toEqual('articles');
	});

	it('builds status helpers with normalisation and defaults', () => {
		const statuses = buildGetStatusesHelper({
			...BASE_OPTIONS,
			pascalName: 'Job',
		});
		const normalise = buildNormaliseStatusHelper({
			...BASE_OPTIONS,
			pascalName: 'Job',
		});

		const statusArray = getArrayItems(statuses.stmts?.[0]);
		expect(statusArray).toEqual(['publish', 'draft', 'closed']);

		// The normaliser guards against invalid/empty status and falls back to draft.
		const hasLoop = (normalise.stmts ?? []).some(isForeach);
		const assignsDraft = (normalise.stmts ?? []).some((stmt) =>
			isAssigningDraft(stmt)
		);
		const returnsFallback = (normalise.stmts ?? []).some((stmt) =>
			isReturningFallback(stmt)
		);

		expect(hasLoop).toBe(true);
		expect(assignsDraft).toBe(true);
		expect(returnsFallback).toBe(true);
	});

	it('builds post resolution helpers for numeric and slug identities', () => {
		const numeric = buildResolvePostHelper({
			...BASE_OPTIONS,
			pascalName: 'Job',
		});
		const slug = buildResolvePostHelper({
			resource: BASE_OPTIONS.resource,
			identity: { type: 'string', param: 'uuid' },
			pascalName: 'Job',
		});

		expect(numeric).toMatchSnapshot('resolve-post-numeric');
		expect(slug).toMatchSnapshot('resolve-post-slug');
	});
});

function isScalarString(
	expr: PhpExpr | PhpScalarBase | null | undefined
): expr is PhpScalarString {
	return Boolean(expr && expr.nodeType === 'Scalar_String');
}

function getReturn(stmt: PhpStmt | undefined): PhpScalarString | undefined {
	if (!stmt || stmt.nodeType !== 'Stmt_Return') {
		return undefined;
	}
	const expr = (stmt as PhpStmtReturn).expr;
	if (!isScalarString(expr)) {
		return undefined;
	}
	return expr;
}

function getArrayItems(stmt: PhpStmt | undefined): string[] {
	if (!stmt || stmt.nodeType !== 'Stmt_Return') {
		return [];
	}
	const returnExpr = (stmt as PhpStmtReturn).expr;
	if (!returnExpr || returnExpr.nodeType !== 'Expr_Array') {
		return [];
	}
	return ((returnExpr as PhpExprArray).items ?? [])
		.map((item): string | undefined => {
			if (!item || !item.value || !isScalarString(item.value)) {
				return undefined;
			}
			return item.value.value;
		})
		.filter((value): value is string => typeof value === 'string');
}

function isForeach(stmt: PhpStmt): stmt is PhpStmtForeach {
	return stmt.nodeType === 'Stmt_Foreach';
}

function isAssigningDraft(stmt: PhpStmt): boolean {
	if (stmt.nodeType !== 'Stmt_Expression') {
		return false;
	}
	const expr = (stmt as PhpStmtExpression).expr;
	if (expr.nodeType !== 'Expr_Assign') {
		return false;
	}
	const assignExpr = (expr as PhpExprAssign).expr;
	return isScalarString(assignExpr) && assignExpr.value === 'draft';
}

function isReturningFallback(stmt: PhpStmt): boolean {
	if (stmt.nodeType !== 'Stmt_Return') {
		return false;
	}
	const expr = (stmt as PhpStmtReturn).expr;
	return (
		expr?.nodeType === 'Expr_Variable' &&
		(expr as PhpExprVariable).name === 'fallback'
	);
}
