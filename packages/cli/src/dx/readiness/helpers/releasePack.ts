import path from 'node:path';
import { access as accessFs } from 'node:fs/promises';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { EnvironmentalError, WPKernelError } from '@wpkernel/core/error';
import { createReadinessHelper } from '../helper';
import type {
	ReadinessConfirmation,
	ReadinessDetection,
	ReadinessStatus,
	ReadinessHelper,
} from '../types';
import type { DxContext } from '../../context';

const execFile = promisify(execFileCallback);

type Access = typeof accessFs;
type ExecFile = typeof execFile;

export interface ReleasePackManifestEntry {
	readonly packageName: string;
	readonly packageDir: string;
	readonly expectedArtifacts: readonly string[];
	readonly buildArgs?: readonly string[];
}

export interface ReleasePackDependencies {
	readonly access: Access;
	readonly exec: ExecFile;
}

export interface ReleasePackHelperOptions {
	readonly manifest?: readonly ReleasePackManifestEntry[];
	readonly dependencies?: Partial<ReleasePackDependencies>;
}

export interface ReleasePackState {
	readonly repoRoot: string;
	readonly manifest: readonly ReleasePackManifestEntry[];
}

interface MissingArtefact {
	readonly entry: ReleasePackManifestEntry;
	readonly artefacts: readonly string[];
}

const DEFAULT_MANIFEST: readonly ReleasePackManifestEntry[] = [
	{
		packageName: '@wpkernel/core',
		packageDir: path.join('packages', 'core'),
		expectedArtifacts: [
			path.join('dist', 'index.js'),
			path.join('dist', 'index.d.ts'),
		],
	},
	{
		packageName: '@wpkernel/pipeline',
		packageDir: path.join('packages', 'pipeline'),
		expectedArtifacts: [
			path.join('dist', 'index.js'),
			path.join('dist', 'index.d.ts'),
			path.join('dist', 'extensions.js'),
		],
	},
	{
		packageName: '@wpkernel/cli',
		packageDir: path.join('packages', 'cli'),
		expectedArtifacts: [
			path.join('dist', 'index.js'),
			path.join('dist', 'index.d.ts'),
		],
	},
	{
		packageName: '@wpkernel/php-json-ast',
		packageDir: path.join('packages', 'php-json-ast'),
		expectedArtifacts: [
			path.join('dist', 'index.js'),
			path.join('dist', 'index.d.ts'),
			path.join('php', 'ingest-program.php'),
			path.join('php', 'pretty-print.php'),
			path.join('vendor', 'autoload.php'),
		],
	},
	{
		packageName: '@wpkernel/create-wpk',
		packageDir: path.join('packages', 'create-wpk'),
		expectedArtifacts: [path.join('dist', 'index.js')],
	},
];

function defaultDependencies(): ReleasePackDependencies {
	return {
		access: accessFs,
		exec: execFile,
	} satisfies ReleasePackDependencies;
}

function noEntry(error: unknown): boolean {
	return (
		Boolean(error && typeof error === 'object') &&
		'code' in (error as { code?: string }) &&
		(error as { code?: string }).code === 'ENOENT'
	);
}

async function resolveRepoRoot(start: string, access: Access): Promise<string> {
	let current = path.resolve(start);

	while (true) {
		const probe = path.join(current, 'pnpm-workspace.yaml');

		try {
			await access(probe);
			return current;
		} catch (error) {
			if (!noEntry(error)) {
				throw error;
			}
		}

		const parent = path.dirname(current);
		if (parent === current) {
			throw new WPKernelError('DeveloperError', {
				message:
					'Unable to resolve repository root for release-pack helper.',
				context: { start },
			});
		}

		current = parent;
	}
}

async function detectMissingArtefacts(
	repoRoot: string,
	manifest: readonly ReleasePackManifestEntry[],
	dependencies: ReleasePackDependencies
): Promise<MissingArtefact[]> {
	const missing: MissingArtefact[] = [];

	for (const entry of manifest) {
		const absent: string[] = [];

		for (const artefact of entry.expectedArtifacts) {
			const missingPath = await resolveMissingArtefact(
				repoRoot,
				entry.packageDir,
				artefact,
				dependencies.access
			);

			if (missingPath) {
				absent.push(missingPath);
			}
		}

		if (absent.length > 0) {
			missing.push({ entry, artefacts: absent });
		}
	}

	return missing;
}

