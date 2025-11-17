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
} from '../apply/manifest';
import { type PlanFile, type PlanInstruction } from './types';
import { addPluginLoaderInstruction } from './plan.plugin-loader';
import { collectResourceInstructions } from './plan.shims';
import {
	collectBlockSurfaceInstructions,
	collectBlockDeletionInstructions,
} from './plan.blocks';
import { collectDeletionInstructions } from './plan.cleanups';
import { resolvePlanPaths } from './plan.paths';

const PLAN_PRETTY_PRINT_SCRIPT_PATH = resolveBundledPhpDriverPrettyPrintPath();
const PLAN_PRETTY_PRINT_AUTOLOAD_PATH = resolveBundledComposerAutoloadPath();

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
	const { input, reporter } = options;
	const instructions: PlanInstruction[] = [];
	const paths = resolvePlanPaths(options);

	await addPluginLoaderInstruction({ options, prettyPrinter, instructions });

	if ((input.ir?.resources?.length ?? 0) === 0) {
		reporter.debug(
			'createApplyPlanBuilder: no resources to generate shims for.'
		);
	}

	const resourceInstructions = await collectResourceInstructions({
		options,
		prettyPrinter,
	});
	instructions.push(...resourceInstructions);

	const blockSurfaceResult = await collectBlockSurfaceInstructions({
		options,
	});
	instructions.push(...blockSurfaceResult.instructions);

	const blockDeletionResult = await collectBlockDeletionInstructions({
		options,
		generatedSuffixes: blockSurfaceResult.generatedSuffixes,
	});
	instructions.push(...blockDeletionResult.instructions);

	const nextManifest = buildGenerationManifestFromIr(input.ir ?? null);
	const diff = diffGenerationState(
		options.context.generationState,
		nextManifest
	);

	const { instructions: deletionInstructions, skippedDeletions } =
		await collectDeletionInstructions({
			diff,
			workspace: options.context.workspace,
			reporter,
			planBasePath: paths.planBase,
		});
	instructions.push(...deletionInstructions);

	const allSkipped = [
		...blockDeletionResult.skippedDeletions,
		...skippedDeletions,
	];

	return { instructions, skippedDeletions: allSkipped } satisfies PlanFile;
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
