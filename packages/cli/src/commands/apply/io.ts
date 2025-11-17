import { WPKernelError } from '@wpkernel/core/contracts';
import type { BuilderOutput } from '../../runtime/types';
import type { Workspace } from '../../workspace';
import { resolvePatchPaths } from '../../builders/patcher.paths';
import { loadLayoutFromWorkspace } from '../../layout/manifest';
import type { PatchManifest, PatchStatus } from './types';

export function buildBuilderOutput(): BuilderOutput {
	const actions: BuilderOutput['actions'] = [];
	return {
		actions,
		queueWrite(action) {
			actions.push(action);
		},
	};
}

export async function readManifest(
	workspace: Workspace
): Promise<PatchManifest | null> {
	const manifestPath = await resolvePatchManifestPath(workspace);
	const raw = await workspace.readText(manifestPath);
	if (!raw) {
		return null;
	}

	try {
		const data = JSON.parse(raw) as PatchManifest;
		if (!data.summary || !Array.isArray(data.records)) {
			throw new Error('Missing summary or records.');
		}

		return {
			summary: {
				applied: Number(data.summary.applied) || 0,
				conflicts: Number(data.summary.conflicts) || 0,
				skipped: Number(data.summary.skipped) || 0,
			},
			records: data.records.map((record) => ({
				file: String(record.file ?? ''),
				status: (record.status ?? 'skipped') as PatchStatus,
				description:
					typeof record.description === 'string'
						? record.description
						: undefined,
				details:
					typeof record.details === 'object' && record.details
						? record.details
						: undefined,
			})),
			actions: Array.isArray((data as { actions?: unknown }).actions)
				? ((data as { actions?: unknown }).actions as unknown[])
						.map((value) => String(value ?? ''))
						.filter((value) => value.length > 0)
				: [],
		} satisfies PatchManifest;
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message: 'Failed to parse apply manifest.',
			context: {
				file: manifestPath,
				error: (error as Error).message,
			},
		});
	}
}

async function resolvePatchManifestPath(workspace: Workspace): Promise<string> {
	const layout = await loadLayoutFromWorkspace({
		workspace,
		strict: false,
	});
	const paths = resolvePatchPaths({ layout: layout ?? undefined });
	return paths.manifestPath;
}

export function formatManifest(manifest: PatchManifest): string {
	const lines = [
		'Apply summary:',
		`  Applied: ${manifest.summary.applied}`,
		`  Conflicts: ${manifest.summary.conflicts}`,
		`  Skipped: ${manifest.summary.skipped}`,
	];

	if (manifest.records.length > 0) {
		lines.push('', 'Records:');
		for (const record of manifest.records) {
			const description = record.description
				? ` - ${record.description}`
				: '';
			const reason =
				record.details &&
				typeof (record.details as { reason?: unknown }).reason ===
					'string'
					? ` (reason: ${
							(record.details as { reason: string }).reason
						})`
					: '';
			lines.push(
				`- [${record.status}] ${record.file}${description}${reason}`
			);
		}
	} else {
		lines.push('', 'No files were patched.');
	}

	return `${lines.join('\n')}\n`;
}
