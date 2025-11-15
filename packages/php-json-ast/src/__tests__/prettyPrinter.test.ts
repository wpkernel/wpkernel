import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import { WPKernelError } from '@wpkernel/core/error';
import { buildPhpPrettyPrinter } from '../prettyPrinter/createPhpPrettyPrinter';
import type { DriverWorkspace, PhpPrettyPrintPayload } from '../types';

jest.mock('node:child_process', () => ({
	spawn: jest.fn(),
}));

import { spawn } from 'node:child_process';

const spawnMock = jest.mocked(spawn);

function makeWorkspace(): DriverWorkspace {
	return {
		root: '/workspace',
		resolve: (...parts: string[]) => parts.join('/'),
		exists: async () => true,
	};
}

function makePayload(program: unknown): PhpPrettyPrintPayload {
	return {
		filePath: '/workspace/example.php',
		program: program as never,
	};
}

function makeMockedChildProcess({
	exitCode = 0,
	stdout = '',
	stderr = '',
} = {}): ChildProcess {
	const child = new EventEmitter();
	const stdoutStream = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
	};
	stdoutStream.setEncoding = jest.fn();

	const stderrStream = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
	};
	stderrStream.setEncoding = jest.fn();

	const stdin = new EventEmitter() as EventEmitter & {
		setEncoding: jest.Mock;
		end: jest.Mock;
	};
	stdin.setEncoding = jest.fn();
	stdin.end = jest.fn(() => {
		stdoutStream.emit('data', stdout);
		stderrStream.emit('data', stderr);
		child.emit('close', exitCode);
	});

	return Object.assign(child, {
		stdout: stdoutStream,
		stderr: stderrStream,
		stdin,
	}) as unknown as ChildProcess;
}

describe('buildPhpPrettyPrinter', () => {
	beforeEach(() => {
		spawnMock.mockReset();
	});

	it('validates the AST payload before spawning', async () => {
		const printer = buildPhpPrettyPrinter({
			workspace: makeWorkspace(),
		});

		await expect(printer.prettyPrint(makePayload(null))).rejects.toEqual(
			expect.any(WPKernelError)
		);
	});

	it('throws when AST nodes are missing nodeType', async () => {
		const printer = buildPhpPrettyPrinter({
			workspace: makeWorkspace(),
		});

		await expect(
			printer.prettyPrint(makePayload([{}]))
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('propagates non-zero exit codes as WPKernelError', async () => {
		spawnMock.mockReturnValue(
			makeMockedChildProcess({
				exitCode: 1,
				stdout: '',
				stderr: 'boom',
			})
		);

		const printer = buildPhpPrettyPrinter({
			workspace: makeWorkspace(),
		});

		await expect(
			printer.prettyPrint(makePayload([{ nodeType: 'Stmt_Nop' }]))
		).rejects.toBeInstanceOf(WPKernelError);
	});

	it('parses successful bridge output', async () => {
		const result = {
			code: '<?php echo 1;\n',
			ast: [{ nodeType: 'Stmt_Nop' }],
		};
		spawnMock.mockReturnValue(
			makeMockedChildProcess({
				exitCode: 0,
				stdout: `${JSON.stringify(result)}\n`,
				stderr: '',
			})
		);

		const printer = buildPhpPrettyPrinter({
			workspace: makeWorkspace(),
		});
		const output = await printer.prettyPrint(
			makePayload([{ nodeType: 'Stmt_Nop' }])
		);

		expect(output).toEqual(result);
	});
});
