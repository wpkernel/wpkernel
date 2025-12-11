import {
	WPK_EXIT_CODES,
	WPKernelError,
	type WPKExitCode,
} from '@wpkernel/core/contracts';
import { buildReporterNamespace } from './constants';
import type {
	ApplyCommandInstance,
	ApplyExecutionOptions,
	ApplyLogEntry,
	CancellationOptions,
	CompletionOptions,
	ConfirmApplyOptions,
	NoManifestOptions,
	PreviewOptions,
	PreviewResult,
	PreviewStageOptions,
} from './types';
import { readGenerationState } from '../../apply/manifest';
import { loadLayoutFromWorkspace } from '../../ir/fragments/ir.layout.core';
import type { IRPlanArtifacts } from '../../ir/publicTypes';

export async function previewPatches({
	dependencies,
	workspace,
	loaded,
}: PreviewOptions): Promise<PreviewResult> {
	const previewReporter = dependencies.buildReporter({
		namespace: `${buildReporterNamespace()}.preview`,
		level: 'info',
		enabled: false,
	});
	const previewBuilder = dependencies.createPatcher();
	const previewOutput = dependencies.buildBuilderOutput();
	const generationState = await readGenerationState(workspace);
	const planArtifacts = await resolvePlanArtifacts(workspace);

	const { result, manifest } = await workspace.dryRun(async () => {
		await previewBuilder.apply(
			{
				context: {
					workspace,
					reporter: previewReporter,
					phase: 'apply' as const,
					generationState,
				},
				input: {
					phase: 'apply' as const,
					options: {
						namespace: loaded.namespace,
						origin: loaded.configOrigin,
						sourcePath: loaded.sourcePath,
					},
					ir: {
						artifacts: {
							plan: planArtifacts,
							pluginLoader: Object.create(null),
							controllers: Object.create(null),
							resources: Object.create(null),
							surfaces: Object.create(null),
							blocks: Object.create(null),
							blockRoots: { applied: '', generated: '' },
							schemas: Object.create(null),
							runtime: Object.create(null),
							php: Object.create(null),
							bundler: Object.create(null),
						},
						meta: {
							version: 1,
							namespace: '',
							sourcePath: '',
							origin: '',
							sanitizedNamespace: '',
							features: [],
							ids: {
								algorithm: 'sha256',
								resourcePrefix: 'res:',
								schemaPrefix: 'sch:',
								blockPrefix: 'blk:',
								capabilityPrefix: 'cap:',
							},
							redactions: [],
							limits: {
								maxConfigKB: 0,
								maxSchemaKB: 0,
								policy: 'error',
							},
							plugin: Object.create(null),
						},
						schemas: [],
						resources: [],
						capabilities: [],
						capabilityMap: Object.create(null),
						blocks: [],
						php: Object.create(null),
						layout: Object.create(null),
					},
				},
				output: previewOutput,
				reporter: previewReporter,
			},
			undefined
		);

		return dependencies.readManifest(workspace);
	});

	return {
		manifest: result,
		workspaceManifest: manifest,
	} satisfies PreviewResult;
}

export async function executeApply({
	dependencies,
	workspace,
	loaded,
	reporter,
}: ApplyExecutionOptions): Promise<NonNullable<PreviewResult['manifest']>> {
	const builder = dependencies.createPatcher();
	const output = dependencies.buildBuilderOutput();
	const generationState = await readGenerationState(workspace);
	const planArtifacts = await resolvePlanArtifacts(workspace);

	await builder.apply(
		{
			context: {
				workspace,
				reporter,
				phase: 'apply' as const,
				generationState,
			},
			input: {
				phase: 'apply' as const,
				options: {
					namespace: loaded.namespace,
					origin: loaded.configOrigin,
					sourcePath: loaded.sourcePath,
				},
				ir: {
					artifacts: {
						plan: planArtifacts,
						pluginLoader: Object.create(null),
						controllers: Object.create(null),
						resources: Object.create(null),
						surfaces: Object.create(null),
						blocks: Object.create(null),
						blockRoots: { applied: '', generated: '' },
						schemas: Object.create(null),
						runtime: Object.create(null),
						php: Object.create(null),
						bundler: Object.create(null),
					},
					meta: {
						version: 1,
						namespace: '',
						sourcePath: '',
						origin: '',
						sanitizedNamespace: '',
						features: [],
						ids: {
							algorithm: 'sha256',
							resourcePrefix: 'res:',
							schemaPrefix: 'sch:',
							blockPrefix: 'blk:',
							capabilityPrefix: 'cap:',
						},
						redactions: [],
						limits: {
							maxConfigKB: 0,
							maxSchemaKB: 0,
							policy: 'error',
						},
						plugin: Object.create(null),
					},
					schemas: [],
					resources: [],
					capabilities: [],
					capabilityMap: Object.create(null),
					blocks: [],
					php: Object.create(null),
					layout: Object.create(null),
				},
			},
			output,
			reporter,
		},
		undefined
	);

	const manifest = await dependencies.readManifest(workspace);
	if (!manifest) {
		throw new WPKernelError('DeveloperError', {
			message: 'Apply manifest missing after patch execution.',
		});
	}

	return manifest;
}

