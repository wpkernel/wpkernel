import { normalisePath } from './patcher.paths';
import type {
	PatchPlan,
	ProcessInstructionOptions,
	ApplyPlanInstructionsOptions,
	RecordPlanDeletionsOptions,
	ReportDeletionSummaryOptions,
} from './types';
import {
	applyWrite,
	applyDeleteInstruction,
	recordPatchResult,
} from './patcher.instructions.write';

export function hasPlanInstructions(plan: PatchPlan | null): plan is PatchPlan {
	return Boolean(
		plan &&
			(plan.instructions.length > 0 || plan.skippedDeletions.length > 0)
	);
}
export function recordPlannedDeletions({
	manifest,
	plan,
	reporter,
}: RecordPlanDeletionsOptions): void {
	if (plan.skippedDeletions.length === 0) {
		return;
	}

	for (const skipped of plan.skippedDeletions) {
		recordPatchResult(manifest, {
			file: normalisePath(skipped.file),
			status: 'skipped',
			description: skipped.description,
			details: {
				action: 'delete',
				reason: skipped.reason ?? 'guarded-by-plan',
			},
		});
	}

	reporter.info(
		'createPatcher: guarded shim deletions were recorded during planning.',
		{
			files: plan.skippedDeletions.map((entry) =>
				normalisePath(entry.file)
			),
		}
	);
}
export async function applyPlanInstructions({
	plan,
	workspace,
	manifest,
	output,
	reporter,
	deletedFiles,
	skippedDeletions,
	baseRoot,
}: ApplyPlanInstructionsOptions): Promise<void> {
	for (const instruction of plan.instructions) {
		await processInstruction({
			workspace,
			instruction,
			manifest,
			output,
			reporter,
			deletedFiles,
			skippedDeletions,
			baseRoot,
		});
	}
}
export function reportDeletionSummary({
	plan,
	reporter,
	deletedFiles,
	skippedDeletions,
}: ReportDeletionSummaryOptions): void {
	if (deletedFiles.length > 0) {
		reporter.info('createPatcher: removed shim files.', {
			files: deletedFiles,
		});
	}

	const applySkipped = skippedDeletions.filter(
		(entry) =>
			!plan.skippedDeletions.some(
				(planned) => normalisePath(planned.file) === entry.file
			)
	);

	if (applySkipped.length > 0) {
		reporter.info(
			'createPatcher: skipped shim removals due to local modifications.',
			{
				files: applySkipped.map((entry) => entry.file),
			}
		);
	}
}
async function processInstruction({
	workspace,
	instruction,
	manifest,
	output,
	reporter,
	deletedFiles,
	skippedDeletions,
	baseRoot,
}: ProcessInstructionOptions): Promise<void> {
	if (instruction.action === 'delete') {
		await applyDeleteInstruction({
			workspace,
			instruction,
			manifest,
			reporter,
			deletedFiles,
			skippedDeletions,
			baseRoot,
		});
		return;
	}

	await applyWrite({
		workspace,
		instruction,
		manifest,
		output,
		reporter,
		baseRoot,
	});
}
