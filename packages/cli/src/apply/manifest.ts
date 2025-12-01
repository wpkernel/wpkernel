import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import type { IRResource, IRv1 } from '../ir/publicTypes';
import { toPascalCase } from '../builders/php/utils';
import type { Workspace } from '../workspace';
import { sanitizeNamespace } from '../adapters/extensions';
import { loadLayoutFromWorkspace } from '../layout/manifest';
import { collectResourceDescriptors } from '../builders/ts/utils';
import { resolveAdminScreenComponentMetadata } from '../builders/ts/admin-shared';

export const GENERATION_STATE_VERSION = 1 as const;

export async function resolveGenerationStatePath(
	workspace: Workspace
): Promise<string> {
	const layout = await loadLayoutFromWorkspace({
		workspace,
		strict: true,
	});

	if (!layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'layout.manifest.json not found; cannot resolve apply state path.',
		});
	}

	return layout.resolve('apply.state');
}

export interface GenerationManifestFile {
	readonly file: string;
}

export interface GenerationManifestFilePair {
	readonly generated: string;
	readonly applied: string;
}

export interface GenerationManifestResourceArtifacts {
	readonly generated: readonly string[];
	readonly shims: readonly string[];
}

export interface GenerationManifestResourceEntry {
	readonly hash: string;
	readonly artifacts: GenerationManifestResourceArtifacts;
}

/**
 * Represents the manifest of generated files and resources.
 * @public
 */
export interface GenerationManifest {
	readonly version: typeof GENERATION_STATE_VERSION;
	readonly resources: Record<string, GenerationManifestResourceEntry>;
	readonly pluginLoader?: GenerationManifestFile;
	readonly phpIndex?: GenerationManifestFile;
	readonly jsRuntime?: { readonly files: readonly string[] };
	readonly ui?: GenerationManifestUiState;
	readonly blocks?: {
		readonly files: readonly GenerationManifestFilePair[];
	};
}

/**
 * Represents the UI state within the {@link GenerationManifest}.
 *
 * @category CLI
 */
export interface GenerationManifestUiState {
	readonly handle: string;
	readonly files: readonly GenerationManifestFilePair[];
}

export interface RemovedResourceEntry {
	readonly resource: string;
	readonly generated: readonly string[];
	readonly shims: readonly string[];
}

export interface GenerationManifestDiff {
	readonly removed: readonly RemovedResourceEntry[];
}

export function buildEmptyGenerationState(): GenerationManifest {
	return {
		version: GENERATION_STATE_VERSION,
		resources: {},
	} satisfies GenerationManifest;
}

export async function readGenerationState(
	workspace: Workspace
): Promise<GenerationManifest> {
	const statePath = await resolveGenerationStatePath(workspace);
	const contents = await workspace.readText(statePath);
	if (!contents) {
		return buildEmptyGenerationState();
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(contents) as unknown;
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to parse generation state JSON.',
			context: {
				file: statePath,
				error: (error as Error).message,
			},
		});
	}

	return normaliseGenerationState(parsed);
}

export async function writeGenerationState(
	workspace: Workspace,
	state: GenerationManifest
): Promise<void> {
	const statePath = await resolveGenerationStatePath(workspace);
	await workspace.writeJson(statePath, state, { pretty: true });
}

export function buildGenerationManifestFromIr(
	ir: IRv1 | null
): GenerationManifest {
	if (!ir) {
		return buildEmptyGenerationState();
	}

	if (!ir.layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'IR layout fragment did not resolve layout before building generation manifest.',
		});
	}

	const resources = buildResourceEntries(ir);
	const phpOutput = normaliseDirectory(ir.php.outputDir);
	const pluginLoader = buildFilePair(
		path.posix.join(phpOutput, 'plugin.php')
	);
	const phpIndex = buildFilePair(path.posix.join(phpOutput, 'index.php'));

	const jsRuntime = buildJsRuntimeState(ir);
	const ui = buildUiState(ir);
	const blocks = buildBlocksState(ir);

	return {
		version: GENERATION_STATE_VERSION,
		resources,
		...(pluginLoader ? { pluginLoader } : {}),
		...(phpIndex ? { phpIndex } : {}),
		...(jsRuntime ? { jsRuntime } : {}),
		...(ui ? { ui } : {}),
		...(blocks ? { blocks } : {}),
	} satisfies GenerationManifest;
}

