import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderOutput,
} from '../runtime/types';
import type { Workspace } from '../workspace/types';
import {
	type PatchPlan,
	type PatchInstruction,
	type PatchManifest,
	type PatchDeletionResult,
	type PatchPlanDeletionSkip,
} from './types';
import { resolvePatchPaths, normalisePath } from './patcher.paths';

import {
	hasPlanInstructions,
	applyPlanInstructions,
	recordPlannedDeletions,
	reportDeletionSummary,
} from './patcher.instructions';

async function readPlan(
	workspace: Workspace,
	planPath: string
): Promise<PatchPlan | null> {
	const contents = await workspace.readText(planPath);
	if (!contents) {
		return null;
	}

	try {
		const data = JSON.parse(contents) as PatchPlan;
		const instructions = Array.isArray(data.instructions)
			? data.instructions
			: [];

		const normalised = instructions
			.map((entry) => normaliseInstruction(entry))
			.filter((entry): entry is PatchInstruction => entry !== null);

		return {
			instructions: normalised,
			skippedDeletions: normaliseSkippedDeletions(
				(data as { skippedDeletions?: unknown }).skippedDeletions
			),
		} satisfies PatchPlan;
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to parse patch plan JSON.',
			context: {
				file: planPath,
				error: (error as Error).message,
			},
		});
	}
}

function normaliseInstruction(value: unknown): PatchInstruction | null {
	if (!isRecord(value) || typeof value.file !== 'string') {
		return null;
	}

	const action = value.action === 'delete' ? 'delete' : 'write';
	const file = value.file;
	const description =
		typeof value.description === 'string' ? value.description : undefined;

	if (action === 'delete') {
		return { action, file, description };
	}

	if (typeof value.base !== 'string' || typeof value.incoming !== 'string') {
		return null;
	}

	return {
		action,
		file,
		base: value.base,
		incoming: value.incoming,
		description,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normaliseSkippedDeletions(
	value: unknown
): readonly PatchPlanDeletionSkip[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const entries: PatchPlanDeletionSkip[] = [];
	for (const entry of value) {
		if (!isRecord(entry)) {
			continue;
		}

		const file = typeof entry.file === 'string' ? entry.file : '';
		if (!file) {
			continue;
		}

		const description =
			typeof entry.description === 'string'
				? entry.description
				: undefined;
		const reason =
			typeof entry.reason === 'string' ? entry.reason : undefined;

		entries.push({
			file: normalisePath(file),
			description,
			reason,
		});
	}

	return entries;
}

export async function queueWorkspaceFile(
	workspace: Workspace,
	output: BuilderOutput,
	file: string
): Promise<void> {
	const contents = await workspace.read(file);
	if (!contents) {
		/* istanbul ignore next - queue helper defends against deleted targets */
		return;
	}

	output.queueWrite({
		file,
		contents,
	});
}

function buildEmptyManifest(): PatchManifest {
	return {
		summary: {
			applied: 0,
			conflicts: 0,
			skipped: 0,
		},
		records: [],
		actions: [],
	} satisfies PatchManifest;
}

/**
 * Creates a builder helper for applying patches to the workspace.
 *
 * This helper reads a patch plan, applies file modifications (writes, merges, deletions)
 * based on the plan, and records the outcome in a patch manifest.
 * It uses `git merge-file` for intelligent three-way merges to handle conflicts.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for applying patches.
 */
export function createPatcher(): BuilderHelper {
	return createHelper({
		key: 'builder.apply.patch.core',
		kind: 'builder',
		dependsOn: ['builder.generate.apply.plan'],
		async apply({ context, input, output, reporter }: BuilderApplyOptions) {
			const supportedPhase =
				input.phase === 'generate' || input.phase === 'apply';
			if (!supportedPhase) {
				reporter.debug('createPatcher: skipping phase.', {
					phase: input.phase,
				});
				return;
			}

			const paths = resolvePatchPaths({ layout: input.ir?.layout });
			const plan = await readPlan(context.workspace, paths.planPath);

			if (!hasPlanInstructions(plan)) {
				reporter.debug('createPatcher: no patch instructions found.');
				return;
			}

			const manifest = buildEmptyManifest();
			const deletedFiles: string[] = [];
			const skippedDeletions: PatchDeletionResult[] = [];

			recordPlannedDeletions({ manifest, plan, reporter });

			await applyPlanInstructions({
				plan,
				workspace: context.workspace,
				manifest,
				output,
				reporter,
				deletedFiles,
				skippedDeletions,
				baseRoot: paths.baseRoot,
			});

			const actionFiles = [
				...output.actions.map((action) => action.file),
				...deletedFiles,
				paths.manifestPath,
			];
			manifest.actions = Array.from(new Set(actionFiles));

			await context.workspace.writeJson(paths.manifestPath, manifest, {
				pretty: true,
			});
			await queueWorkspaceFile(
				context.workspace,
				output,
				paths.manifestPath
			);

			reportDeletionSummary({
				plan,
				reporter,
				deletedFiles,
				skippedDeletions,
			});

			reporter.info('createPatcher: completed patch application.', {
				summary: manifest.summary,
			});
		},
	});
}
