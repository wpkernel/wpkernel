import path from 'path';
import fs from 'node:fs/promises';
import { type BuilderApplyOptions } from '../runtime/types';
import { toWorkspaceRelative } from '../workspace';
import { type PlanInstruction, type PlanDeletionSkip } from './types';

type BlockSurfaceAccumulator = {
	instructions: PlanInstruction[];
	generatedSuffixes: Set<string>;
};

export async function collectBlockSurfaceInstructions({
	options,
}: {
	readonly options: BuilderApplyOptions;
}): Promise<BlockSurfaceAccumulator> {
	const context = resolveBlockContext(options);
	if (!context) {
		return { instructions: [], generatedSuffixes: new Set<string>() };
	}

	return surfaceBlockPlans(context);
}

function resolveBlockContext(options: BuilderApplyOptions): {
	plan: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['artifacts']
	>['plan'];
	blockPlans: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['artifacts']
	>['blocks'][string][];
	context: BuilderApplyOptions['context'];
	output: BuilderApplyOptions['output'];
	reporter: BuilderApplyOptions['reporter'];
} | null {
	const ir = options.input.ir;
	const plan = ir?.artifacts?.plan;
	const blockPlans = Object.values(ir?.artifacts?.blocks ?? {});
	if (!ir || !plan || blockPlans.length === 0) {
		options.reporter.debug(
			'createApplyPlanBuilder: no block artifacts planned; skipping block surfacing.'
		);
		return null;
	}

	return {
		plan,
		blockPlans,
		context: options.context,
		output: options.output,
		reporter: options.reporter,
	};
}

async function surfaceBlockPlans({
	plan,
	blockPlans,
	context,
	output,
	reporter,
}: {
	readonly plan: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['artifacts']
	>['plan'];
	readonly blockPlans: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['artifacts']
	>['blocks'][string][];
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderApplyOptions['output'];
	readonly reporter: BuilderApplyOptions['reporter'];
}): Promise<BlockSurfaceAccumulator> {
	const accumulator: BlockSurfaceAccumulator = {
		instructions: [],
		generatedSuffixes: new Set<string>(),
	};

	for (const blockPlan of blockPlans) {
		await collectBlockSurfaceForPlan({
			blockPlan,
			plan,
			context,
			output,
			accumulator,
		});
	}

	if (accumulator.instructions.length > 0) {
		reporter.debug(
			'createApplyPlanBuilder: queued block asset surfacing instructions.',
			{
				files: accumulator.instructions.map(
					(instruction) => instruction.file
				),
			}
		);
	}

	return accumulator;
}

async function collectBlockSurfaceForPlan({
	blockPlan,
	plan,
	context,
	output,
	accumulator,
}: {
	readonly blockPlan: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['artifacts']
	>['blocks'][string];
	readonly plan: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['artifacts']
	>['plan'];
	readonly context: BuilderApplyOptions['context'];
	readonly output: BuilderApplyOptions['output'];
	readonly accumulator: BlockSurfaceAccumulator;
}): Promise<void> {
	const candidates = await collectCandidateFiles(
		context.workspace,
		blockPlan.generatedDir
	);
	for (const candidate of candidates) {
		const resolved = await resolveSuffix(
			context.workspace,
			blockPlan.generatedDir,
			candidate
		);
		if (!resolved) {
			continue;
		}

		const { workspaceRelative, suffix } = resolved;
		const sourceContents = await context.workspace.read(workspaceRelative);
		if (!sourceContents) {
			continue;
		}

		const targetFile = path.posix.join(blockPlan.appliedDir, suffix);
		const incomingPath = path.posix.join(plan.planIncomingDir, targetFile);
		const basePath = path.posix.join(plan.planBaseDir, targetFile);

		await writeIncomingAndBase({
			workspace: context.workspace,
			output,
			incomingPath,
			basePath,
			targetFile,
			sourceContents,
		});

		accumulator.generatedSuffixes.add(suffix);

		accumulator.instructions.push({
			action: 'write',
			file: targetFile,
			base: basePath,
			incoming: incomingPath,
			description: `Update block asset ${suffix}`,
		});
	}
}

type BlockDeletionAccumulator = {
	instructions: PlanInstruction[];
	skippedDeletions: PlanDeletionSkip[];
};