export function diffGenerationState(
	previous: GenerationManifest,
	next: GenerationManifest
): GenerationManifestDiff {
	const removed: RemovedResourceEntry[] = [];

	for (const [resource, entry] of Object.entries(previous.resources)) {
		const nextEntry = next.resources[resource];

		if (!nextEntry) {
			removed.push({
				resource,
				generated: [...entry.artifacts.generated],
				shims: [...entry.artifacts.shims],
			});
			continue;
		}

		const nextGenerated = new Set(nextEntry.artifacts.generated);
		const nextShims = new Set(nextEntry.artifacts.shims);

		const removedGenerated = entry.artifacts.generated.filter(
			(file) => !nextGenerated.has(file)
		);
		const removedShims = entry.artifacts.shims.filter(
			(file) => !nextShims.has(file)
		);

		if (removedGenerated.length === 0 && removedShims.length === 0) {
			continue;
		}

		removed.push({
			resource,
			generated: removedGenerated,
			shims: removedShims,
		});
	}

	return { removed } satisfies GenerationManifestDiff;
}

export function normaliseGenerationState(value: unknown): GenerationManifest {
	if (!isRecord(value)) {
		return buildEmptyGenerationState();
	}

	if (value.version !== GENERATION_STATE_VERSION) {
		return buildEmptyGenerationState();
	}

	const resources = normaliseResources(value.resources);
	const pluginLoader = normaliseFilePair(value.pluginLoader);
	const phpIndex = normaliseFilePair(value.phpIndex);
	const jsRuntime = normaliseJsRuntime(value.jsRuntime);
	const ui = normaliseUiState(value.ui);
	const blocks = normaliseBlocksState(value.blocks);

	return {
		version: GENERATION_STATE_VERSION,
		resources,
		...(pluginLoader ? { pluginLoader } : {}),
		...(phpIndex ? { phpIndex } : {}),
		...(jsRuntime ? { jsRuntime } : {}),
		...(ui ? { ui } : {}),
		...(blocks ? { blocks } : {}),
	} satisfies GenerationManifest;
}

function normaliseResources(
	value: unknown
): Record<string, GenerationManifestResourceEntry> {
	if (!isRecord(value)) {
		return {};
	}

	const entries: Record<string, GenerationManifestResourceEntry> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (!key) {
			continue;
		}

		const normalised = normaliseResourceEntry(entry);
		if (!normalised) {
			continue;
		}

		entries[key] = normalised;
	}

	return entries;
}

function buildResourceEntries(
	ir: IRv1
): Record<string, GenerationManifestResourceEntry> {
	if (!ir.layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'IR layout fragment did not resolve layout before building resource entries.',
		});
	}

	const entries: Record<string, GenerationManifestResourceEntry> = {};
	const autoloadRoot = normaliseDirectory(ir.php.autoload);
	const outputDir = normaliseDirectory(ir.php.outputDir);
	const uiRoot = normaliseDirectory(ir.layout.resolve('ui.generated'));
	const resourceKeyLookup = buildResourceKeyLookup(ir.resources);

	for (const resource of ir.resources) {
		const entry = buildResourceEntry({
			resource,
			autoloadRoot,
			outputDir,
			uiRoot,
			resourceKeyLookup,
		});

		if (!entry) {
			continue;
		}

		entries[resource.name] = entry;
	}

	return entries;
}

function normaliseUiState(
	value: unknown
): GenerationManifestUiState | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const handle = typeof value.handle === 'string' ? value.handle.trim() : '';
	if (!handle) {
		return undefined;
	}

	const files = normaliseFilePairs(value.files);
	if (files.length === 0) {
		return undefined;
	}

	return { handle, files } satisfies GenerationManifestUiState;
}

function normaliseBlocksState(
	value: unknown
): { readonly files: readonly GenerationManifestFilePair[] } | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const files = normaliseFilePairs(value.files);
	if (files.length === 0) {
		return undefined;
	}

	return { files };
}

function normaliseJsRuntime(
	value: unknown
): { readonly files: readonly string[] } | undefined {
	if (!isRecord(value) || !Array.isArray(value.files)) {
		return undefined;
	}

	const files = value.files
		.map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
		.filter(Boolean);

	if (files.length === 0) {
		return undefined;
	}

	return { files };
}

