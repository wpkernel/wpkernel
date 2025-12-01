import path from 'node:path';
import { createHelper, requireIr } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderOutput,
} from '../../runtime/types';
import type { IRBlock, IRv1 } from '../../ir/publicTypes';
import {
	collectBlockManifests,
	type BlockManifestEntry,
	type ProcessedBlockManifest,
} from '../shared.blocks.manifest';
import {
	buildBlockModule,
	buildProgramTargetPlanner,
	DEFAULT_DOC_HEADER,
	getPhpBuilderChannel,
	type ProgramTargetPlannerOptions,
} from '@wpkernel/wp-json-ast';
import {
	type CollatePhpBlockArtifactsOptions,
	type CollatedPhpBlockArtifacts,
	type StageRenderStubsOptions,
} from './types';
import type { Workspace } from '../../workspace';
import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';

type BlockModuleQueuedFile = ReturnType<
	typeof buildBlockModule
>['files'][number];
type PlannerWorkspace = ProgramTargetPlannerOptions['workspace'];

/**
 * Creates a PHP builder helper for generating WordPress blocks.
 *
 * This helper processes block configurations from the IR, collects block manifests,
 * generates PHP artifacts for block registration, and stages render stubs for SSR blocks.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating PHP block code.
 */
export function createPhpBlocksHelper(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.blocks',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.channel.bootstrap',
			'ir.blocks.core',
			'ir.layout.core',
			'ir.meta.core',
			'ir.artifacts.plan',
		],
		async apply(options: BuilderApplyOptions) {
			const { input, context, output, reporter } = options;
			if (input.phase !== 'generate') {
				return;
			}

			const { ir } = requireIr(input, [
				'blocks',
				'layout',
				'php',
				'meta',
			]);
			const phpPlan = ir.artifacts?.php;
			if (!phpPlan) {
				reporter.debug(
					'createPhpBlocksHelper: missing PHP artifacts plan; skipping.'
				);
				return;
			}

			await generatePhpBlocks({
				ir,
				context,
				output,
				reporter,
				phpPlan,
			});
		},
	});
}

async function generatePhpBlocks(options: {
	readonly ir: IRv1;
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly phpPlan: NonNullable<IRv1['artifacts']['php']>;
}): Promise<void> {
	const { ir, phpPlan, context, output, reporter } = options;
	const blocks = collectPlannedSsrBlocks(ir.blocks, phpPlan);
	if (blocks.length === 0) {
		reporter.debug(
			'createPhpBlocksHelper: no SSR blocks planned; skipping.'
		);
		return;
	}

	const processedMap = await collectBlockManifests({
		workspace: context.workspace,
		blocks,
		roots: resolvePlannedBlockRoots(phpPlan),
	});

	const processedBlocks = blocks
		.map((block) => processedMap.get(block.key))
		.filter((entry): entry is ProcessedBlockManifest => Boolean(entry));

	const { manifestEntries, renderStubs } = collatePhpBlockArtifacts({
		processedBlocks,
		reporter,
		suppressWarnings: true,
	});

	if (Object.keys(manifestEntries).length === 0) {
		reporter.debug('createPhpBlocksHelper: no manifest entries produced.');
		return;
	}

	const blockNamespace = `${ir.php.namespace}\\Blocks`;
	const blockModule = buildBlockModule({
		origin: ir.meta.origin,
		namespace: blockNamespace,
		manifest: {
			fileName: relativeToOutputDir(
				ir.php.outputDir,
				phpPlan.blocksManifestPath
			),
			entries: manifestEntries,
		},
		registrarFileName: relativeToOutputDir(
			ir.php.outputDir,
			phpPlan.blocksRegistrarPath
		),
		renderStubs,
	});

	reportManifestValidationErrors({
		files: blockModule.files,
		reporter,
	});

	const planner = buildProgramTargetPlanner({
		workspace: context.workspace,
		outputDir: ir.php.outputDir,
		channel: getPhpBuilderChannel(context),
		docblockPrefix: DEFAULT_DOC_HEADER,
		strategy: {
			resolveFilePath: ({ workspace, outputDir, file }) =>
				resolveBlockFilePath({
					workspace,
					outputDir,
					file: file as BlockModuleQueuedFile,
				}),
		},
	});

	await stageRenderStubs({
		stubs: blockModule.renderStubs,
		workspace: context.workspace,
		output,
		reporter,
	});

	planner.queueFiles({ files: blockModule.files });

	reporter.debug(
		'createPhpBlocksHelper: queued SSR block manifest and registrar.'
	);
}

function resolveBlockFilePath({
	workspace,
	outputDir,
	file,
}: {
	readonly workspace: PlannerWorkspace;
	readonly outputDir: string;
	readonly file: BlockModuleQueuedFile;
}): string {
	const normalisedSegments = file.fileName
		.replace(/\\/g, '/')
		.split('/')
		.filter(Boolean);

	if (file.metadata.kind === 'block-manifest') {
		const manifestDir = path.dirname(outputDir);
		return workspace.resolve(manifestDir, ...normalisedSegments);
	}

	return workspace.resolve(outputDir, ...normalisedSegments);
}

