import { createPhpPersistenceRegistryHelper } from '../entry.registry';
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
	seedArtifacts,
} from '../test-support/php-builder.test-support';
import {
	makeResource,
	makeRoute,
} from '@cli-tests/builders/fixtures.test-support';

describe('createPhpPersistenceRegistryHelper', () => {
	it('skips generation when the IR is unavailable', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpPersistenceRegistryHelper();

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir: null }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		expect(getPhpBuilderChannel(context).pending()).toHaveLength(0);
	});

	it('queues a registry with sanitised persistence metadata', async () => {
		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const resources: IRResource[] = [
			makeResource({
				name: 'books',
				storage: { mode: 'wp-post', postType: 'book' },
				identity: { type: 'number', param: 'id' },
				routes: [makeRoute({ path: '/kernel/v1/books' })],
			}),
			makeResource({
				name: 'drafts',
				storage: { mode: 'wp-option', option: 'draft_option' },
				routes: [makeRoute({ path: '/kernel/v1/drafts' })],
			}),
			makeResource({
				name: 'ignored',
				routes: [makeRoute({ path: '/kernel/v1/ignored' })],
			}),
		];

		const helper = createPhpPersistenceRegistryHelper();
		const ir = createMinimalIr({ resources });
		await seedArtifacts(ir, context.reporter);

		await helper.apply(
			{
				context,
				input: createBuilderInput({ ir }),
				output: createBuilderOutput(),
				reporter: context.reporter,
			},
			undefined
		);

		const pending = getPhpBuilderChannel(context).pending();
		const entry = pending.find(
			(candidate) => candidate.metadata.kind === 'persistence-registry'
		);

		expect(entry).toBeDefined();
		expect(entry?.docblock?.slice(0, DEFAULT_DOC_HEADER.length)).toEqual(
			DEFAULT_DOC_HEADER
		);
		const namespaceStmt = entry?.program.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Namespace'
		) as { stmts?: any[] } | undefined;
		const classStmt = namespaceStmt?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Class'
		) as { stmts?: any[] } | undefined;
		const method = classStmt?.stmts?.find(
			(stmt: any) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'get_config'
		) as { stmts?: any[] } | undefined;
		const returnStmt = method?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		) as { expr?: any } | undefined;

		expect(returnStmt?.expr?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ value: 'resources' }),
				}),
			])
		);

		const resourcesArray = returnStmt?.expr?.items?.[0]?.value;
		expect(resourcesArray?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ value: 'books' }),
				}),
				expect.objectContaining({
					key: expect.objectContaining({ value: 'drafts' }),
				}),
			])
		);
	});
});
