import { buildIndexProgram } from '../indexFile';
import type { PhpExprArray, PhpStmtReturn } from '@wpkernel/php-json-ast';

function assertArrayExpr(
	expr: PhpStmtReturn['expr']
): asserts expr is PhpExprArray {
	if (!expr || expr.nodeType !== 'Expr_Array') {
		throw new Error('Expected module index to return an array expression.');
	}
}

describe('buildIndexProgram', () => {
	it('returns a return statement that maps classes to module files', () => {
		const result = buildIndexProgram({
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin\\Generated',
			entries: [
				{
					className: 'Demo\\Plugin\\Rest\\BaseController',
					path: 'Rest/BaseController.php',
				},
				{
					className: 'Demo\\Plugin\\Capability\\Capability',
					path: '/Capability/Capability.php',
				},
			],
			metadataName: 'module-index',
		});

		expect(result.namespace).toBe('Demo\\Plugin\\Generated');
		expect(result.docblock).toEqual(['Source: wpk.config.ts → php/index']);
		expect(result.metadata).toEqual({
			kind: 'index-file',
			name: 'module-index',
		});
		expect(result.statements).toHaveLength(1);

		const returnStmt = result.statements[0] as PhpStmtReturn;
		assertArrayExpr(returnStmt.expr);
		const items = returnStmt.expr.items ?? [];
		expect(items).toHaveLength(2);

		const firstItem = items[0];
		expect(firstItem?.key?.nodeType).toBe('Scalar_String');
		expect((firstItem?.key as any).value).toBe(
			'Demo\\Plugin\\Rest\\BaseController'
		);
		expect(firstItem?.value?.nodeType).toBe('Expr_BinaryOp_Concat');

		const secondItem = items[1];
		expect(secondItem?.key?.nodeType).toBe('Scalar_String');
		expect((secondItem?.key as any).value).toBe(
			'Demo\\Plugin\\Capability\\Capability'
		);
		expect(secondItem?.value?.nodeType).toBe('Expr_BinaryOp_Concat');
	});
});