export async function handleNoManifest({
	command,
	workspace,
	dependencies,
	reporter,
	flags,
}: NoManifestOptions): Promise<WPKExitCode> {
	const message = 'No apply manifest produced - nothing to patch.';
	const summary = {
		applied: 0,
		conflicts: 0,
		skipped: 0,
	} satisfies NonNullable<ApplyCommandInstance['summary']>;
	command.summary = summary;
	command.records = [];
	command.manifest = null;
	reporter.info(message);
	command.context.stdout.write(`${message}\n`);

	await dependencies.appendApplyLog(workspace, {
		version: 1,
		timestamp: new Date().toISOString(),
		status: 'skipped',
		exitCode: WPK_EXIT_CODES.SUCCESS,
		flags,
		summary,
		records: [],
		actions: [],
	});

	return WPK_EXIT_CODES.SUCCESS;
}

export async function handleCancellation({
	command,
	workspace,
	dependencies,
	reporter,
	flags,
}: CancellationOptions): Promise<WPKExitCode> {
	reporter.info('Apply cancelled by user.');
	command.summary = null;
	command.records = [];
	command.manifest = null;
	command.context.stdout.write('Apply cancelled.\n');

	await dependencies.appendApplyLog(workspace, {
		version: 1,
		timestamp: new Date().toISOString(),
		status: 'cancelled',
		exitCode: WPK_EXIT_CODES.SUCCESS,
		flags,
		summary: null,
		records: [],
		actions: [],
	});

	return WPK_EXIT_CODES.SUCCESS;
}

export async function handleCompletion({
	workspace,
	dependencies,
	reporter,
	manifest,
	flags,
}: CompletionOptions): Promise<WPKExitCode> {
	const baseEntry: Omit<ApplyLogEntry, 'status' | 'exitCode'> = {
		version: 1 as const,
		timestamp: new Date().toISOString(),
		flags,
		summary: manifest.summary,
		records: manifest.records,
		actions: manifest.actions,
	};

	if (manifest.summary.conflicts > 0) {
		reporter.warn('Apply completed with conflicts.', {
			summary: manifest.summary,
			flags,
		});

		const exitCode = flags.force
			? WPK_EXIT_CODES.SUCCESS
			: WPK_EXIT_CODES.VALIDATION_ERROR;

		if (flags.force) {
			reporter.info('Conflicts detected but continuing due to --force.', {
				summary: manifest.summary,
			});
		}

		await dependencies.appendApplyLog(workspace, {
			...baseEntry,
			status: 'conflict',
			exitCode,
		});

		return exitCode;
	}

	reporter.info('Apply completed.', {
		summary: manifest.summary,
		flags,
	});

	await dependencies.appendApplyLog(workspace, {
		...baseEntry,
		status: 'success',
		exitCode: WPK_EXIT_CODES.SUCCESS,
	});

	return WPK_EXIT_CODES.SUCCESS;
}

async function resolvePlanArtifacts(
	workspace: Parameters<typeof loadLayoutFromWorkspace>[0]['workspace']
): Promise<IRPlanArtifacts> {
	const layout = await loadLayoutFromWorkspace({
		workspace,
		strict: true,
	});

	if (!layout) {
		throw new WPKernelError('DeveloperError', {
			message:
				'layout.manifest.json not found; cannot resolve patch plan artifacts.',
		});
	}

	return {
		planManifestPath: layout.resolve('plan.manifest'),
		patchManifestPath: layout.resolve('patch.manifest'),
		planBaseDir: layout.resolve('plan.base'),
		planIncomingDir: layout.resolve('plan.incoming'),
	};
}

export async function processPreviewStage({
	command,
	workspace,
	dependencies,
	reporter,
	flags,
	preview,
}: PreviewStageOptions): Promise<WPKExitCode | null> {
	if (!preview.manifest) {
		return handleNoManifest({
			command,
			workspace,
			dependencies,
			reporter,
			flags,
		});
	}

	if (flags.yes) {
		return null;
	}

	const confirmed = await confirmApplyRun({
		command,
		dependencies,
		manifest: preview.manifest,
	});

	if (!confirmed) {
		return handleCancellation({
			command,
			workspace,
			dependencies,
			reporter,
			flags,
		});
	}

	return null;
}

export async function confirmApplyRun({
	command,
	dependencies,
	manifest,
}: ConfirmApplyOptions): Promise<boolean> {
	const message = buildConfirmationMessage(manifest);

	return dependencies.promptConfirm({
		message,
		defaultValue: false,
		input: command.context.stdin,
		output: command.context.stdout,
	});
}

export function buildConfirmationMessage(
	manifest: NonNullable<PreviewResult['manifest']>
): string {
	const { applied, conflicts } = manifest.summary;
	const promptBits = [
		`Apply ${applied} change${applied === 1 ? '' : 's'} to the workspace`,
	];

	if (conflicts > 0) {
		promptBits.push(
			`(${conflicts} potential conflict${conflicts === 1 ? '' : 's'})`
		);
	}

	return `${promptBits.join(' ')}?`;
}
