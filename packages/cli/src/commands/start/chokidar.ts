import type * as chokidarModule from 'chokidar';
import { WPKernelError } from '@wpkernel/core/error';

let chokidarModulePromise: Promise<typeof chokidarModule> | null = null;

async function loadChokidarModule(): Promise<typeof chokidarModule> {
	if (!chokidarModulePromise) {
		chokidarModulePromise = import('chokidar');
	}

	return chokidarModulePromise;
}

export async function loadChokidarWatch(): Promise<
	typeof chokidarModule.watch
> {
	const module = await loadChokidarModule();
	if (typeof module.watch === 'function') {
		return module.watch;
	}

	if (module.default) {
		const candidate = module.default as unknown;
		if (typeof candidate === 'function') {
			return candidate as typeof module.watch;
		}

		if (typeof (candidate as { watch?: unknown }).watch === 'function') {
			return (candidate as { watch: typeof module.watch }).watch;
		}
	}

	throw new WPKernelError('DeveloperError', {
		message: 'Unable to resolve chokidar.watch for CLI start command.',
	});
}
