import path from 'node:path';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { WPKernelError } from '@wpkernel/core/error';
import type { IRBlock } from '../publicTypes';
import { createBlockHash, createBlockId } from './identity';

const SKIP_DIRECTORIES = new Set(['node_modules', '.git']);

/**
 * Discover blocks by scanning the configured blocks root for block.json files.
 *
 * This is intentionally scoped to the resolved layout path to avoid brittle
 * workspace-wide traversal.
 * @param workspaceRoot
 * @param blocksRoot
 */
export async function discoverBlocks(
	workspaceRoot: string,
	blocksRoot: string
): Promise<IRBlock[]> {
	const absoluteRoot = path.resolve(workspaceRoot, blocksRoot);
	const manifestPaths = await findManifests(absoluteRoot);
	const seenKeys = new Map<string, string>();
	const blocks: IRBlock[] = [];

	for (const manifestPath of manifestPaths.sort()) {
		const directory = path.dirname(manifestPath);
		const block = await loadBlock(manifestPath, directory, workspaceRoot);

		const existing = seenKeys.get(block.key);
		if (existing && existing !== block.directory) {
			throw new WPKernelError('ValidationError', {
				message: `Block "${block.key}" discovered in multiple directories.`,
				context: { existing, duplicate: block.directory },
			});
		}

		seenKeys.set(block.key, block.directory);
		blocks.push(block);
	}

	return blocks.sort((a, b) => a.key.localeCompare(b.key));
}

async function findManifests(root: string): Promise<string[]> {
	let entries: Dirent[];
	try {
		entries = await fs.readdir(root, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return [];
		}

		throw error;
	}

	const manifests: string[] = [];

	for (const entry of entries) {
		const fullPath = path.join(root, entry.name);

		if (entry.isFile() && entry.name === 'block.json') {
			manifests.push(fullPath);
			continue;
		}

		if (!entry.isDirectory() || SKIP_DIRECTORIES.has(entry.name)) {
			continue;
		}

		const nested = await findManifests(fullPath);
		manifests.push(...nested);
	}

	return manifests;
}

async function loadBlock(
	manifestPath: string,
	directory: string,
	workspaceRoot: string
): Promise<IRBlock> {
	const manifest = await readJson(manifestPath);
	const key = manifest.name;

	if (typeof key !== 'string' || !key) {
		throw new WPKernelError('ValidationError', {
			message: `Block manifest ${manifestPath} missing required "name" field.`,
		});
	}

	const hasRender =
		typeof manifest.render === 'string' ||
		(await pathExists(path.join(directory, 'render.php')));

	const relativeDirectory = path.relative(workspaceRoot, directory);
	const relativeManifestPath = path.relative(workspaceRoot, manifestPath);

	return {
		id: createBlockId({
			key,
			directory: relativeDirectory,
			manifestSource: relativeManifestPath,
		}),
		key,
		directory: relativeDirectory,
		hasRender,
		manifestSource: relativeManifestPath,
		hash: createBlockHash({
			key,
			directory: relativeDirectory,
			hasRender,
			manifestSource: relativeManifestPath,
		}),
	};
}

async function readJson(
	manifestPath: string
): Promise<Record<string, unknown>> {
	let raw: string;
	try {
		raw = await fs.readFile(manifestPath, 'utf8');
	} catch (error) {
		throw new WPKernelError('ValidationError', {
			message: `Failed to read block manifest at ${manifestPath}.`,
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}

	try {
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') {
			throw new Error('Manifest must be an object');
		}
		return parsed as Record<string, unknown>;
	} catch (error) {
		throw new WPKernelError('ValidationError', {
			message: `Invalid JSON in block manifest ${manifestPath}.`,
			data: error instanceof Error ? { originalError: error } : undefined,
		});
	}
}

async function pathExists(candidate: string): Promise<boolean> {
	try {
		const stat = await fs.stat(candidate);
		return stat.isFile();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}
