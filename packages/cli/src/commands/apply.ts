import { Command, Option } from 'clipanion';
import { type WPKExitCode } from '@wpkernel/core/contracts';
import { COMMAND_HELP } from '../cli/help';
import { determineExitCode, reportFailure } from './apply/errors';
import { buildReporterNamespace } from './apply/constants';
import { mergeDependencies } from './apply/dependencies';
import { formatManifest } from './apply/io';
import { initialiseWorkspace } from './apply/workspace';
import {
	executeApply,
	handleCompletion,
	previewPatches,
	processPreviewStage,
} from './apply/workflow';
import { handleFailureLog } from './apply/logging';
import { resolveFlags } from './apply/flags';
import type {
	ApplyCommandConstructor,
	ApplyCommandInstance,
	BuildApplyCommandOptions,
	PatchManifest,
	PatchManifestSummary,
	PatchRecord,
} from './apply/types';
import type { Workspace } from '../workspace';
import { cleanupWorkspaceTargets } from './apply/cleanup';
import { runCommandReadiness } from './readiness';
import { resolveCommandCwd } from './init/command-runtime';
import { runWithProgress, formatDuration } from '../utils/progress';

/**
 * The path to the apply log file within the workspace.
 *
 * @category Commands
 */
export {
	APPLY_LOG_FALLBACK_PATH,
	PATCH_MANIFEST_PATH,
	resolveApplyLogPath,
} from './apply/constants';
export { createBackups } from './apply/backups';
export { appendApplyLog } from './apply/logging';
export { buildBuilderOutput, readManifest, formatManifest } from './apply/io';
export { ensureGitRepository, resolveWorkspaceRoot } from './apply/workspace';
export { cleanupWorkspaceTargets } from './apply/cleanup';
export type {
	ApplyCommandConstructor,
	ApplyCommandInstance,
	ApplyFlags,
	ApplyLogEntry,
	ApplyLogStatus,
	CreateBackupsOptions,
	BuildApplyCommandOptions,
	PatchManifest,
	PatchManifestSummary,
	PatchRecord,
	PatchStatus,
	PreviewResult,
} from './apply/types';

function withCommandState(
	command: ApplyCommandInstance,
	manifest: PatchManifest | null
): void {
	if (!manifest) {
		command.manifest = null;
		command.summary = null;
		command.records = [];
		return;
	}

	command.manifest = manifest;
	command.summary = manifest.summary;
	command.records = manifest.records;
}

/**
 * Builds the `apply` command for the CLI.
 *
 * This command is responsible for applying pending workspace patches generated
 * by the `generate` command. It handles previewing changes, creating backups,
 * executing the patch application, and reporting the results.
 *
 * @category Commands
 * @param    options - Options for building the apply command, including dependencies.
 * @returns The `ApplyCommandConstructor` class.
 */
export function buildApplyCommand(
	options: BuildApplyCommandOptions = {}
): ApplyCommandConstructor {
	const dependencies = mergeDependencies(options);

	class ApplyCommand extends Command {
		static override paths = [['apply']];

		static override usage = Command.Usage({
			description: COMMAND_HELP.apply.description,
			details: COMMAND_HELP.apply.details,
			examples: COMMAND_HELP.apply.examples,
		});

		yes = Option.Boolean('--yes,-y', false);
		backup = Option.Boolean('--backup,-b', false);
		force = Option.Boolean('--force,-f', false);
		cleanup = Option.Array('--cleanup,-c', {
			description: 'Remove leftover shim paths before applying patches.',
		});
		allowDirty = Option.Boolean('--allow-dirty,-D', false);
		verbose = Option.Boolean('--verbose,-v', false);

		public summary: PatchManifestSummary | null = null;
		public records: PatchRecord[] = [];
		public manifest: PatchManifest | null = null;

		override async execute(): Promise<WPKExitCode> {
			let workspace: Workspace | null = null;
			const flags = resolveFlags(this);
			const cwd = resolveCommandCwd(this.context);
			const reporter = dependencies.buildReporter({
				namespace: buildReporterNamespace(),
				level: this.verbose ? 'debug' : 'info',
				enabled: process.env.NODE_ENV !== 'test',
			});

			try {
				const { workspace: activeWorkspace, loaded } =
					await initialiseWorkspace({ dependencies });
				workspace = activeWorkspace;

				await runCommandReadiness({
					buildReadinessRegistry: dependencies.buildReadinessRegistry,
					registryOptions: {
						helperFactories: loaded.config.readiness?.helpers,
					},
					reporter: reporter.child('readiness'),
					workspace: activeWorkspace,
					workspaceRoot: activeWorkspace.root,
					cwd,
					keys: [],
					scopes: ['apply'],
					allowDirty: flags.allowDirty,
				});

				const { result: preview } = await runWithProgress({
					reporter,
					label: 'Evaluating pending patches',
					run: () =>
						previewPatches({
							dependencies,
							workspace: activeWorkspace,
							loaded,
						}),
					successMessage: (durationMs) =>
						`✓ Patch preview completed in ${formatDuration(durationMs)}.`,
				});

				if (flags.cleanup.length > 0) {
					await cleanupWorkspaceTargets({
						workspace: activeWorkspace,
						reporter,
						targets: flags.cleanup,
					});
				}

				const previewExit = await processPreviewStage({
					command: this,
					workspace: activeWorkspace,
					dependencies,
					reporter,
					flags,
					preview,
				});

				if (previewExit !== null) {
					return previewExit;
				}

				if (flags.backup) {
					await runWithProgress({
						reporter,
						label: 'Creating workspace backups',
						run: () =>
							dependencies.createBackups({
								workspace: activeWorkspace,
								manifest: preview.workspaceManifest,
								reporter,
							}),
					});
				}

				const { result: manifest } = await runWithProgress({
					reporter,
					label: 'Applying workspace patches',
					run: () =>
						executeApply({
							dependencies,
							workspace: activeWorkspace,
							loaded,
							reporter,
						}),
					successMessage: (durationMs) =>
						`✓ Apply completed in ${formatDuration(durationMs)}.`,
				});

				withCommandState(this, manifest);
				this.context.stdout.write(formatManifest(manifest));

				return handleCompletion({
					workspace: activeWorkspace,
					dependencies,
					reporter,
					manifest,
					flags,
				});
			} catch (error) {
				withCommandState(this, null);
				reportFailure(
					reporter,
					'Failed to apply workspace patches.',
					error,
					{ includeContext: this.verbose === true }
				);
				const exitCode = determineExitCode(error);

				if (workspace) {
					await handleFailureLog({
						workspace,
						dependencies,
						flags,
						exitCode,
						error,
					});
				}

				return exitCode;
			}
		}
	}

	return ApplyCommand as ApplyCommandConstructor;
}

/**
 * The main `apply` command instance.
 *
 * This is the entry point for applying generated patches to the workspace.
 *
 * @category Commands
 */
export const ApplyCommand = buildApplyCommand();
