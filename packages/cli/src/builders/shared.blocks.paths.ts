import fs from 'node:fs/promises';
import path from 'path';
import type { IRv1 } from '../ir/publicTypes';
import type { Workspace } from '../workspace';

export interface BlockPathRoots {
	readonly generated: string;
	readonly surfaced: string;
}

export function resolveBlockRoots(ir: IRv1): BlockPathRoots {
	const layout = ir.layout;
	return {
		generated: layout.resolve('blocks.generated'),
		surfaced: layout.resolve('blocks.applied'),
	};
}

export async function resolveBlockPath(
	workspace: Workspace,
	relativePath: string,
	roots: BlockPathRoots
): Promise<{ relative: string; absolute: string }> {
	const normalised = relativePath.split('\\').join('/');
	if (!normalised.startsWith(roots.generated)) {
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

async function pathExists(absolute: string): Promise<boolean> {
	try {
		await fs.stat(absolute);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}

export function toWorkspaceRelative(
	workspace: Workspace,
	absolute: string
): string {
	const relative = path.relative(workspace.root, absolute);
	if (relative === '') {
		return '.';
	}

	return relative.split(path.sep).join('/');
}
