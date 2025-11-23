import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';
import { createHelper } from '../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../runtime/types';
import {
	resolveBundledPhpDriverPrettyPrintPath,
	resolveBundledComposerAutoloadPath,
} from '../utils/phpAssets';
import {
	buildGenerationManifestFromIr,
	diffGenerationState,
	readGenerationState,
	type GenerationManifest,
} from '../apply/manifest';
import {
	type PlanDeletionSkip,
	type PlanFile,
	type PlanInstruction,
} from './types';
import { addPluginLoaderInstruction } from './plan.plugin-loader';
import { collectResourceInstructions } from './plan.shims';
import { addBundlerInstructions } from './plan.bundler';
import {
	collectBlockSurfaceInstructions,
	collectBlockDeletionInstructions,
} from './plan.blocks';
import {
	collectUiSurfaceInstructions,
	collectUiDeletionInstructions,
} from './plan.ui';
import { collectDeletionInstructions } from './plan.cleanups';
import { resolvePlanPaths } from './plan.paths';

const PLAN_PRETTY_PRINT_SCRIPT_PATH = resolveBundledPhpDriverPrettyPrintPath();
const PLAN_PRETTY_PRINT_AUTOLOAD_PATH = resolveBundledComposerAutoloadPath();

/**
 * Creates a builder helper for generating a plan during `generate`.
 *
 * This helper is side-effect free beyond writing the plan manifest. It does
 * not invoke the patcher or mutate userland files.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating the plan manifest.
 */
export function createPlanBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.plan',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = options;
			if (input.phase !== 'generate') {
				await next?.();
				return;
			}

			const prettyPrinter = buildPhpPrettyPrinter({
				workspace: options.context.workspace,
				scriptPath: PLAN_PRETTY_PRINT_SCRIPT_PATH ?? undefined,
				autoloadPaths: [PLAN_PRETTY_PRINT_AUTOLOAD_PATH].filter(
					(entry): entry is string => typeof entry === 'string'
				),
			});

			const plan = await collectPlanInstructions({
				options,
				prettyPrinter,
			});

			await writePlan(options, plan);
			if (
				plan.instructions.length === 0 &&
				plan.skippedDeletions.length === 0
			) {
				reporter.info(
					'createPlanBuilder: no plan instructions emitted.'
				);
			} else {
				reporter.info('createPlanBuilder: emitted plan instructions.', {
					files: plan.instructions.map(
						(instruction) => instruction.file
					),
				});
			}

			if (plan.skippedDeletions.length > 0) {
				reporter.info(
					'createPlanBuilder: guarded deletions due to local changes.',
					{
						files: plan.skippedDeletions.map((entry) => entry.file),
					}
				);
			}

			await next?.();
		},
	});
}

/**
 * Creates a builder helper for generating an apply plan.
 *
 * This helper analyzes the differences between the current generation state
 * and the desired state (based on the IR) and creates a plan of actions
 * (writes, deletions) to bring the workspace up to date. This plan is then
 * used by the `createPatcher` helper.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating the apply plan.
 */
export function createApplyPlanBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.apply.plan',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = options;
			if (input.phase !== 'generate') {
				await next?.();
				return;
			}

			const prettyPrinter = buildPhpPrettyPrinter({
				workspace: options.context.workspace,
				scriptPath: PLAN_PRETTY_PRINT_SCRIPT_PATH ?? undefined,
				autoloadPaths: [PLAN_PRETTY_PRINT_AUTOLOAD_PATH].filter(
					(entry): entry is string => typeof entry === 'string'
				),
			});

			const plan = await collectPlanInstructions({
				options,
				prettyPrinter,
			});

			await writePlan(options, plan);
			if (
				plan.instructions.length === 0 &&
				plan.skippedDeletions.length === 0
			) {
				reporter.info(
					'createApplyPlanBuilder: no apply plan instructions emitted.'
				);
			} else {
				reporter.info(
					'createApplyPlanBuilder: emitted apply plan instructions.',
					{
						files: plan.instructions.map(
							(instruction) => instruction.file
						),
					}
				);
			}

			if (plan.skippedDeletions.length > 0) {
				reporter.info(
					'createApplyPlanBuilder: guarded shim deletions due to local changes.',
					{
						files: plan.skippedDeletions.map((entry) => entry.file),
					}
				);
			}

			await next?.();
		},
	});
}

