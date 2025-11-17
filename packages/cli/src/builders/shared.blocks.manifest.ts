import path from 'node:path';
import type { Workspace } from '../workspace/types';
import type { IRBlock } from '../ir/publicTypes';
import { buildBlockRegistrarMetadata } from './ts/shared.metadata';
import type { BlockRegistrarMetadata } from './ts/types';
import { resolveBlockPath, toWorkspaceRelative } from './shared.blocks.paths';
import {
	type BlockManifestSignature,
	buildBlockSignature,
	pathSignatureEqual,
} from './shared.blocks.signatures';
import {
	resolveRenderResolution,
	manifestDeclaresRenderCallback,
	validateBlockManifest,
} from './shared.blocks.validation';

type BlockManifest = Record<string, unknown>;

/**
 * Minimal metadata persisted for each discovered `block.json`.
 *
 * @category Builders
 */
export interface BlockManifestEntry {
	readonly directory: string;
	readonly manifest: string;
	readonly render?: string;
}

/**
 * Rich manifest record used by both PHP + TS block builders.
 *
 * @category Builders
 */
export interface ProcessedBlockManifest {
	readonly block: IRBlock;
	readonly manifestEntry?: BlockManifestEntry;
	readonly manifestAbsolutePath?: string;
	readonly manifestDirectory?: string;
	readonly manifestObject?: Record<string, unknown>;
	readonly warnings: readonly string[];
	readonly renderPath?: {
		readonly absolutePath: string;
		readonly relativePath: string;
	};
	readonly renderStub?: {
		readonly blockKey: string;
		readonly manifest: Record<string, unknown>;
		readonly target: {
			readonly absolutePath: string;
			readonly relativePath: string;
		};
	};
	readonly registrar: BlockRegistrarMetadata;
}

interface BlockManifestCache {
	key: string;
	data: Map<string, ProcessedBlockManifest>;
	signatures: Map<string, BlockManifestSignature>;
}

const BLOCK_CACHE = new WeakMap<Workspace, BlockManifestCache>();
/**
 * Options for scanning the workspace for block manifests.
 *
 * @category Builders
 */
export interface CollectBlockManifestsOptions {
	readonly workspace: Workspace;
	readonly blocks: readonly IRBlock[];
	readonly roots: {
		readonly generated: string;
		readonly surfaced: string;
	};
}

/**
 * Collects, validates, and caches processed block manifests for later builders.
 *
 * @param    root0
 * @param    root0.workspace
 * @param    root0.blocks
 * @param    root0.roots
 * @category Builders
 */
export async function collectBlockManifests({
	workspace,
	blocks,
	roots,
}: CollectBlockManifestsOptions): Promise<Map<string, ProcessedBlockManifest>> {
	const sortedBlocks = [...blocks].sort((a, b) => a.key.localeCompare(b.key));
	const cacheKey = buildCacheKey(sortedBlocks);
	const cached = BLOCK_CACHE.get(workspace);
	if (cached && cached.key === cacheKey) {
		const valid = await isCacheValid(workspace, sortedBlocks, cached);
		if (valid) {
			return cached.data;
		}
	}

	const map = new Map<string, ProcessedBlockManifest>();
	const signatures = new Map<string, BlockManifestSignature>();

	for (const block of sortedBlocks) {
		const processed = await processBlock(workspace, block, roots);
		map.set(block.key, processed);
		signatures.set(
			block.key,
			await buildBlockSignature(workspace, block, processed)
		);
	}

	BLOCK_CACHE.set(workspace, { key: cacheKey, data: map, signatures });
	return map;
}

function buildCacheKey(blocks: readonly IRBlock[]): string {
	return blocks
		.map((block) =>
			[
				block.key,
				block.directory,
				block.manifestSource,
				block.hasRender ? '1' : '0',
			].join('::')
		)
		.join('|');
}

