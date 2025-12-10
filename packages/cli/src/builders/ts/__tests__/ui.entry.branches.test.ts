import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createUiEntryBuilder } from '../ui-entry';
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
		rm: jest.fn(),
	});
	return { workspace, writes };
}

describe('ui-entry builder branch coverage', () => {
	it('returns early when phase is not generate', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		await createUiEntryBuilder().apply({
			input: {
				phase: 'init',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		expect(writes).toHaveLength(0);
		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining('missing prerequisites'),
			expect.anything()
		);
	});

	it('returns early when IR artifacts are missing', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();
		(ir as any).artifacts = undefined;

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		expect(writes).toHaveLength(0);
		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining('missing prerequisites'),
			expect.anything()
		);
	});

	it('removes entry when no admin screens exist', async () => {
		const { workspace, writes } = buildWorkspace();
		workspace.exists = jest.fn(async () => true);
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();
		ir.ui = { resources: [] } as any;

		await createUiEntryBuilder().apply(
			{
				input: {
					phase: 'generate',
					options: {
						origin: 'wpk.config.ts',
						sourcePath: 'wpk.config.ts',
						namespace: ir.meta.namespace,
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
			},
			undefined
		);

		expect(workspace.rm).toHaveBeenCalled();
		expect(writes).toHaveLength(0);
	});

	it('skips resources without valid artifacts', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		ir.ui = {
			resources: [
				{
					resource: 'test-resource',
					menu: { parent: 'tools', title: 'Test' },
				},
			],
		} as any;
		ir.resources = [
			{
				name: 'test-resource',
				id: 'test-resource',
			} as any,
		];

		// Ensure artifacts don't have plans for this resource
		ir.artifacts.surfaces = {};
		ir.artifacts.resources = {};

		workspace.exists = jest.fn(async () => true);

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		// Since plannedResources will be empty, it should trigger removeEntryIfPresent
		expect(workspace.rm).toHaveBeenCalled();
		expect(writes).toHaveLength(0);
	});

	it('skips resources that are not found', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		ir.ui = {
			resources: [
				{
					resource: 'test-resource',
					menu: { parent: 'tools', title: 'Test' },
				},
			],
		} as any;
		ir.resources = []; // No resources

		workspace.exists = jest.fn(async () => true);

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		expect(workspace.rm).toHaveBeenCalled();
		expect(writes).toHaveLength(0);
	});

	it('adds auto-register import if block plans exist and file exists', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		ir.ui = {
			resources: [
				{
					resource: 'test-resource',
					menu: { parent: 'tools', title: 'Test' },
				},
			],
		} as any;
		ir.resources = [
			{
				name: 'test-resource',
				id: 'test-resource',
			} as any,
		];
		ir.artifacts.surfaces = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				resource: 'test-resource',
				appDir: '/app/test-resource',
				generatedAppDir: '/generated/app/test-resource',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;
		ir.artifacts.runtime = {
			entry: {
				generated: '/generated/entry/index.tsx',
				applied: '/app/entry/index.tsx',
			},
			runtime: {
				generated: '/generated/runtime/index.ts',
				applied: '/app/runtime/index.ts',
			},
			blocksRegistrarPath: '/generated/blocks/auto-register.ts',
			uiLoader: undefined,
		};

		ir.artifacts.blocks = {
			block1: {
				generatedDir: 'blocks/generated/block1',
				appliedDir: 'blocks/applied/block1',
			},
		} as any;

		// Mock existing auto-register file
		workspace.exists = jest.fn(async (p: string) =>
			p.includes('auto-register')
		);

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		const entryWrite = writes.find((w) => w.file.endsWith('index.tsx'));
		expect(entryWrite).toBeDefined();
		expect(entryWrite!.contents).toContain('registerGeneratedBlocks');
	});

	it('handles missing uiRuntimePath gracefully', async () => {
		const { workspace, writes: _writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();
		ir.ui = {
			resources: [
				{
					resource: 'test-resource',
					menu: { parent: 'tools', title: 'Test' },
				},
			],
		} as any;
		ir.resources = [
			{
				name: 'test-resource',
				id: 'test-resource',
			} as any,
		];
		ir.artifacts.surfaces = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				resource: 'test-resource',
				appDir: '/app/test-resource',
				generatedAppDir: '/generated/app/test-resource',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

		ir.artifacts.runtime = {
			entry: {
				generated: '/generated/entry/index.tsx',
				applied: '/app/entry/index.tsx',
			},
			runtime: { generated: '', applied: '' },
			blocksRegistrarPath: '/generated/blocks/auto-register.ts',
			uiLoader: undefined,
		};

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		expect(reporter.debug).toHaveBeenCalled();
	});

	it('handles missing block roots correctly', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		ir.ui = {
			resources: [
				{
					resource: 'test-resource',
					menu: { parent: 'tools', title: 'Test' },
				},
			],
		} as any;
		ir.resources = [
			{
				name: 'test-resource',
				id: 'test-resource',
			} as any,
		];
		ir.artifacts.surfaces = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				resource: 'test-resource',
				appDir: '/app/test-resource',
				generatedAppDir: '/generated/app/test-resource',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

		ir.artifacts.blocks = {} as any;

		ir.artifacts.runtime = {
			entry: {
				generated: '/generated/entry/index.tsx',
				applied: '/app/entry/index.tsx',
			},
			runtime: {
				generated: '/generated/runtime/index.ts',
				applied: '/app/runtime/index.ts',
			},
			blocksRegistrarPath: '/generated/blocks/auto-register.ts',
			uiLoader: undefined,
		};

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		const entryWrite = writes.find((w) => w.file.endsWith('index.tsx'));
		expect(entryWrite).toBeDefined();
		expect(entryWrite!.contents).not.toContain('registerGeneratedBlocks');
	});

	it('handles missing auto-register file', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		ir.ui = {
			resources: [
				{
					resource: 'test-resource',
					menu: { parent: 'tools', title: 'Test' },
				},
			],
		} as any;
		ir.resources = [
			{
				name: 'test-resource',
				id: 'test-resource',
			} as any,
		];
		ir.artifacts.surfaces = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				resource: 'test-resource',
				appDir: '/app/test-resource',
				generatedAppDir: '/generated/app/test-resource',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

		ir.artifacts.blocks = {
			block1: {
				generatedDir: '/generated/blocks/block1',
				appliedDir: '/app/blocks/block1',
			},
		} as any;

		workspace.exists = jest.fn(async () => false); // File does not exist

		ir.artifacts.runtime = {
			entry: {
				generated: '/generated/entry/index.tsx',
				applied: '/app/entry/index.tsx',
			},
			runtime: {
				generated: '/generated/runtime/index.ts',
				applied: '/app/runtime/index.ts',
			},
			blocksRegistrarPath: '/generated/blocks/auto-register.ts',
			uiLoader: undefined,
		};

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		const entryWrite = writes.find((w) => w.file.endsWith('index.tsx'));
		expect(entryWrite).toBeDefined();
		expect(entryWrite!.contents).not.toContain('registerGeneratedBlocks');
	});

	it('handles blocks with only applied dir', async () => {
		const { workspace, writes } = buildWorkspace();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		ir.ui = {
			resources: [
				{
					resource: 'test-resource',
					menu: { parent: 'tools', title: 'Test' },
				},
			],
		} as any;
		ir.resources = [
			{
				name: 'test-resource',
				id: 'test-resource',
			} as any,
		];
		ir.artifacts.surfaces = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				resource: 'test-resource',
				appDir: '/app/test-resource',
				generatedAppDir: '/generated/app/test-resource',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

		ir.artifacts.blocks = {
			block1: {
				appliedDir: '/app/blocks/block1',
			},
		} as any;

		// Mock existing auto-register file
		workspace.exists = jest.fn(async (p: string) =>
			p.includes('auto-register')
		);

		ir.artifacts.runtime = {
			entry: {
				generated: '/generated/entry/index.tsx',
				applied: '/app/entry/index.tsx',
			},
			runtime: {
				generated: '/generated/runtime/index.ts',
				applied: '/app/runtime/index.ts',
			},
			blocksRegistrarPath: '/generated/blocks/auto-register.ts',
			uiLoader: undefined,
		};

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: {
					origin: 'wpk.config.ts',
					sourcePath: 'wpk.config.ts',
					namespace: ir.meta.namespace,
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

		const entryWrite = writes.find((w) => w.file.endsWith('index.tsx'));
		expect(entryWrite).toBeDefined();
		expect(entryWrite!.contents).toContain('registerGeneratedBlocks');
	});
});
