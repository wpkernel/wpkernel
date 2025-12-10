import path from 'node:path';
import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../../runtime';
import type { IrFragment, IrFragmentApplyOptions } from '../types';
import type { IRBlock } from '../publicTypes';
import { createBlockId, createBlockHash } from '../shared/identity';
import { pathExists } from '../../utils';

/**
 * Creates an IR fragment that discovers and processes WordPress blocks.
 *
 * This fragment depends on the meta fragment to determine the workspace root
 * and then uses `block-discovery` to find and include block definitions in the IR.
 *
 * @category IR
 * @returns An `IrFragment` instance for block discovery.
 */
export function createBlocksFragment(): IrFragment {
	return createHelper({
		key: 'ir.blocks.core',
		kind: 'fragment',
		dependsOn: ['ir.meta.core', 'ir.layout.core'],
		async apply({ input, output, context }: IrFragmentApplyOptions) {
			if (!input.draft.layout) {
				throw new WPKernelError('ValidationError', {
					message: 'Layout fragment must run before blocks fragment.',
				});
			}

			const blocksRoot = input.draft.layout.resolve('blocks.applied');
			const blocks = await discoverBlocks(
				context.workspace.root,
				blocksRoot
			);
			output.assign({ blocks });
		},
	});
}

const SKIP_DIRECTORIES = new Set(['node_modules', '.git']);

/**
 * Discover blocks by scanning the layout-resolved blocks root for block.json files.
 *
 * This is intentionally scoped to the resolved layout path to avoid brittle
 * workspace-wide traversal.
 *
 * @param workspaceRoot - Absolute workspace root from the meta fragment.
 * @param blocksRoot    - Layout-resolved blocks root (e.g. `blocks.applied`).
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

export async function findManifests(root: string): Promise<string[]> {
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

export async function loadBlock(
	manifestPath: string,
	directory: string,
	workspaceRoot: string
): Promise<IRBlock> {
	const manifest = await readJson(manifestPath);
	const key = (manifest as Record<string, unknown>).name;

	if (typeof key !== 'string' || !key) {
		throw new WPKernelError('ValidationError', {
			message: `Block manifest ${manifestPath} missing required "name" field.`,
		});
	}

	const hasRender =
		typeof (manifest as Record<string, unknown>).render === 'string' ||
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

export async function readJson(
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
