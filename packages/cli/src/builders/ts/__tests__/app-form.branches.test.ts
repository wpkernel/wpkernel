import path from 'node:path';
import { createAppFormBuilder } from '../app-form';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';

function buildWorkspace() {
	const writes: Array<{ file: string; contents: string }> = [];
	const workspace = makeWorkspaceMock({
		write: async (
			file: string,
			data: string | Buffer,
			_options?: unknown
		) => {
			writes.push({ file, contents: String(data) });
		},
		resolve: (...parts: string[]) => path.join(process.cwd(), ...parts),
	});
	return { workspace, writes };
}

describe('app-form builder (branches)', () => {
	it('skips if phase is not generate', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		await createAppFormBuilder().apply({
			input: {
				phase: 'init',
				options: {
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'init',
				generationState: buildEmptyGenerationState(),
			},
			output,
			reporter,
		});

		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining('skipping')
		);
		expect(writes).toHaveLength(0);
	});

	it('skips if artifacts missing', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();
		(ir as any).artifacts = undefined;

		await createAppFormBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: buildEmptyGenerationState(),
			},
			output,
			reporter,
		});

		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining('missing artifact plan')
		);
		expect(writes).toHaveLength(0);
	});

	it('skips resource if ui plan missing', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr({
			resources: [
				{
					name: 'test',
					id: 'test',
				} as any,
			],
		});
		// artifacts default to empty object in makeIr but explicit null helps
		ir.artifacts.surfaces = {};

		await createAppFormBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: buildEmptyGenerationState(),
			},
			output,
			reporter,
		});

		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining('missing ui plan for test')
		);
		expect(writes).toHaveLength(0);
	});

	it('skips resource if generatedAppDir missing', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr({
			resources: [
				{
					name: 'test',
					id: 'test',
				} as any,
			],
		});
		ir.artifacts.surfaces = {
			test: {
				resource: 'test',
				modulePath: 'path',
				appDir: 'app',
				// generatedAppDir missing
			} as any,
		};

		await createAppFormBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: buildEmptyGenerationState(),
			},
			output,
			reporter,
		});

		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining('missing ui dir for test')
		);
		expect(writes).toHaveLength(0);
	});

	it('generates form with wp-post fields (title, meta, taxonomies)', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr({
			resources: [
				{
					name: 'post',
					id: 'post',
					storage: {
						mode: 'wp-post',
						supports: ['title', 'editor'],
						meta: {
							rating: { type: 'number' },
							isFeatured: { type: 'boolean' },
							subtitle: { type: 'string' },
						},
						taxonomies: {
							category: { taxonomy: 'category' },
							tags: {}, // implicit taxonomy name
						},
					},
				} as any,
			],
		});
		ir.artifacts.surfaces = {
			post: {
				resource: 'post',
				modulePath: 'path',
				appDir: 'app',
				generatedAppDir: 'generated/app',
			} as any,
		};

		await createAppFormBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: buildEmptyGenerationState(),
			},
			output,
			reporter,
		});

		expect(writes).toHaveLength(1);
		const content = writes[0]?.contents ?? '';
		expect(content).toContain("title: '',"); // default form
		expect(content).toContain('rating: undefined,');
		expect(content).toContain('isFeatured: undefined,');
		expect(content).toContain('category: undefined,');
		expect(content).toContain('tags: undefined,');

		expect(content).toContain(
			"numberField<PostFormInput>('rating', { label: 'Rating', edit: 'integer' }),"
		);
		expect(content).toContain(
			"textField<PostFormInput>('isFeatured', { label: 'IsFeatured', edit: 'text' }),"
		);
		expect(content).toContain(
			"selectField<PostFormInput>('category', categoryOptions.options, { label: 'Category', edit: 'select' }),"
		);
	});

	it('generates form without wp-post fields', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr({
			resources: [
				{
					name: 'simple',
					id: 'simple',
					storage: {
						mode: 'custom', // Not wp-post
					},
				} as any,
			],
		});
		ir.artifacts.surfaces = {
			simple: {
				resource: 'simple',
				modulePath: 'path',
				appDir: 'app',
				generatedAppDir: 'generated/app',
			} as any,
		};

		await createAppFormBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					namespace: ir.meta.namespace,
					origin: ir.meta.origin,
					sourcePath: ir.meta.sourcePath,
				},
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: buildEmptyGenerationState(),
			},
			output,
			reporter,
		});

		expect(writes).toHaveLength(1);
		const content = writes[0]?.contents ?? '';
		expect(content).not.toContain("title: '',");
		expect(content).not.toContain('status:');
	});
});