export async function collectBlockDeletionInstructions({
	options,
	generatedSuffixes,
}: {
	readonly options: BuilderApplyOptions;
	readonly generatedSuffixes: ReadonlySet<string>;
}): Promise<BlockDeletionAccumulator> {
	const ir = options.input.ir;
	const plan = ir?.artifacts?.plan;
	const blockPlans = Object.values(ir?.artifacts?.blocks ?? {});
	if (!ir || !plan || blockPlans.length === 0) {
		options.reporter.debug(
			'createApplyPlanBuilder: no block artifacts planned; skipping block deletions.'
		);
		return { instructions: [], skippedDeletions: [] };
	}

	const accumulator: BlockDeletionAccumulator = {
		instructions: [],
		skippedDeletions: [],
	};

	for (const blockPlan of blockPlans) {
		await collectBlockDeletionsForPlan({
			blockPlan,
			generatedSuffixes,
			plan,
			context: options.context,
			reporter: options.reporter,
			accumulator,
		});
	}

	return accumulator;
}

async function collectBlockDeletionsForPlan({
	blockPlan,
	generatedSuffixes,
	plan,
	context,
	reporter,
	accumulator,
}: {
	readonly blockPlan: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['artifacts']
	>['blocks'][string];
	readonly generatedSuffixes: ReadonlySet<string>;
	readonly plan: NonNullable<
		NonNullable<BuilderApplyOptions['input']['ir']>['artifacts']
	>['plan'];
	readonly context: BuilderApplyOptions['context'];
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly accumulator: BlockDeletionAccumulator;
}): Promise<void> {
	const targets = await collectCandidateFiles(
		context.workspace,
		blockPlan.appliedDir
	);

	for (const target of targets) {
		await evaluateDeletionCandidate({
			target,
			generatedSuffixes,
			planBaseDir: plan.planBaseDir,
			context,
			reporter,
			accumulator,
			root: blockPlan.appliedDir,
		});
	}
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

async function collectCandidateFiles(
	workspace: BuilderApplyOptions['context']['workspace'],
	root: string
): Promise<string[]> {
	return workspace.glob([
		path.posix.join(root, '*'),
		path.posix.join(root, '**/*'),
	]);
}

async function resolveSuffix(
	workspace: BuilderApplyOptions['context']['workspace'],
	root: string,
	target: string
): Promise<{ workspaceRelative: string; suffix: string } | null> {
	const stats = await statIfFile(target);
	if (!stats) {
		return null;
	}

	const workspaceRelative = toWorkspaceRelative(workspace, target);
	const suffix = path.posix.relative(root, workspaceRelative);
	if (suffix.startsWith('..') || suffix.length === 0) {
		return null;
	}

	return { workspaceRelative, suffix };
}

interface DeletionEvaluationOptions {
	readonly target: string;
	readonly generatedSuffixes: ReadonlySet<string>;
	readonly root: string;
	readonly planBaseDir: string;
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
	const suffix = path.posix.relative(options.root, workspaceRelative);
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

	const basePath = path.posix.join(options.planBaseDir, workspaceRelative);
	const baseContents = await options.context.workspace.readText(basePath);
	if (baseContents === null) {
		options.accumulator.skippedDeletions.push({
			file: workspaceRelative,
			description: `Remove block asset ${suffix}`,
			reason: 'missing-base',
		});
		options.reporter.debug(
			'createApplyPlanBuilder: skipping block deletion due to missing base snapshot.',
			{ file: workspaceRelative }
		);
		return;
	}

	if (baseContents !== currentContents) {
		options.accumulator.skippedDeletions.push({
			file: workspaceRelative,
			description: `Remove block asset ${suffix}`,
			reason: 'modified-target',
		});
		options.reporter.debug(
			'createApplyPlanBuilder: skipping block deletion for modified target.',
			{ file: workspaceRelative }
		);
		return;
	}

	options.accumulator.instructions.push({
		action: 'delete',
		file: workspaceRelative,
		description: `Remove block asset ${suffix}`,
	});
}

async function writeIncomingAndBase({
	workspace,
	output,
	incomingPath,
	basePath,
	targetFile,
	sourceContents,
}: {
	workspace: BuilderApplyOptions['context']['workspace'];
	output: BuilderApplyOptions['output'];
	incomingPath: string;
	basePath: string;
	targetFile: string;
	sourceContents: Buffer;
}): Promise<void> {
	await workspace.write(incomingPath, sourceContents, { ensureDir: true });
	output.queueWrite({ file: incomingPath, contents: sourceContents });

	const existingBase = await workspace.read(basePath);
	if (existingBase !== null) {
		return;
	}

	const targetSnapshot = await workspace.read(targetFile);
	const baseSnapshot = targetSnapshot ?? sourceContents;
	await workspace.write(basePath, baseSnapshot, {
		ensureDir: true,
	});
	output.queueWrite({ file: basePath, contents: baseSnapshot });
}
