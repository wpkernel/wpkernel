import path from 'node:path';
import { loadWPKernelConfig } from '../../config';
import { buildWorkspace } from '../../workspace';
import { loadLayoutFromWorkspace } from '../../layout/manifest';
import { WPKernelError } from '@wpkernel/core/error';

export interface StartLayoutPaths {
	readonly phpGenerated: string;
	readonly phpTargetDir: string;
}

export async function resolveStartLayoutPaths(): Promise<StartLayoutPaths> {
	const workspace = buildWorkspace(process.cwd());

	let overrides: Record<string, string> | undefined;
	try {
		const loaded = await loadWPKernelConfig();
		overrides = loaded.config.directories as
			| Record<string, string>
			| undefined;
	} catch {
		// If config is missing, continue with manifest defaults.
	}

	const layout = await loadLayoutFromWorkspace({
		workspace,
		overrides,
		strict: true,
	});

	if (!layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'layout.manifest.json not found; cannot resolve start layout paths.',
		});
	}

	const phpGenerated = layout.resolve('php.generated');
	const controllersTarget = layout.resolve('controllers.applied');

	return {
		phpGenerated,
		phpTargetDir: path.posix.dirname(controllersTarget),
	};
}
