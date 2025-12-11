import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {
	addPluginLoaderInstruction,
	emitPluginLoader,
} from '../plan.plugin-loader';
import type { PlanInstruction } from '../types';
import { makeIr } from '@cli-tests/ir.test-support';
import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { createReporterMock } from '@cli-tests/reporter';
import { buildWorkspace } from '../../workspace';

function makeOptions(root: string, ir = makeIr()) {
	const workspace = buildWorkspace(root);
	const reporter = createReporterMock();
	return {
		reporter,
		context: {
			workspace,
			reporter,
			phase: 'generate' as const,
			generationState: buildEmptyGenerationState(),
		},
		input: {
			phase: 'generate' as const,
			options: {
				namespace: ir.meta.namespace,
				origin: ir.meta.origin,
				sourcePath: path.join(root, 'wpk.config.ts'),
			},
			ir,
		},
		output: { actions: [], queueWrite: jest.fn() },
	};
}

describe('plan.plugin-loader', () => {
	it('emits loader instruction using IR artifact paths', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-loader-'));
		try {
			const ir = makeIr();
			const { plan, php } = ir.artifacts;
			const options = makeOptions(root, ir);
			const prettyPrinter = buildPhpPrettyPrinter({
				workspace: options.context.workspace,
			});
			const instructions: PlanInstruction[] = [];
			await addPluginLoaderInstruction({
				options,
				prettyPrinter,
				instructions,
			});
			const [instr] = instructions;
			expect(instr).toMatchObject({
				file: php.pluginLoaderPath,
				base: path.posix.join(plan.planBaseDir, php.pluginLoaderPath),
				incoming: path.posix.join(
					plan.planIncomingDir,
					php.pluginLoaderPath
				),
			});
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});

	it('skips loader when plugin.php is user-owned', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-loader-'));
		try {
			await fs.writeFile(
				path.join(root, 'plugin.php'),
				'<?php // custom'
			);
			const instr = await emitPluginLoader({
				options: makeOptions(root),
				prettyPrinter: buildPhpPrettyPrinter({
					workspace: buildWorkspace(root),
				}),
			});
			expect(instr).not.toBeNull();
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});