async function resolveMissingArtefact(
	repoRoot: string,
	packageDir: string,
	artefact: string,
	access: Access
): Promise<string | null> {
	const absolute = path.join(repoRoot, packageDir, artefact);

	try {
		await access(absolute);
		return null;
	} catch (error) {
		if (noEntry(error)) {
			return path.relative(repoRoot, absolute);
		}

		throw error;
	}
}

async function runBuild(
	entry: ReleasePackManifestEntry,
	repoRoot: string,
	buildArgs: readonly string[],
	dependencies: ReleasePackDependencies
): Promise<void> {
	try {
		await dependencies.exec('pnpm', buildArgs, { cwd: repoRoot });
	} catch (error) {
		throw new EnvironmentalError('build.failed', {
			message: `Failed to build ${entry.packageName}.`,
			data: {
				packageName: entry.packageName,
				command: ['pnpm', ...buildArgs],
				originalError: error instanceof Error ? error : undefined,
			},
		});
	}
}

async function ensureEntryArtefacts(
	state: ReleasePackState,
	entry: ReleasePackManifestEntry,
	dependencies: ReleasePackDependencies
): Promise<void> {
	const missingBefore = await detectMissingArtefacts(
		state.repoRoot,
		[entry],
		dependencies
	);

	if (missingBefore.length === 0) {
		return;
	}

	const buildArgs = entry.buildArgs ?? [
		'--filter',
		entry.packageName,
		'build',
	];
	await runBuild(entry, state.repoRoot, buildArgs, dependencies);

	const missingAfter = await detectMissingArtefacts(
		state.repoRoot,
		[entry],
		dependencies
	);

	if (missingAfter.length === 0) {
		return;
	}

	const artefacts = missingAfter[0]?.artefacts ?? [];
	throw new EnvironmentalError('build.missingArtifact', {
		message: `Missing artefacts after build for ${entry.packageName}.`,
		data: {
			packageName: entry.packageName,
			artefacts,
		},
	});
}

function buildStatusMessage(
	status: ReadinessStatus,
	missing: MissingArtefact[]
): string {
	if (status === 'ready' || missing.length === 0) {
		return 'Release pack artefacts detected.';
	}

	const [first] = missing;
	const artefact = first?.artefacts[0];

	if (!first || !artefact) {
		return 'Release pack artefacts missing.';
	}

	return `Missing build artefact ${artefact} for ${first.entry.packageName}.`;
}

export function createReleasePackReadinessHelper(
	options: ReleasePackHelperOptions = {}
): ReadinessHelper<ReleasePackState> {
	const manifest = options.manifest ?? DEFAULT_MANIFEST;
	const dependencies = {
		...defaultDependencies(),
		...options.dependencies,
	} satisfies ReleasePackDependencies;

	return createReadinessHelper<ReleasePackState>({
		key: 'release-pack',
		metadata: {
			label: 'Release pack chain',
			description:
				'Confirms release packs are built before packaging the CLI for distribution.',
			tags: ['packaging'],
			scopes: ['doctor'],
			order: 90,
		},
		async detect(
			context: DxContext
		): Promise<ReadinessDetection<ReleasePackState>> {
			const repoRoot = await resolveRepoRoot(
				context.environment.projectRoot,
				dependencies.access
			);
			const missing = await detectMissingArtefacts(
				repoRoot,
				manifest,
				dependencies
			);
			const status: ReadinessStatus =
				missing.length === 0 ? 'ready' : 'pending';

			return {
				status,
				state: { repoRoot, manifest },
				message: buildStatusMessage(status, missing),
			};
		},
		async execute(
			_context: DxContext,
			state: ReleasePackState
		): Promise<{ state: ReleasePackState }> {
			for (const entry of state.manifest) {
				await ensureEntryArtefacts(state, entry, dependencies);
			}

			return { state };
		},
		async confirm(
			_context: DxContext,
			state: ReleasePackState
		): Promise<ReadinessConfirmation<ReleasePackState>> {
			const missing = await detectMissingArtefacts(
				state.repoRoot,
				state.manifest,
				dependencies
			);
			const status = missing.length === 0 ? 'ready' : 'pending';

			return {
				status,
				state,
				message: buildStatusMessage(status, missing),
			};
		},
	});
}
