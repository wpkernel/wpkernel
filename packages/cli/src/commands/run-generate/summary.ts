import type { FileWriterSummary } from '../../utils/file-writer';

type ArtifactHint = {
	label: string;
	directory: string;
	description: string;
};

function applyArtifactHints(paths?: {
	php: string;
	entry: string;
	runtime: string;
	blocks?: string;
}): readonly ArtifactHint[] {
	return [
		{
			label: 'php',
			directory: paths?.php ?? 'generate/php',
			description: 'REST controllers',
		},
		{
			label: 'entry',
			directory: paths?.entry ?? 'generate/src/entry',
			description: 'admin entry point',
		},
		{
			label: 'runtime',
			directory: paths?.runtime ?? 'generate/src/runtime',
			description: 'admin runtime/capabilities',
		},
		...(paths?.blocks
			? [
					{
						label: 'blocks',
						directory: paths.blocks,
						description: 'block auto-register',
					},
				]
			: []),
	] as const;
}

function formatCountsLine(summary: FileWriterSummary, dryRun: boolean) {
	return (
		`  mode: ${dryRun ? 'dry-run' : 'write'} | written=${summary.counts.written}` +
		` unchanged=${summary.counts.unchanged}` +
		` skipped=${summary.counts.skipped}`
	);
}

function getTouchedArtifacts(
	artifactHints: readonly ArtifactHint[],
	summary: FileWriterSummary
) {
	return artifactHints.filter(({ directory }) =>
		summary.entries.some(
			(entry) =>
				entry.path === directory ||
				entry.path.startsWith(`${directory}/`)
		)
	);
}

function formatArtifactsLine(
	artifactHints: readonly ArtifactHint[],
	summary: FileWriterSummary
) {
	const touched = getTouchedArtifacts(artifactHints, summary);
	if (touched.length === 0) {
		return [];
	}

	const parts = ['  artifacts:'];
	for (const artifact of touched) {
		parts.push(
			`    - ${artifact.label}: ${artifact.directory} (${artifact.description})`
		);
	}
	return parts;
}

function formatFiles(summary: FileWriterSummary, verbose: boolean) {
	if (!verbose || summary.entries.length === 0) {
		return [];
	}

	const parts = ['  files:'];
	for (const entry of summary.entries) {
		parts.push(`    - ${entry.status.padEnd(9)} ${entry.path}`);
	}
	return parts;
}

export function renderSummary(
	summary: FileWriterSummary,
	dryRun: boolean,
	verbose: boolean,
	paths?: {
		php: string;
		entry: string;
		runtime: string;
		blocks?: string;
	}
): string {
	const parts: string[] = [
		'\n[wpk] generate summary',
		formatCountsLine(summary, dryRun),
		...formatArtifactsLine(applyArtifactHints(paths), summary),
		...formatFiles(summary, verbose),
		'\n',
	];

	return parts.join('\n');
}
