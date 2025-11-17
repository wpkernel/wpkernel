import { createPhpIndexFileHelper } from '../entry.index';
import {
	DEFAULT_DOC_HEADER,
	resetPhpAstChannel,
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../../ir/publicTypes';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
} from '../test-support/php-builder.test-support';
import { makeResource, makeRoute } from '../test-support/fixtures.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { loadTestLayoutSync } from '../../../tests/layout.test-support';

describe('createPhpIndexFileHelper', () => {
	it('skips generation when no IR is present', async () => {
		const context = createPipelineContext({
			generationState: buildEmptyGenerationState(),
		});
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpIndexFileHelper();
		const next = jest.fn();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir: null }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			next
		);

		expect(next).toHaveBeenCalledTimes(1);
		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('indexes base controllers and resource controllers', async () => {
		const context = createPipelineContext({
			generationState: buildEmptyGenerationState(),
		});
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpIndexFileHelper();
		const resources: IRResource[] = [
			makeResource({
				name: 'books',
				routes: [
					makeRoute({
						path: '/kernel/v1/books',
					}),
				],
			}),
			makeResource({
				name: 'authors',
				routes: [
					makeRoute({
						path: '/kernel/v1/authors',
					}),
				],
			}),
		];

		const ir = createMinimalIr({
			resources,
			php: {
				namespace: 'Demo\\Plugin',
				outputDir: loadTestLayoutSync().resolve('php.generated'),
				autoload: 'inc/',
			},
		});

		const reporter = context.reporter;
		jest.spyOn(reporter, 'debug');

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter,
			},
			undefined
		);

		const pending = getPhpBuilderChannel(context).pending();
		const entry = pending.find(
			(candidate) => candidate.metadata.kind === 'index-file'
		);

		expect(entry).toBeDefined();
		expect(entry?.docblock?.slice(0, DEFAULT_DOC_HEADER.length)).toEqual(
			DEFAULT_DOC_HEADER
		);
		const namespaceStmt = entry?.program.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Namespace'
		) as { stmts?: any[] } | undefined;
		const returnStatement = namespaceStmt?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		) as { expr?: any } | undefined;

		expect(returnStatement?.expr?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({
						value: 'Demo\\Plugin\\Generated\\Rest\\BooksController',
					}),
				}),
				expect.objectContaining({
					key: expect.objectContaining({
						value: 'Demo\\Plugin\\Generated\\Rest\\AuthorsController',
					}),
				}),
			])
		);
		expect(reporter.debug).toHaveBeenCalledWith(
			'createPhpIndexFileHelper: queued PHP index file.'
		);
	});
});
