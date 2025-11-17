import path from 'node:path';
import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';
import { makeIr } from '../../tests/ir.test-support';
import { collectResourceInstructions } from '../plan.shims';
import { buildWorkspace } from '../../workspace';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

const prettyPrinter = buildPhpPrettyPrinter({
	workspace: buildWorkspace(process.cwd()),
});

function makeOptions() {
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

	return {
		input: {
			phase: 'generate' as const,
			options: {
				config: ir.config,
				namespace: ir.meta.namespace,
				origin: ir.meta.origin,
				sourcePath: path.join(process.cwd(), 'wpk.config.ts'),
			},
			ir,
		},
		context: {
			workspace: buildWorkspace(process.cwd()),
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
}

describe('plan.shims', () => {
	it('emits shim instructions with layout paths and require guard', async () => {
		const options = makeOptions();
		const layout = loadTestLayoutSync();
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
	});
});
