import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { buildWorkspace } from '../../workspace';
import {
	addPluginLoaderInstruction,
	emitPluginLoader,
} from '../plan.plugin-loader';
import type { PlanInstruction } from '../types';
import { makeIr } from '../../tests/ir.test-support';
import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';
import { buildEmptyGenerationState } from '../../apply/manifest';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

const prettyPrinter = buildPhpPrettyPrinter({
	workspace: buildWorkspace(process.cwd()),
});

function makeOptions(root: string, ir = makeIr()) {
	const workspace = buildWorkspace(root);
	const reporter = {
		info: jest.fn(),
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};
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
				config: ir.config,
				namespace: ir.meta.namespace,
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
			const options = makeOptions(root);
			const layout = loadTestLayoutSync();
			const instructions: PlanInstruction[] = [];
			await addPluginLoaderInstruction({
				options,
				prettyPrinter,
				instructions,
			});
			const [instr] = instructions;
			expect(instr).toMatchObject({
				file: 'plugin.php',
				base: path.posix.join(
					layout.resolve('plan.base'),
					'plugin.php'
				),
				incoming: path.posix.join(
					layout.resolve('plan.incoming'),
					'plugin.php'
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
				prettyPrinter,
			});
			expect(instr).toBeNull();
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});
