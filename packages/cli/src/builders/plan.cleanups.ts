// placeholder

import path from 'path';
import type { GenerationManifestDiff } from '../apply/manifest';
import type { BuilderApplyOptions } from '../runtime/types';
import type { PlanInstruction, PlanDeletionSkip } from './types';

export async function collectDeletionInstructions({
	diff,
	workspace,
	reporter,
	planBasePath,
}: {
	readonly diff: GenerationManifestDiff;
	readonly workspace: BuilderApplyOptions['context']['workspace'];
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly planBasePath: string;
}): Promise<{
	instructions: PlanInstruction[];
	skippedDeletions: PlanDeletionSkip[];
}> {
	const instructions: PlanInstruction[] = [];
	const skippedDeletions: PlanDeletionSkip[] = [];

	for (const removed of diff.removed) {
		const uniqueShims = new Set(
			removed.shims.filter((shim): shim is string => Boolean(shim))
		);

		for (const shim of uniqueShims) {
			const basePath = path.posix.join(planBasePath, shim);
			const [baseContents, currentContents] = await Promise.all([
				workspace.readText(basePath),
				workspace.readText(shim),
			]);

			if (!baseContents) {
				skippedDeletions.push({
					file: shim,
					description: `Remove ${removed.resource} controller shim`,
					reason: 'missing-base',
				});
				reporter.debug(
					'createApplyPlanBuilder: skipping deletion without base snapshot.',
					{
						file: shim,
						basePath,
					}
				);
				continue;
			}

			if (currentContents === null) {
				skippedDeletions.push({
					file: shim,
					description: `Remove ${removed.resource} controller shim`,
					reason: 'missing-target',
				});
				reporter.debug(
					'createApplyPlanBuilder: skipping deletion for missing target.',
					{
						file: shim,
					}
				);
				continue;
			}

			if (currentContents !== baseContents) {
				skippedDeletions.push({
					file: shim,
					description: `Remove ${removed.resource} controller shim`,
					reason: 'modified-target',
				});
				reporter.debug(
					'createApplyPlanBuilder: skipping deletion for modified target.',
					{
						file: shim,
					}
				);
				continue;
			}

			instructions.push({
				action: 'delete',
				file: shim,
				description: `Remove ${removed.resource} controller shim`,
			});
		}
	}

	return { instructions, skippedDeletions };
}
