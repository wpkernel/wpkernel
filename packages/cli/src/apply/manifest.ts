import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import type { IRResource, IRv1 } from '../ir/publicTypes';
import { toPascalCase } from '../builders/php/utils';
import type { Workspace } from '../workspace';
import { sanitizeNamespace } from '../adapters/extensions';
import { loadLayoutFromWorkspace } from '../layout/manifest';

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

export interface GenerationManifestFilePair {
	readonly file: string;
	readonly ast: string;
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
	readonly pluginLoader?: GenerationManifestFilePair;
	readonly phpIndex?: GenerationManifestFilePair;
	readonly ui?: GenerationManifestUiState;
}

export interface GenerationManifestUiState {
	readonly handle: string;
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

	const uiHandle = buildUiHandle(ir);

	return {
		version: GENERATION_STATE_VERSION,
		resources,
		...(pluginLoader ? { pluginLoader } : {}),
		...(phpIndex ? { phpIndex } : {}),
		...(uiHandle ? { ui: { handle: uiHandle } } : {}),
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
	const ui = normaliseUiState(value.ui);

	return {
		version: GENERATION_STATE_VERSION,
		resources,
		...(pluginLoader ? { pluginLoader } : {}),
		...(phpIndex ? { phpIndex } : {}),
		...(ui ? { ui } : {}),
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
	const resourceKeyLookup = buildResourceKeyLookup(ir.config.resources);

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

	return { handle } satisfies GenerationManifestUiState;
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

function buildResourceKeyLookup(
	resources: IRv1['config']['resources']
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

	const generatedArtifacts = new Set<string>([
		controllerFile,
		`${controllerFile}.ast.json`,
	]);

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

function buildFilePair(file: string): GenerationManifestFilePair | null {
	const normalised = normaliseFilePath(file);
	if (!normalised) {
		return null;
	}

	return {
		file: normalised,
		ast: `${normalised}.ast.json`,
	} satisfies GenerationManifestFilePair;
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

function normaliseFilePair(value: unknown): GenerationManifestFilePair | null {
	if (!isRecord(value)) {
		return null;
	}

	const file =
		typeof value.file === 'string' ? normaliseFilePath(value.file) : '';
	const ast =
		typeof value.ast === 'string' ? normaliseFilePath(value.ast) : '';

	if (!file || !ast) {
		return null;
	}

	return { file, ast } satisfies GenerationManifestFilePair;
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
