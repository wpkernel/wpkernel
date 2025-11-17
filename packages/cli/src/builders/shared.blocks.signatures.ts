import { createHash } from 'crypto';
import fs from 'node:fs/promises';
import type { IRBlock } from '../ir';
import type { Workspace } from '../workspace';
import { type ProcessedBlockManifest } from './shared.blocks.manifest';

export interface FileSignature {
	readonly exists: boolean;
	readonly mtimeMs?: number;
	readonly size?: number;
	readonly hash?: string;
}
export interface PathSignature {
	readonly path: string;
	readonly signature: FileSignature;
}
export interface BlockManifestSignature {
	readonly manifest: PathSignature;
	readonly render?: PathSignature;
}
export async function buildBlockSignature(
	workspace: Workspace,
	block: IRBlock,
	processed: ProcessedBlockManifest
): Promise<BlockManifestSignature> {
	const manifestAbsolutePath = workspace.resolve(block.manifestSource);
	const manifest: PathSignature = {
		path: manifestAbsolutePath,
		signature: await describeFile(manifestAbsolutePath),
	};

	const renderAbsolutePath = processed.renderPath?.absolutePath;
	const render = renderAbsolutePath
		? {
				path: renderAbsolutePath,
				signature: await describeFile(renderAbsolutePath),
			}
		: undefined;

	return { manifest, render } satisfies BlockManifestSignature;
}

async function describeFile(absolutePath: string): Promise<FileSignature> {
	try {
		const stats = await fs.lstat(absolutePath);
		let hash: string | undefined;

		if (stats.isFile()) {
			const contents = await fs.readFile(absolutePath);
			hash = createHash('sha1').update(contents).digest('hex');
		}

		return {
			exists: true,
			mtimeMs: stats.mtimeMs,
			size: stats.size,
			hash,
		} satisfies FileSignature;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return { exists: false } satisfies FileSignature;
		}

		throw error;
	}
}
export function pathSignatureEqual(
	previous?: PathSignature,
	current?: PathSignature
): boolean {
	if (!previous && !current) {
		return true;
	}

	if (!previous || !current) {
		return false;
	}

	if (previous.path !== current.path) {
		return false;
	}

	return fileSignatureEqual(previous.signature, current.signature);
}
function fileSignatureEqual(a: FileSignature, b: FileSignature): boolean {
	if (a.exists !== b.exists) {
		return false;
	}

	if (!a.exists) {
		return true;
	}

	return a.mtimeMs === b.mtimeMs && a.size === b.size && a.hash === b.hash;
}
