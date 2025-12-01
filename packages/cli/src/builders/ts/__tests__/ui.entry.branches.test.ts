import path from 'node:path';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { createUiEntryBuilder } from '../ui-entry';

function buildWorkspace() {
	const writes: Array<{ file: string; contents: string }> = [];
	const workspace = makeWorkspaceMock({
		write: async (file: string, contents: string) => {
			writes.push({ file, contents: String(contents) });
		},
		resolve: (...parts: string[]) => path.join(process.cwd(), ...parts),
	});
	// ensure rm is a spy
	workspace.rm = jest.fn(workspace.rm);
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
				phase: 'build',
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'build',
				generationState: { files: new Map(), alias: new Map() },
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
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: { files: new Map(), alias: new Map() },
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
						config: ir.config,
						namespace: ir.meta.namespace,
					},
					ir,
				},
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: { files: new Map(), alias: new Map() },
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
		ir.artifacts.uiResources = {};
		ir.artifacts.resources = {};

		workspace.exists = jest.fn(async () => true);

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: { files: new Map(), alias: new Map() },
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
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: { files: new Map(), alias: new Map() },
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
		ir.artifacts.uiResources = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				appDir: 'test/ui/app',
				generatedAppDir: 'test/ui/generated',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

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

		ir.artifacts.js = { uiRuntimePath: 'test/js/runtime' } as any;

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: { files: new Map(), alias: new Map() },
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
		ir.artifacts.uiResources = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				appDir: 'test/ui/app',
				generatedAppDir: 'test/ui/generated',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

		(ir.artifacts.js as any) = {}; // clear uiRuntimePath

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: { files: new Map(), alias: new Map() },
			},
			output,
			reporter,
		});

		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining('missing JS runtime path')
		);
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
		ir.artifacts.uiResources = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				appDir: 'test/ui/app',
				generatedAppDir: 'test/ui/generated',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

		ir.artifacts.blocks = {} as any;

		ir.artifacts.js = { uiRuntimePath: 'test/js/runtime' } as any;

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: { files: new Map(), alias: new Map() },
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
		ir.artifacts.uiResources = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				appDir: 'test/ui/app',
				generatedAppDir: 'test/ui/generated',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

		ir.artifacts.blocks = {
			block1: {
				generatedDir: 'blocks/generated/block1',
				appliedDir: 'blocks/applied/block1',
			},
		} as any;

		workspace.exists = jest.fn(async () => false); // File does not exist

		ir.artifacts.js = { uiRuntimePath: 'test/js/runtime' } as any;

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: { files: new Map(), alias: new Map() },
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
		ir.artifacts.uiResources = {
			'test-resource': {
				modulePath: 'test/ui/runtime',
				appDir: 'test/ui/app',
				generatedAppDir: 'test/ui/generated',
			},
		} as any;
		ir.artifacts.resources = {
			'test-resource': { modulePath: 'test/resource' },
		} as any;

		ir.artifacts.blocks = {
			block1: {
				appliedDir: 'blocks/applied/block1',
			},
		} as any;

		// Mock existing auto-register file
		workspace.exists = jest.fn(async (p: string) =>
			p.includes('auto-register')
		);

		ir.artifacts.js = { uiRuntimePath: 'test/js/runtime' } as any;

		await createUiEntryBuilder().apply({
			input: {
				phase: 'generate',
				options: { config: ir.config, namespace: ir.meta.namespace },
				ir,
			},
			context: {
				workspace,
				reporter,
				phase: 'generate',
				generationState: { files: new Map(), alias: new Map() },
			},
			output,
			reporter,
		});

		const entryWrite = writes.find((w) => w.file.endsWith('index.tsx'));
		expect(entryWrite).toBeDefined();
		expect(entryWrite!.contents).toContain('registerGeneratedBlocks');
	});
});
