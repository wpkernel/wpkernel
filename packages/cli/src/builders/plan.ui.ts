import path from 'path';
import type { GenerationManifest } from '../apply/manifest';
import { type BuilderApplyOptions } from '../runtime/types';
import { toWorkspaceRelative } from '../workspace';
import { type PlanInstruction, type PlanDeletionSkip } from './types';
import { resolvePlanPaths } from './plan.paths';
import { statIfFile } from './plan.blocks';

export async function collectUiSurfaceInstructions({
	options,
	manifest,
}: {
	readonly options: BuilderApplyOptions;
	readonly manifest: GenerationManifest;
}): Promise<{
	instructions: PlanInstruction[];
	generatedSuffixes: Set<string>;
}> {
	if (!options.input.ir?.artifacts.runtime) {
		options.reporter.debug(
			'collectUiSurfaceInstructions: missing runtime artifacts; skipping UI surfacing.'
		);
		return { instructions: [], generatedSuffixes: new Set<string>() };
	}
	const instructions: PlanInstruction[] = [];
	const generatedSuffixes = new Set<string>();
	const { context, output, reporter } = options;
	const paths = resolvePlanPaths(options);
	const files = manifest.runtime?.files ?? [];

	for (const filePair of files) {
		const result = await buildUiInstruction({
			context,
			output,
			paths,
			filePair,
		});
		if (!result) {
			reporter.debug(
				'createApplyPlanBuilder: skipped UI asset due to empty contents.',
				{ file: filePair.generated }
			);
			continue;
		}
		const { instruction, suffix } = result;
		if (suffix) {
			generatedSuffixes.add(suffix);
		}
		instructions.push(instruction);
	}

	if (instructions.length > 0) {
		reporter.debug(
			'createApplyPlanBuilder: queued UI asset surfacing instructions.',
			{
				files: instructions.map((instruction) => instruction.file),
			}
		);
	}

	return { instructions, generatedSuffixes };
}

async function buildUiInstruction({
	context,
	output,
	paths,
	filePair,
}: {
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderApplyOptions['output'];
	readonly paths: ReturnType<typeof resolvePlanPaths>;
	readonly filePair: NonNullable<
		GenerationManifest['runtime']
	>['files'][number];
}): Promise<{ instruction: PlanInstruction; suffix: string | null } | null> {
	const sourceContents =
		(await context.workspace.readText(filePair.generated)) ?? '';

	if (sourceContents.length === 0) {
		context.reporter?.debug(
			'createApplyPlanBuilder: generated UI asset is empty.',
			{ file: filePair.generated }
		);
		return null;
	}

	const incomingPath = path.posix.join(paths.planIncoming, filePair.applied);
	const basePath = path.posix.join(paths.planBase, filePair.applied);

	await context.workspace.write(incomingPath, sourceContents, {
		ensureDir: true,
	});
	output.queueWrite({ file: incomingPath, contents: sourceContents });

	const existingBase = await context.workspace.read(basePath);
	if (existingBase === null) {
		const targetSnapshot = await context.workspace.read(filePair.applied);
		const baseSnapshot = targetSnapshot ?? sourceContents;
		await context.workspace.write(basePath, baseSnapshot, {
			ensureDir: true,
		});
		output.queueWrite({ file: basePath, contents: baseSnapshot });
	}

	const suffix = path.posix.relative(paths.runtimeApplied, filePair.applied);
	const safeSuffix =
		!suffix.startsWith('..') && suffix.length > 0 ? suffix : null;

	return {
		instruction: {
			action: 'write',
			file: filePair.applied,
			base: basePath,
			incoming: incomingPath,
			description: `Update UI asset ${safeSuffix ?? filePair.applied}`,
		},
		suffix: safeSuffix,
	};
}

export async function collectUiDeletionInstructions({
	options,
	generatedSuffixes,
}: {
	readonly options: BuilderApplyOptions;
	readonly generatedSuffixes: ReadonlySet<string>;
}): Promise<{
	instructions: PlanInstruction[];
	skippedDeletions: PlanDeletionSkip[];
}> {
	if (!options.input.ir?.artifacts.runtime) {
		options.reporter.debug(
			'collectUiDeletionInstructions: missing runtime artifacts; skipping UI deletions.'
		);
		return { instructions: [], skippedDeletions: [] };
	}
	const { context, reporter } = options;
	const paths = resolvePlanPaths(options);
	const targets = await context.workspace.glob([
		path.posix.join(paths.runtimeApplied, '*'),
		path.posix.join(paths.runtimeApplied, '**/*'),
	]);

	const accumulator = {
		instructions: [] as PlanInstruction[],
		skippedDeletions: [] as PlanDeletionSkip[],
	};

	for (const target of targets) {
		await evaluateDeletionCandidate({
			target,
			generatedSuffixes,
			paths,
			context,
			reporter,
			accumulator,
		});
	}

	return accumulator;
}

interface DeletionEvaluationOptions {
	readonly target: string;
	readonly generatedSuffixes: ReadonlySet<string>;
	readonly paths: ReturnType<typeof resolvePlanPaths>;
	readonly context: BuilderApplyOptions['context'];
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly accumulator: {
		instructions: PlanInstruction[];
		skippedDeletions: PlanDeletionSkip[];
	};
}

async function evaluateDeletionCandidate(
	options: DeletionEvaluationOptions
): Promise<void> {
	const stats = await statIfFile(options.target);
	if (!stats) {
		return;
	}

	const workspaceRelative = toWorkspaceRelative(
		options.context.workspace,
		options.target
	);
	const suffix = path.posix.relative(
		options.paths.runtimeApplied,
		workspaceRelative
	);
	if (suffix.startsWith('..') || suffix.length === 0) {
		return;
	}

	if (options.generatedSuffixes.has(suffix)) {
		return;
	}

	const currentContents =
		await options.context.workspace.readText(workspaceRelative);
	if (currentContents === null) {
		return;
	}

	const basePath = path.posix.join(options.paths.planBase, workspaceRelative);
	const baseContents = await options.context.workspace.readText(basePath);
	if (baseContents === null) {
		options.accumulator.skippedDeletions.push({
			file: workspaceRelative,
			description: `Remove UI asset ${suffix}`,
			reason: 'missing-base',
		});
		options.reporter.debug(
			'createApplyPlanBuilder: skipping UI deletion due to missing base snapshot.',
			{ file: workspaceRelative }
		);
		return;
	}

	if (baseContents !== currentContents) {
		options.accumulator.skippedDeletions.push({
			file: workspaceRelative,
			description: `Remove UI asset ${suffix}`,
			reason: 'modified-target',
		});
		options.reporter.debug(
			'createApplyPlanBuilder: skipping UI deletion for modified target.',
			{ file: workspaceRelative }
		);
		return;
	}

	options.accumulator.instructions.push({
		action: 'delete',
		file: workspaceRelative,
		description: `Remove UI asset ${suffix}`,
	});
}
