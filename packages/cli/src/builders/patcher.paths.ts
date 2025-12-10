import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import { loadLayoutFromWorkspace } from '../ir/fragments/ir.layout.core';
import type { Workspace } from '../workspace/types';
import type { IRPlanArtifacts } from '../ir/publicTypes';

export const PATCH_PATH_IDS = Object.freeze({
	planManifest: 'plan.manifest',
	patchManifest: 'patch.manifest',
	planBase: 'plan.base',
});

export function normalisePath(file: string): string {
	const replaced = file.replace(/\\/g, '/');
	const normalised = path.posix.normalize(replaced);

	if (normalised === '.' || normalised === '') {
		return '';
	}

	return normalised.replace(/^\.\//, '').replace(/^\/+/, '');
}

export function resolvePatchPaths(options: {
	readonly plan: Pick<
		IRPlanArtifacts,
		'planManifestPath' | 'patchManifestPath' | 'planBaseDir'
	>;
}): {
	readonly planPath: string;
	readonly manifestPath: string;
	readonly baseRoot: string;
} {
	const plan = options.plan;
	if (!plan) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Patch plan artifacts are required to resolve patcher paths.',
		});
	}

	return {
		planPath: plan.planManifestPath,
		manifestPath: plan.patchManifestPath,
		baseRoot: plan.planBaseDir,
	};
}

export async function resolvePatchPathsFromWorkspace(
	workspace: Workspace
): Promise<{
	planPath: string;
	manifestPath: string;
	baseRoot: string;
}> {
	const layout = await loadLayoutFromWorkspace({
		workspace,
		strict: true,
	});
	if (!layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'layout.manifest.json not found; cannot resolve patch plan paths.',
		});
	}

	return {
		planPath: layout.resolve(PATCH_PATH_IDS.planManifest),
		manifestPath: layout.resolve(PATCH_PATH_IDS.patchManifest),
		baseRoot: layout.resolve(PATCH_PATH_IDS.planBase),
	};
}
