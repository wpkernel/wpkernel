import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';
import { makeIr } from '@cli-tests/ir.test-support';
import { collectResourceInstructions } from '../plan.shims';
import { buildWorkspace } from '../../workspace';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';

function makeOptions(root: string) {
	const workspace = buildWorkspace(root);
	const layout = loadTestLayoutSync();
	const ir = makeIr({
		php: { outputDir: layout.resolve('php.generated'), autoload: 'inc/' },
		resources: [
			{
				name: 'jobs',
				schemaKey: 'jobs',
				schemaProvenance: 'manual',
				routes: [],
				hash: {
					algo: 'sha256',
					inputs: ['resource'],
					value: 'jobs-hash',
				},
				warnings: [],
			},
		],
		layout,
	});

	const builderOptions = {
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
		context: {
			workspace,
			reporter: {
				info: jest.fn(),
				debug: jest.fn(),
				warn: jest.fn(),
				error: jest.fn(),
			},
			phase: 'generate' as const,
			generationState: { shims: [], resources: [] },
		},
		output: { actions: [], queueWrite: jest.fn() },
		reporter: {
			info: jest.fn(),
			debug: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		},
	};

	return {
		options: builderOptions as unknown as Parameters<
			typeof collectResourceInstructions
		>[0]['options'],
		prettyPrinter: buildPhpPrettyPrinter({ workspace }),
		layout,
	};
}

describe('plan.shims', () => {
	it('emits shim instructions with layout paths and require guard', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wpk-shims-'));
		const { options, prettyPrinter, layout } = makeOptions(root);
		try {
			const instructions = await collectResourceInstructions({
				options,
				prettyPrinter,
			});

			const [shim] = instructions;
			expect(shim).toMatchObject({
				file: 'inc/Rest/JobsController.php',
				base: path.posix.join(
					layout.resolve('plan.base'),
					'inc/Rest/JobsController.php'
				),
				incoming: path.posix.join(
					layout.resolve('plan.incoming'),
					'inc/Rest/JobsController.php'
				),
			});
		} finally {
			await fs.rm(root, { recursive: true, force: true });
		}
	});
});