function buildJsRuntimeState(
	ir: IRv1
): { readonly files: readonly string[] } | undefined {
	if (!ir.capabilityMap || ir.capabilityMap.definitions.length === 0) {
		return undefined;
	}

	const jsRoot = normaliseDirectory(ir.layout.resolve('js.generated'));
	const files = [
		path.posix.join(jsRoot, 'capabilities.ts'),
		path.posix.join(jsRoot, 'capabilities.d.ts'),
		path.posix.join(jsRoot, 'index.ts'),
		path.posix.join(jsRoot, 'index.d.ts'),
	] as const;

	return { files };
}

function buildUiHandle(ir: IRv1): string | null {
	const namespaceCandidate =
		ir.meta.sanitizedNamespace ?? ir.meta.namespace ?? '';
	const slug = sanitizeNamespace(namespaceCandidate);
	if (!slug) {
		return null;
	}

	const hasUiResources = (ir.resources ?? []).some((resource) =>
		Boolean(resource.ui?.admin?.dataviews)
	);

	if (!hasUiResources) {
		return null;
	}

	return `wp-${slug}-ui`;
}

function buildUiFiles(ir: IRv1): GenerationManifestFilePair[] {
	if (!ir.layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'IR layout fragment did not resolve layout before building UI state.',
		});
	}

	const uiGenerated = ir.layout.resolve('ui.generated');
	const uiApplied = ir.layout.resolve('ui.applied');
	const uiResourcesApplied = ir.layout.resolve('ui.resources.applied');
	const descriptors = collectResourceDescriptors(ir);
	if (descriptors.length === 0) {
		return [];
	}

	const pairs: GenerationManifestFilePair[] = [];
	const addPair = (generated: string, applied: string) => {
		const normalisedGenerated = normaliseFilePath(generated);
		const normalisedApplied = normaliseFilePath(applied);
		if (!normalisedGenerated || !normalisedApplied) {
			return;
		}
		pairs.push({
			generated: normalisedGenerated,
			applied: normalisedApplied,
		});
	};

	addPair(
		path.posix.join(uiGenerated, 'index.tsx'),
		path.posix.join(uiApplied, 'index.tsx')
	);
	addPair(
		path.posix.join(uiGenerated, 'runtime.ts'),
		path.posix.join(uiApplied, 'runtime.ts')
	);

	for (const descriptor of descriptors) {
		const resourceKey = descriptor.key;
		const resourceFile = `${resourceKey}.ts`;
		addPair(
			path.posix.join(uiGenerated, 'resources', resourceFile),
			path.posix.join(uiResourcesApplied, resourceFile)
		);

		const { fileName, directories } =
			resolveAdminScreenComponentMetadata(descriptor);
		const screenSuffix = path.posix.join(
			'app',
			descriptor.name,
			'admin',
			...directories,
			`${fileName}.tsx`
		);

		addPair(
			path.posix.join(uiGenerated, screenSuffix),
			path.posix.join(uiApplied, screenSuffix)
		);
	}

	return pairs;
}

function buildUiState(ir: IRv1): GenerationManifestUiState | null {
	const handle = buildUiHandle(ir);
	const files = buildUiFiles(ir);
	if (!handle || files.length === 0) {
		return null;
	}

	return {
		handle,
		files,
	} satisfies GenerationManifestUiState;
}

function buildBlocksState(
	_ir: IRv1
): { readonly files: readonly GenerationManifestFilePair[] } | null {
	// TODO: wire deterministic block surfacing via IR once block discovery
	// is refactored away from globbing.
	return null;
}

function buildResourceKeyLookup(
	resources: IRv1['resources']
): Map<string, string> {
	const lookup = new Map<string, string>();

	for (const [resourceKey, resourceConfig] of Object.entries(
		resources ?? {}
	)) {
		const name = resourceConfig?.name;
		if (typeof name === 'string' && !lookup.has(name)) {
			lookup.set(name, resourceKey);
		}
	}

	return lookup;
}

