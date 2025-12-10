import {
	buildClassMethod,
	buildIdentifier,
	buildTernary as buildInternalTernary,
	buildVariable,
	type PhpExpr,
	type PhpExprTernary,
	type PhpParam,
	type PhpStmt,
	type PhpStmtClassMethod,
	type PhpType,
} from '@wpkernel/php-json-ast';

/**
 * Lightweight wrapper around the php-json-ast ternary builder to keep helper modules small.
 * @param    condition
 * @param    ifExpr
 * @param    elseExpr
 * @category WordPress AST
 */
export function buildTernary(
	condition: PhpExpr,
	ifExpr: PhpExpr | null,
	elseExpr: PhpExpr
): PhpExprTernary {
	return buildInternalTernary(condition, ifExpr, elseExpr);
}

/**
 * Normalises variable names to expressions.
 * @param    name
 * @category WordPress AST
 */
export function variableExpr(name: string): PhpExpr {
	return buildVariable(name);
}

/**
 * Single place to construct helper methods so flags/typing stay consistent across modules.
 * @param    options
 * @param    options.name
 * @param    options.statements
 * @param    options.params
 * @param    options.returnType
 * @param    options.flags
 * @category WordPress AST
 */
export function buildHelperMethod(options: {
	readonly name: string;
	readonly statements: PhpStmt[];
	readonly params: PhpParam[];
	readonly returnType?: PhpType | null;
	readonly flags?: number;
}): PhpStmtClassMethod {
	return buildClassMethod(buildIdentifier(options.name), {
		flags: options.flags ?? 0,
		params: options.params,
		returnType: options.returnType ?? null,
		stmts: options.statements,
	});
}
