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
	const instructions: PlanInstruction[] = [];
	const generatedSuffixes = new Set<string>();
	const { context, output, reporter } = options;
	const paths = resolvePlanPaths(options);
	const files = manifest.ui?.files ?? [];

	for (const filePair of files) {
		const result = await buildUiInstruction({
			context,
			output,
			paths,
			filePair,
		});
		if (!result) {
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
	readonly filePair: NonNullable<GenerationManifest['ui']>['files'][number];
}): Promise<{ instruction: PlanInstruction; suffix: string | null } | null> {
	const sourceContents = await context.workspace.read(filePair.generated);
	if (!sourceContents) {
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

	const suffix = path.posix.relative(paths.uiApplied, filePair.applied);
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
	const instructions: PlanInstruction[] = [];
	const skippedDeletions: PlanDeletionSkip[] = [];
	const { context, reporter } = options;
	const paths = resolvePlanPaths(options);
	const targets = await context.workspace.glob([
		path.posix.join(paths.uiApplied, '*'),
		path.posix.join(paths.uiApplied, '**/*'),
	]);

	for (const target of targets) {
		const stats = await statIfFile(target);
		if (!stats) {
			continue;
		}

		const workspaceRelative = toWorkspaceRelative(
			context.workspace,
			target
		);
		const suffix = path.posix.relative(paths.uiApplied, workspaceRelative);
		if (suffix.startsWith('..') || suffix.length === 0) {
			continue;
		}

		if (generatedSuffixes.has(suffix)) {
			continue;
		}

		const currentContents =
			await context.workspace.readText(workspaceRelative);
		if (currentContents === null) {
			continue;
		}

		const basePath = path.posix.join(paths.planBase, workspaceRelative);
		const baseContents = await context.workspace.readText(basePath);
		if (baseContents === null) {
			skippedDeletions.push({
				file: workspaceRelative,
				description: `Remove UI asset ${suffix}`,
				reason: 'missing-base',
			});
			reporter.debug(
				'createApplyPlanBuilder: skipping UI deletion due to missing base snapshot.',
				{ file: workspaceRelative }
			);
			continue;
		}

		if (baseContents !== currentContents) {
			skippedDeletions.push({
				file: workspaceRelative,
				description: `Remove UI asset ${suffix}`,
				reason: 'modified-target',
			});
			reporter.debug(
				'createApplyPlanBuilder: skipping UI deletion for modified target.',
				{ file: workspaceRelative }
			);
			continue;
		}

		instructions.push({
			action: 'delete',
			file: workspaceRelative,
			description: `Remove UI asset ${suffix}`,
		});
	}

	return { instructions, skippedDeletions };
}