function buildResourceEntry({
	resource,
	autoloadRoot,
	outputDir,
	uiRoot,
	resourceKeyLookup,
}: {
	readonly resource: IRResource;
	readonly autoloadRoot: string;
	readonly outputDir: string;
	readonly uiRoot: string;
	readonly resourceKeyLookup: Map<string, string>;
}): GenerationManifestResourceEntry | null {
	const pascal = toPascalCase(resource.name);
	if (!pascal) {
		return null;
	}

	const controllerFile = path.posix.join(
		outputDir,
		'Rest',
		`${pascal}Controller.php`
	);

	const generatedArtifacts = new Set<string>([controllerFile]);

	const resourceKey = resourceKeyLookup.get(resource.name) ?? resource.name;
	if (resource.ui?.admin?.dataviews) {
		const registryPath = path.posix.join(
			uiRoot,
			'registry',
			'dataviews',
			`${resourceKey}.ts`
		);
		generatedArtifacts.add(registryPath);

		const dataviewFixturePath = path.posix.join(
			uiRoot,
			'fixtures',
			'dataviews',
			`${resourceKey}.ts`
		);
		generatedArtifacts.add(dataviewFixturePath);

		const interactivityFixturePath = path.posix.join(
			uiRoot,
			'fixtures',
			'interactivity',
			`${resourceKey}.ts`
		);
		generatedArtifacts.add(interactivityFixturePath);
	}

	const shimBase = path.posix.join('Rest', `${pascal}Controller.php`);
	const shimRoot = autoloadRoot ? autoloadRoot : '';
	const shimPath = shimRoot ? path.posix.join(shimRoot, shimBase) : shimBase;

	return {
		hash: resource.hash.value,
		artifacts: {
			generated: Array.from(generatedArtifacts),
			shims: [shimPath],
		},
	} satisfies GenerationManifestResourceEntry;
}

function buildFilePair(file: string): GenerationManifestFile | null {
	const normalised = normaliseFilePath(file);
	if (!normalised) {
		return null;
	}

	return {
		file: normalised,
	} satisfies GenerationManifestFile;
}

function normaliseDirectory(directory: string): string {
	const normalised = normaliseFilePath(directory);
	return normalised || '';
}

function normaliseResourceEntry(
	value: unknown
): GenerationManifestResourceEntry | null {
	if (!isRecord(value)) {
		return null;
	}

	const hash = typeof value.hash === 'string' ? value.hash : null;
	if (!hash) {
		return null;
	}

	const artifacts = normaliseResourceArtifacts(value.artifacts);
	if (!artifacts) {
		return null;
	}

	return { hash, artifacts } satisfies GenerationManifestResourceEntry;
}

function normaliseResourceArtifacts(
	value: unknown
): GenerationManifestResourceArtifacts | null {
	if (!isRecord(value)) {
		return null;
	}

	const generated = normaliseFileList(value.generated);
	if (generated.length === 0) {
		return null;
	}

	const shims = normaliseFileList(value.shims);

	return {
		generated,
		shims,
	} satisfies GenerationManifestResourceArtifacts;
}

function normaliseFilePair(value: unknown): GenerationManifestFile | null {
	if (!isRecord(value)) {
		return null;
	}

	const file =
		typeof value.file === 'string' ? normaliseFilePath(value.file) : '';

	if (!file) {
		return null;
	}

	return { file } satisfies GenerationManifestFile;
}

function normaliseFilePairs(value: unknown): GenerationManifestFilePair[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const results: GenerationManifestFilePair[] = [];
	for (const entry of value) {
		if (!isRecord(entry)) {
			continue;
		}

		const generated =
			typeof entry.generated === 'string'
				? normaliseFilePath(entry.generated)
				: '';
		const applied =
			typeof entry.applied === 'string'
				? normaliseFilePath(entry.applied)
				: '';

		if (!generated || !applied) {
			continue;
		}

		results.push({ generated, applied });
	}

	return results;
}

function normaliseFileList(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const results: string[] = [];
	const seen = new Set<string>();

	for (const entry of value) {
		if (typeof entry !== 'string') {
			continue;
		}

		const normalised = normaliseFilePath(entry);
		if (!normalised || seen.has(normalised)) {
			continue;
		}

		seen.add(normalised);
		results.push(normalised);
	}

	return results;
}

function normaliseFilePath(file: string): string {
	const replaced = file.replace(/\\/g, '/');
	const normalised = path.posix.normalize(replaced);

	if (normalised === '.' || normalised === '') {
		return '';
	}

	return normalised.replace(/^\.\/+/u, '').replace(/^\/+/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
