import { createPhpCapabilityHelper } from '../entry.capabilities';
import {
	DEFAULT_DOC_HEADER,
	resetPhpAstChannel,
	getPhpBuilderChannel,
	resetPhpBuilderChannel,
} from '@wpkernel/wp-json-ast';
import type { IRCapabilityDefinition } from '../../../ir/publicTypes';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
	createReporter,
	seedArtifacts,
} from '../test-support/php-builder.test-support';
import { makeCapabilityDefinition } from '@cli-tests/builders/fixtures.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';

describe('createPhpCapabilityHelper', () => {
	it('skips generation when the IR artifact is missing', async () => {
		const context = createPipelineContext({
			generationState: buildEmptyGenerationState(),
		});
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const helper = createPhpCapabilityHelper();

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

	it('builds a capability helper that returns definition metadata', async () => {
		const definitions: IRCapabilityDefinition[] = [
			makeCapabilityDefinition({
				key: 'resource.read',
				capability: 'read_posts',
				appliesTo: 'resource',
			}),
			makeCapabilityDefinition({
				key: 'resource.update',
				capability: 'edit_post',
				appliesTo: 'object',
				binding: 'post',
			}),
		];

		const context = createPipelineContext();
		resetPhpBuilderChannel(context);
		resetPhpAstChannel(context);

		const reporter = createReporter();
		const ir = createMinimalIr({
			capabilityMap: {
				definitions,
				fallback: { capability: 'manage_demo', appliesTo: 'resource' },
				missing: ['resource.delete'],
				unused: ['resource.archive'],
				warnings: [
					{
						code: 'demo',
						message: 'Example warning',
						context: { scope: 'capability' },
					},
				],
			},
		});
		await seedArtifacts(ir, reporter);

		const helper = createPhpCapabilityHelper();
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
			(candidate) => candidate.metadata.kind === 'capability-helper'
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

		const methodNames =
			classStmt?.stmts
				?.filter((stmt: any) => stmt?.nodeType === 'Stmt_ClassMethod')
				.map((method: any) => method?.name?.name) ?? [];
		expect(methodNames).toEqual(
			expect.arrayContaining([
				'capability_map',
				'fallback',
				'enforce',
				'create_error',
			])
		);

		const capabilityMapMethod = classStmt?.stmts?.find(
			(stmt: any) =>
				stmt?.nodeType === 'Stmt_ClassMethod' &&
				stmt?.name?.name === 'capability_map'
		) as { stmts?: any[] } | undefined;
		const returnStmt = capabilityMapMethod?.stmts?.find(
			(stmt: any) => stmt?.nodeType === 'Stmt_Return'
		) as { expr?: any } | undefined;

		expect(returnStmt?.expr?.items).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: expect.objectContaining({ value: 'resource.read' }),
				}),
				expect.objectContaining({
					key: expect.objectContaining({ value: 'resource.update' }),
				}),
			])
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Capability helper warning emitted.',
			expect.objectContaining({ code: 'demo' })
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Capability falling back to default capability.',
			expect.objectContaining({
				capability: 'resource.delete', // the missing one
				fallbackCapability: 'manage_demo', // the chosen default
				scope: 'resource',
			})
		);
		expect(reporter.warn).toHaveBeenCalledWith(
			'Capability definition declared but unused.',
			expect.objectContaining({ capability: 'resource.archive' })
		);
	});
});
