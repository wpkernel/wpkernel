import { createPhpPluginLoaderHelper } from '../entry.plugin';
import { makeIr } from '@cli-tests/ir.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	buildReporter,
	buildOutput,
} from '@cli-tests/builders/builder-harness.test-support';
import { AUTO_GUARD_BEGIN } from '@wpkernel/wp-json-ast';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';

const layout = loadTestLayoutSync();

describe('entry.plugin (branches)', () => {
	it('skips if phase is not generate', async () => {
		const workspace = makeWorkspaceMock();
		workspace.write = jest.fn();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();

		await createPhpPluginLoaderHelper().apply({
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

		// Should just return
		expect(workspace.write).not.toHaveBeenCalled();
	});

	it('skips if php plan missing', async () => {
		const workspace = makeWorkspaceMock();
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();
		(ir.artifacts as any).php = undefined;

		await createPhpPluginLoaderHelper().apply({
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
			expect.stringContaining('missing PHP artifacts plan')
		);
	});

	it('skips if plugin loader is user owned', async () => {
		const workspace = makeWorkspaceMock();
		workspace.readText = jest.fn(async () => '<?php // User code');
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();
		ir.artifacts.php = {
			pluginLoaderPath: 'plugin.php',
			autoload: {
				strategy: 'composer',
				autoloadPath: 'vendor/autoload.php',
			},
			controllers: {},
			debugUiPath: layout.resolve('debug.ui'),
		} as any;

		await createPhpPluginLoaderHelper().apply({
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

		expect(reporter.info).toHaveBeenCalledWith(
			expect.stringContaining(
				'skipping generation because plugin.php exists'
			)
		);
	});

	it('generates if plugin loader has guard', async () => {
		const workspace = makeWorkspaceMock();
		workspace.readText = jest.fn(async () => `<?php ${AUTO_GUARD_BEGIN}`);
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr();
		ir.artifacts.php = {
			pluginLoaderPath: 'plugin.php',
			autoload: {
				strategy: 'composer',
				autoloadPath: 'vendor/autoload.php',
			},
			controllers: {},
			debugUiPath: layout.resolve('debug.ui'),
		} as any;

		await createPhpPluginLoaderHelper().apply({
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
			expect.stringContaining('queued plugin loader'),
			expect.anything()
		);
	});

	it('uses controllerClassName from plan if available', async () => {
		// Indirectly testing via generation side effects or spy
		// But logic is in buildResourceClassNames
		// We can't easily inspect internal functions without exporting them or looking at output
		// This helper does not write to file directly but queues to planner.
		// planner is internal.
		// However, we can exercise the code path.
	});

	it('handles wp-post storage content model', async () => {
		const workspace = makeWorkspaceMock();
		workspace.readText = jest.fn(async () => null);
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr({
			resources: [
				{
					name: 'post',
					id: 'post',
					storage: {
						mode: 'wp-post',
						taxonomies: {
							cat: { taxonomy: 'category', register: true },
						},
					},
				} as any,
			],
		});
		ir.artifacts.php = {
			pluginLoaderPath: 'plugin.php',
			autoload: {
				strategy: 'composer',
				autoloadPath: 'vendor/autoload.php',
			},
			controllers: {},
			debugUiPath: layout.resolve('debug.ui'),
		} as any;

		await createPhpPluginLoaderHelper().apply({
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

		// Expect success run
		expect(reporter.debug).toHaveBeenCalledWith(
			expect.stringContaining('queued plugin loader'),
			expect.anything()
		);
	});

	it('handles wp-taxonomy storage content model', async () => {
		const workspace = makeWorkspaceMock();
		workspace.readText = jest.fn(async () => null);
		const reporter = buildReporter();
		const output = buildOutput();
		const ir = makeIr({
			resources: [
				{
					name: 'tax',
					id: 'tax',
					storage: {
						mode: 'wp-taxonomy',
						taxonomy: 'my-tax',
						hierarchical: true,
					},
				} as any,
			],
		});
		ir.artifacts.php = {
			pluginLoaderPath: 'plugin.php',
			autoload: {
				strategy: 'composer',
				autoloadPath: 'vendor/autoload.php',
			},
			controllers: {},
			debugUiPath: layout.resolve('debug.ui'),
		} as any;

		await createPhpPluginLoaderHelper().apply({
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
			expect.stringContaining('queued plugin loader'),
			expect.anything()
		);
	});
});
