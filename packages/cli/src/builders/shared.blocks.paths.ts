import path from 'path';
import type { IRv1 } from '../ir/publicTypes';
import type { Workspace } from '../workspace';
import { pathExists } from '../utils';
import { toWorkspaceRelative as toWorkspaceRelativeFromWorkspace } from '../workspace';

export interface BlockPathRoots {
	readonly generated: string;
	readonly surfaced: string;
}

export function resolveBlockRoots(ir: IRv1): BlockPathRoots | null {
	const blockPlans = Object.values(ir.artifacts?.blocks ?? {});
	if (blockPlans.length === 0) {
		return null;
	}

	const generatedRoot = ir.artifacts?.blockRoots?.generated;
	const appliedRoot = ir.artifacts?.blockRoots?.applied;
	if (!generatedRoot || !appliedRoot) {
		return null;
	}

	return {
		generated: generatedRoot,
		surfaced: appliedRoot,
	};
}

export async function resolveBlockPath(
	workspace: Workspace,
	relativePath: string,
	roots: BlockPathRoots | null
): Promise<{ relative: string; absolute: string }> {
	const normalised = relativePath.split('\\').join('/');
	if (!roots || !normalised.startsWith(roots.generated)) {
		return {
			relative: normalised,
			absolute: workspace.resolve(normalised),
		};
	}

	const suffix = path.posix.relative(roots.generated, normalised);
	if (suffix.startsWith('..')) {
		return {
			relative: normalised,
			absolute: workspace.resolve(normalised),
		};
	}

	const surfacedRelative = path.posix.join(roots.surfaced, suffix);
	const surfacedAbsolute = workspace.resolve(surfacedRelative);
	if (await pathExists(surfacedAbsolute)) {
		return { relative: surfacedRelative, absolute: surfacedAbsolute };
	}

	return {
		relative: normalised,
		absolute: workspace.resolve(normalised),
	};
}

export function toWorkspaceRelative(
	workspace: Workspace,
	targetPath: string
): string {
	return toWorkspaceRelativeFromWorkspace(workspace, targetPath);
}