async function collectPlanInstructions({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<PlanFile> {
	const { instructions, paths, nextManifest, manifestForSurface } =
		await initialisePlanState({ options, prettyPrinter });

	const { instructions: blockInstructions, skipped: blockSkipped } =
		await buildBlockPlan(options);
	instructions.push(...blockInstructions);

	const { instructions: uiInstructions, skipped: uiSkipped } =
		await buildUiPlan(options, manifestForSurface);
	instructions.push(...uiInstructions);

	const { instructions: cleanupInstructions, skipped: cleanupSkipped } =
		await buildCleanupPlan(options, paths, nextManifest);
	instructions.push(...cleanupInstructions);

	const skippedDeletions = [...blockSkipped, ...uiSkipped, ...cleanupSkipped];

	return {
		instructions,
		skippedDeletions,
	} satisfies PlanFile;
}

async function initialisePlanState({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<{
	instructions: PlanInstruction[];
	paths: ReturnType<typeof resolvePlanPaths>;
	nextManifest: ReturnType<typeof buildGenerationManifestFromIr>;
	manifestForSurface: GenerationManifest;
}> {
	const { input } = options;
	const instructions: PlanInstruction[] = [];
	const paths = resolvePlanPaths(options);

	const persistedManifest =
		options.context.generationState ??
		(await readGenerationState(options.context.workspace));
	const nextManifest = buildGenerationManifestFromIr(input.ir ?? null);
	const manifestForSurface =
		(nextManifest.ui?.files?.length ?? 0) > 0
			? nextManifest
			: persistedManifest;

	await addPluginLoaderInstruction({ options, prettyPrinter, instructions });
	await addBundlerInstructions({ options, instructions });
	await appendResourceInstructions({ options, prettyPrinter, instructions });

	return { instructions, paths, nextManifest, manifestForSurface };
}

async function appendResourceInstructions({
	options,
	prettyPrinter,
	instructions,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
	readonly instructions: PlanInstruction[];
}): Promise<void> {
	const { input, reporter } = options;
	const resources = input.ir?.resources ?? [];

	if (resources.length === 0) {
		reporter.debug(
			'createApplyPlanBuilder: no resources to generate shims for.'
		);
		return;
	}

	const resourceInstructions = await collectResourceInstructions({
		options,
		prettyPrinter,
	});
	instructions.push(...resourceInstructions);
}

async function writePlan(
	options: BuilderApplyOptions,
	plan: PlanFile
): Promise<void> {
	const { planManifest } = resolvePlanPaths(options);
	const planContent = `${JSON.stringify(plan, null, 2)}\n`;
	await options.context.workspace.write(planManifest, planContent, {
		ensureDir: true,
	});
	options.output.queueWrite({ file: planManifest, contents: planContent });
}

async function buildBlockPlan(options: BuilderApplyOptions): Promise<{
	instructions: PlanInstruction[];
	skipped: PlanDeletionSkip[];
}> {
	const surface = await collectBlockSurfaceInstructions({ options });
	const deletion = await collectBlockDeletionInstructions({
		options,
		generatedSuffixes: surface.generatedSuffixes,
	});

	return {
		instructions: [...surface.instructions, ...deletion.instructions],
		skipped: [...deletion.skippedDeletions],
	};
}

async function buildUiPlan(
	options: BuilderApplyOptions,
	manifest: GenerationManifest
): Promise<{
	instructions: PlanInstruction[];
	skipped: PlanDeletionSkip[];
	manifest: GenerationManifest;
}> {
	const surface = await collectUiSurfaceInstructions({
		options,
		manifest,
	});
	const deletion = await collectUiDeletionInstructions({
		options,
		generatedSuffixes: surface.generatedSuffixes,
	});

	return {
		instructions: [...surface.instructions, ...deletion.instructions],
		skipped: [...deletion.skippedDeletions],
		manifest,
	};
}

async function buildCleanupPlan(
	options: BuilderApplyOptions,
	paths: ReturnType<typeof resolvePlanPaths>,
	nextManifest: ReturnType<typeof buildGenerationManifestFromIr>
): Promise<{
	instructions: PlanInstruction[];
	skipped: PlanDeletionSkip[];
}> {
	const diff = diffGenerationState(
		options.context.generationState,
		nextManifest
	);

	const { instructions, skippedDeletions } =
		await collectDeletionInstructions({
			diff,
			workspace: options.context.workspace,
			reporter: options.reporter,
			planBasePath: paths.planBase,
		});

	return { instructions, skipped: skippedDeletions };
}