async function processBlock(
	workspace: Workspace,
	block: IRBlock,
	roots: { readonly generated: string; readonly surfaced: string }
): Promise<ProcessedBlockManifest> {
	const registrar = buildBlockRegistrarMetadata(block.key);
	const warnings: string[] = [];
	const manifestLocation = await resolveBlockPath(
		workspace,
		block.manifestSource,
		roots
	);
	const blockDirectoryLocation = await resolveBlockPath(
		workspace,
		block.directory,
		roots
	);

	const manifestRead = await readManifest(workspace, {
		...block,
		manifestSource: manifestLocation.relative,
	});
	warnings.push(...manifestRead.warnings);

	if (!manifestRead.manifestObject) {
		return buildManifestResult({
			block,
			warnings,
			registrar,
		});
	}

	const manifestDirectory = path.dirname(manifestLocation.absolute);
	const {
		manifestEntry,
		renderPath,
		renderStub,
		warnings: renderWarnings,
	} = await resolveRender({
		workspace,
		block,
		manifestDirectory,
		manifestRelativePath: manifestLocation.relative,
		blockDirectoryRelative: blockDirectoryLocation.relative,
		blockDirectoryAbsolute: blockDirectoryLocation.absolute,
		manifestObject: manifestRead.manifestObject,
		warnings,
	});

	warnings.push(...renderWarnings);

	return buildManifestResult({
		block,
		manifestEntry,
		manifestAbsolutePath: manifestLocation.absolute,
		manifestDirectory,
		manifestObject: manifestRead.manifestObject,
		warnings,
		renderPath,
		renderStub,
		registrar,
	});
}

function buildManifestResult(
	result: Omit<ProcessedBlockManifest, 'manifestObject'> & {
		readonly manifestObject?: BlockManifest;
	}
): ProcessedBlockManifest {
	return {
		...result,
	} satisfies ProcessedBlockManifest;
}

async function resolveRender({
	workspace,
	block,
	manifestDirectory,
	manifestRelativePath,
	blockDirectoryRelative,
	blockDirectoryAbsolute,
	manifestObject,
	warnings,
}: {
	workspace: Workspace;
	block: IRBlock;
	manifestDirectory: string;
	manifestRelativePath: string;
	blockDirectoryRelative: string;
	blockDirectoryAbsolute: string;
	manifestObject: BlockManifest;
	warnings: string[];
}): Promise<{
	manifestEntry: BlockManifestEntry;
	renderStub: ProcessedBlockManifest['renderStub'];
	renderPath:
		| {
				absolutePath: string;
				relativePath: string;
		  }
		| undefined;
	warnings: string[];
}> {
	const manifestEntry: BlockManifestEntry = {
		directory: blockDirectoryRelative,
		manifest: manifestRelativePath,
	} satisfies BlockManifestEntry;

	const renderResolution = await resolveRenderResolution({
		workspace,
		manifestDirectory,
		manifestObject,
	});

	const manifestDeclaresCallback =
		manifestDeclaresRenderCallback(manifestObject);

	if (manifestDeclaresCallback) {
		return {
			manifestEntry,
			renderPath: undefined,
			renderStub: undefined,
			warnings,
		};
	}

	if (renderResolution) {
		return handleDeclaredRender({
			block,
			renderResolution,
			manifestEntry,
			manifestObject,
			warnings,
		});
	}

	return handleFallbackRender({
		workspace,
		block,
		blockDirectoryAbsolute,
		warnings,
		manifestEntry,
		manifestObject,
	});
}

function handleDeclaredRender({
	block,
	renderResolution,
	manifestEntry,
	manifestObject,
	warnings,
}: {
	block: IRBlock;
	renderResolution: NonNullable<
		Awaited<ReturnType<typeof resolveRenderResolution>>
	>;
	manifestEntry: BlockManifestEntry;
	manifestObject: BlockManifest;
	warnings: string[];
}): {
	manifestEntry: BlockManifestEntry;
	renderPath:
		| {
				absolutePath: string;
				relativePath: string;
		  }
		| undefined;
	renderStub: ProcessedBlockManifest['renderStub'];
	warnings: string[];
} {
	const { absolutePath, relativePath, exists, declared } = renderResolution;
	let renderStub: ProcessedBlockManifest['renderStub'];

	const updatedEntry = {
		...manifestEntry,
		render: relativePath,
	} satisfies BlockManifestEntry;

	if (exists) {
		return {
			manifestEntry: updatedEntry,
			renderPath: { absolutePath, relativePath },
			renderStub: undefined,
			warnings,
		};
	}

	if (declared) {
		renderStub = {
			blockKey: block.key,
			manifest: manifestObject ?? {},
			target: {
				absolutePath,
				relativePath,
			},
		} satisfies ProcessedBlockManifest['renderStub'];
		warnings.push(
			`Block "${block.key}": render file declared in manifest was missing; created stub at ${relativePath}.`
		);
	} else {
		warnings.push(
			`Block "${block.key}": expected render template at ${relativePath} but it was not found.`
		);
	}

	return {
		manifestEntry: updatedEntry,
		renderPath: { absolutePath, relativePath },
		renderStub,
		warnings,
	};
}

