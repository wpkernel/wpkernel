import path from 'path';
import fs from 'node:fs/promises';
import { type BuilderApplyOptions } from '../runtime/types';
import { toWorkspaceRelative } from '../workspace';
import { type PlanInstruction, type PlanDeletionSkip } from './types';
import { resolvePlanPaths } from './plan.paths';

export async function collectBlockSurfaceInstructions({
	options,
}: {
	readonly options: BuilderApplyOptions;
}): Promise<{
	instructions: PlanInstruction[];
	generatedSuffixes: Set<string>;
}> {
	const instructions: PlanInstruction[] = [];
	const generatedSuffixes = new Set<string>();
	const { context, output, reporter } = options;
	const paths = resolvePlanPaths(options);
	const candidates = await context.workspace.glob([
		path.posix.join(paths.blocksGenerated, '*'),
		path.posix.join(paths.blocksGenerated, '**/*'),
	]);
	if (candidates.length === 0) {
		return { instructions, generatedSuffixes };
	}

	for (const absolute of candidates) {
		const stats = await statIfFile(absolute);
		if (!stats) {
			continue;
		}

		const workspaceRelative = toWorkspaceRelative(
			context.workspace,
			absolute
		);
		const suffix = path.posix.relative(
			paths.blocksGenerated,
			workspaceRelative
		);
		if (suffix.startsWith('..') || suffix.length === 0) {
			continue;
		}

		const sourceContents = await context.workspace.read(workspaceRelative);
		if (!sourceContents) {
			continue;
		}

		const targetFile = path.posix.join(paths.blocksApplied, suffix);
		const incomingPath = path.posix.join(paths.planIncoming, targetFile);
		const basePath = path.posix.join(paths.planBase, targetFile);

		await context.workspace.write(incomingPath, sourceContents, {
			ensureDir: true,
		});
		output.queueWrite({ file: incomingPath, contents: sourceContents });

		const existingBase = await context.workspace.read(basePath);
		if (existingBase === null) {
			const targetSnapshot = await context.workspace.read(targetFile);
			const baseSnapshot = targetSnapshot ?? sourceContents;
			await context.workspace.write(basePath, baseSnapshot, {
				ensureDir: true,
			});
			output.queueWrite({ file: basePath, contents: baseSnapshot });
		}

		generatedSuffixes.add(suffix);

		instructions.push({
			action: 'write',
			file: targetFile,
			base: basePath,
			incoming: incomingPath,
			description: `Update block asset ${suffix}`,
		});
	}

	if (instructions.length > 0) {
		reporter.debug(
			'createApplyPlanBuilder: queued block asset surfacing instructions.',
			{
				files: instructions.map((instruction) => instruction.file),
			}
		);
	}

	return { instructions, generatedSuffixes };
}

export async function collectBlockDeletionInstructions({
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
		path.posix.join(paths.blocksApplied, '*'),
		path.posix.join(paths.blocksApplied, '**/*'),
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
		const suffix = path.posix.relative(
			paths.blocksApplied,
			workspaceRelative
		);
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
				description: `Remove block asset ${suffix}`,
				reason: 'missing-base',
			});
			reporter.debug(
				'createApplyPlanBuilder: skipping block deletion due to missing base snapshot.',
				{ file: workspaceRelative }
			);
			continue;
		}

		if (baseContents !== currentContents) {
			skippedDeletions.push({
				file: workspaceRelative,
				description: `Remove block asset ${suffix}`,
				reason: 'modified-target',
			});
			reporter.debug(
				'createApplyPlanBuilder: skipping block deletion for modified target.',
				{ file: workspaceRelative }
			);
			continue;
		}

		instructions.push({
			action: 'delete',
			file: workspaceRelative,
			description: `Remove block asset ${suffix}`,
		});
	}

	return { instructions, skippedDeletions };
}

export async function statIfFile(
	absolute: string
): Promise<{ isFile: boolean } | null> {
	try {
		const stats = await fs.lstat(absolute);
		return stats.isFile() ? { isFile: true } : null;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}