function reportManifestValidationErrors({
	files,
	reporter,
}: {
	readonly files: ReturnType<typeof buildBlockModule>['files'];
	readonly reporter: BuilderApplyOptions['reporter'];
}): void {
	const manifestFile = files.find(
		(file) => file.metadata.kind === 'block-manifest'
	);
	if (!manifestFile || manifestFile.metadata.kind !== 'block-manifest') {
		return;
	}

	for (const error of manifestFile.metadata.validation?.errors ?? []) {
		reporter.error(error.message, {
			code: error.code,
			block: error.block,
			field: error.field,
			value: error.value,
		});
	}
}

function collectPlannedSsrBlocks(
	blocks: readonly IRBlock[],
	plan: NonNullable<IRv1['artifacts']['php']>
): IRBlock[] {
	const ids = new Set(
		Object.entries(plan.blocks)
			.filter(([, entry]) => entry.mode === 'ssr')
			.map(([id]) => id)
	);
	return blocks.filter((block) => ids.has(block.id));
}

function resolvePlannedBlockRoots(
	plan: NonNullable<IRv1['artifacts']['php']>
): {
	generated: string;
	surfaced: string;
} {
	const generatedRoot = path.posix.dirname(plan.blocksManifestPath);
	return { generated: generatedRoot, surfaced: generatedRoot };
}

function relativeToOutputDir(outputDir: string, target: string): string {
	const relative = path.posix.relative(outputDir, target);
	return relative.startsWith('..') || relative === '' ? target : relative;
}

/**
 * Collates block manifest entries and PHP render stubs from processed blocks.
 *
 * Aggregates block metadata and server-side render callbacks, reporting any
 * warnings encountered during block processing. Used to prepare artifacts for
 * PHP plugin generation.
 *
 * @param    options                  - Processed blocks and reporter for warnings
 * @param    options.processedBlocks  - Array of processed block definitions
 * @param    options.reporter         - Reporter instance for warnings
 * @param    options.suppressWarnings
 * @returns Collated artifacts with manifest entries and render stubs
 * @category AST Builders
 */
export function collatePhpBlockArtifacts({
	processedBlocks,
	reporter,
	suppressWarnings = false,
}: CollatePhpBlockArtifactsOptions): CollatedPhpBlockArtifacts {
	const manifestEntries: Record<string, BlockManifestEntry> = {};
	const renderStubs: NonNullable<ProcessedBlockManifest['renderStub']>[] = [];

	for (const processed of processedBlocks) {
		if (!suppressWarnings) {
			for (const warning of processed.warnings) {
				reporter.warn(warning);
			}
		}

		if (processed.manifestEntry) {
			manifestEntries[processed.block.key] = processed.manifestEntry;
		}

		if (processed.renderStub) {
			renderStubs.push(processed.renderStub);
		}
	}

	return { manifestEntries, renderStubs };
}
/**
 * Transaction label for block render callback generation phase.
 *
 * @category AST Builders
 */

export const RENDER_TRANSACTION_LABEL = 'builder.generate.php.blocks.render';

/**
 * Writes block render callback PHP files to workspace.
 *
 * Stages PHP render callback stubs for blocks that require server-side rendering.
 * Wraps writes in a transaction for atomic rollback on failure.
 *
 * @param    options           - Stubs, workspace, output, and reporter
 * @param    options.stubs     - Array of block render callback stubs to write
 * @param    options.workspace - Workspace manager for file operations
 * @param    options.output    - Builder output context
 * @param    options.reporter  - Reporter for progress and errors
 * @category AST Builders
 */
export async function stageRenderStubs({
	stubs,
	workspace,
	output,
	reporter,
}: StageRenderStubsOptions): Promise<void> {
	if (stubs.length === 0) {
		return;
	}

	const printer = buildPhpPrettyPrinter({ workspace });
	workspace.begin(RENDER_TRANSACTION_LABEL);
	try {
		for (const stub of stubs) {
			const { code } = await printer.prettyPrint({
				filePath: stub.absolutePath,
				program: stub.program,
			});
			await workspace.write(stub.relativePath, code, {
				ensureDir: true,
			});
		}
		const manifest = await workspace.commit(RENDER_TRANSACTION_LABEL);
		await queueWorkspaceFiles(workspace, output, manifest.writes);
		reporter.debug(
			'createPhpBlocksHelper: staged SSR block render stubs.',
			{
				files: manifest.writes,
			}
		);
	} catch (error) {
		await workspace.rollback(RENDER_TRANSACTION_LABEL);
		throw error;
	}
}

async function queueWorkspaceFiles(
	workspace: Workspace,
	output: BuilderOutput,
	files: readonly string[]
): Promise<void> {
	for (const file of files) {
		const data = await workspace.read(file);
		if (!data) {
			continue;
		}

		output.queueWrite({
			file,
			contents: data.toString('utf8'),
		});
	}
}