async function handleFallbackRender({
	workspace,
	block,
	blockDirectoryAbsolute,
	manifestEntry,
	manifestObject,
	warnings,
}: {
	workspace: Workspace;
	block: IRBlock;
	blockDirectoryAbsolute: string;
	manifestEntry: BlockManifestEntry;
	manifestObject: BlockManifest;
	warnings: string[];
}): Promise<{
	manifestEntry: BlockManifestEntry;
	renderPath:
		| {
				absolutePath: string;
				relativePath: string;
		  }
		| undefined;
	renderStub: ProcessedBlockManifest['renderStub'];
	warnings: string[];
}> {
	const fallbackAbsolute = path.resolve(blockDirectoryAbsolute, 'render.php');
	const fallbackRelative = toWorkspaceRelative(workspace, fallbackAbsolute);
	const exists = await workspace.exists(fallbackAbsolute);

	const updatedEntry = {
		...manifestEntry,
		render: fallbackRelative,
	} satisfies BlockManifestEntry;

	if (exists) {
		return {
			manifestEntry: updatedEntry,
			renderPath: {
				absolutePath: fallbackAbsolute,
				relativePath: fallbackRelative,
			},
			renderStub: undefined,
			warnings,
		};
	}

	const renderStub = {
		blockKey: block.key,
		manifest: manifestObject ?? {},
		target: {
			absolutePath: fallbackAbsolute,
			relativePath: fallbackRelative,
		},
	} satisfies ProcessedBlockManifest['renderStub'];
	warnings.push(
		`Block "${block.key}": render template was not declared and none was found; created stub at ${fallbackRelative}.`
	);

	return {
		manifestEntry: updatedEntry,
		renderPath: {
			absolutePath: fallbackAbsolute,
			relativePath: fallbackRelative,
		},
		renderStub,
		warnings,
	};
}

async function isCacheValid(
	workspace: Workspace,
	blocks: readonly IRBlock[],
	cache: BlockManifestCache
): Promise<boolean> {
	if (
		cache.data.size !== blocks.length ||
		cache.signatures.size !== blocks.length
	) {
		return false;
	}

	for (const block of blocks) {
		const processed = cache.data.get(block.key);
		const previousSignature = cache.signatures.get(block.key);
		if (!processed || !previousSignature) {
			return false;
		}

		const currentSignature = await buildBlockSignature(
			workspace,
			block,
			processed
		);

		if (
			!pathSignatureEqual(
				previousSignature.manifest,
				currentSignature.manifest
			)
		) {
			return false;
		}

		if (
			!pathSignatureEqual(
				previousSignature.render,
				currentSignature.render
			)
		) {
			return false;
		}
	}

	return true;
}

async function readManifest(
	workspace: Workspace,
	block: IRBlock
): Promise<{
	manifestObject: Record<string, unknown> | null;
	warnings: string[];
}> {
	const warnings: string[] = [];
	try {
		const contents = await workspace.readText(block.manifestSource);
		if (!contents) {
			warnings.push(
				`Block "${block.key}": Unable to read manifest at ${block.manifestSource}: File not found.`
			);
			return { manifestObject: null, warnings };
		}

		try {
			const parsed = JSON.parse(contents) as Record<string, unknown>;
			warnings.push(
				...validateBlockManifest(parsed, block).map(
					(message) => `Block "${block.key}": ${message}`
				)
			);
			return { manifestObject: parsed, warnings };
		} catch (error) {
			warnings.push(
				`Block "${block.key}": Invalid JSON in block manifest ${block.manifestSource}: ${String(
					error
				)}`
			);
			return { manifestObject: null, warnings };
		}
	} catch (error) {
		warnings.push(
			`Block "${block.key}": Unable to read manifest at ${block.manifestSource}: ${String(
				error
			)}`
		);
		return { manifestObject: null, warnings };
	}
}
