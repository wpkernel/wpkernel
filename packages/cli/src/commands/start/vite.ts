import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { Reporter } from '@wpkernel/core/reporter';
import { forwardProcessOutput } from '../process-output';
import { serialiseError } from '../internal/serialiseError';
import type { PackageManager } from '../init/types';

export type ViteHandle = {
	readonly child: ChildProcessWithoutNullStreams;
	readonly exit: Promise<void>;
};

export function defaultSpawnViteProcess(
	packageManager: PackageManager
): ChildProcessWithoutNullStreams {
	const { command, args } = resolveViteSpawn(packageManager);
	return spawn(command, args, {
		cwd: process.cwd(),
		env: {
			...process.env,
			NODE_ENV: process.env.NODE_ENV ?? 'development',
		},
		stdio: 'pipe',
	});
}

function resolveViteSpawn(packageManager: PackageManager) {
	if (packageManager === 'pnpm') {
		return { command: 'pnpm', args: ['exec', 'vite'] };
	}

	if (packageManager === 'yarn') {
		return { command: 'yarn', args: ['run', 'vite'] };
	}

	return { command: 'npm', args: ['exec', 'vite'] };
}

export function launchViteDevServer(
	createProcess: () => ChildProcessWithoutNullStreams,
	reporter: Reporter
): ViteHandle | null {
	reporter.info('Starting Vite dev server.');

	let child: ChildProcessWithoutNullStreams;
	try {
		child = createProcess();
	} catch (error) {
		reporter.error('Failed to start Vite dev server.', {
			error: serialiseError(error),
		});
		return null;
	}

	forwardProcessOutput({
		child,
		reporter,
		label: 'Vite dev server',
	});

	const exit = new Promise<void>((resolve) => {
		let resolved = false;
		const resolveOnce = () => {
			if (!resolved) {
				resolved = true;
				resolve();
			}
		};

		child.once('error', (error) => {
			reporter.error('Vite dev server error.', {
				error: serialiseError(error),
			});
			resolveOnce();
		});
		child.once('exit', (code, signal) => {
			reporter.info('Vite dev server exited.', {
				exitCode: code,
				signal,
			});
			resolveOnce();
		});
	});

	return { child, exit };
}

export async function stopViteDevServer(
	handle: ViteHandle,
	reporter: Reporter,
	stopOptions: { awaitExit?: boolean } = {}
): Promise<void> {
	const { awaitExit = true } = stopOptions;
	const { child, exit } = handle;
	if (child.killed) {
		if (awaitExit) {
			await exit;
		}
		return;
	}

	const stopped = child.kill('SIGINT');
	if (!stopped) {
		reporter.debug('Vite dev server already stopped.');
		if (awaitExit) {
			await exit;
		}
		return;
	}

	if (!awaitExit) {
		return;
	}

	const timeout = setTimeout(() => {
		if (!child.killed) {
			reporter.warn('Vite dev server did not exit, sending SIGTERM.');
			child.kill('SIGTERM');
		}
	}, 2000);

	try {
		await exit;
	} finally {
		clearTimeout(timeout);
	}
}
