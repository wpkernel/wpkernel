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
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';
import { createReporterMock } from '@cli-tests/reporter';
import { buildWorkspace } from '../../workspace';

const makeConfig = (namespace: string) => ({
	version: 1,
	namespace,
	schemas: {},
	resources: {},
});

function makeOptions(root: string, ir = makeIr()) {
	const workspace = buildWorkspace(root);
	const reporter = createReporterMock();
	const config = makeConfig(ir.meta.namespace);
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
				config,
				namespace: config.namespace,
				origin: ir.meta.origin,
				sourcePath: path.join(root, 'wpk.config.ts'),
			},
			ir,
		},
		reporter,
		output: { actions: [], queueWrite: jest.fn() },
	};
}

describe('plan.plugin-loader', () => {
	it('emits loader instruction using layout paths', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-loader-'));
		try {
			const layout = loadTestLayoutSync();
			const options = makeOptions(root, makeIr({ layout }));
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
				file: layout.resolve('plugin.loader'),
				base: path.posix.join(
					layout.resolve('plan.base'),
					layout.resolve('plugin.loader')
				),
				incoming: path.posix.join(
					layout.resolve('plan.incoming'),
					layout.resolve('plugin.loader')
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
