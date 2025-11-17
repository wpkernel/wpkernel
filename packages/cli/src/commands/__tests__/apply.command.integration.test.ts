import path from 'node:path';
import fs from 'node:fs/promises';
import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '../../../tests/workspace.test-support';
import { loadTestLayout } from '../../tests/layout.test-support';
import * as ApplyModule from '../apply';
import {
	TMP_PREFIX,
	buildLoadedConfig,
	seedPlan,
	toFsPath,
	readApplyLogEntries,
} from '@wpkernel/test-utils/cli/commands/apply.test-support';
import type {
	ReadinessHelperDescriptor,
	ReadinessPlan,
	ReadinessRegistry,
} from '../../dx';

const withWorkspace = buildWorkspaceRunner({
	prefix: TMP_PREFIX,
	async setup(workspace) {
		await fs.mkdir(path.join(workspace, '.git'), { recursive: true });
	},
});

function createReadinessRegistryStub() {
	const readinessRun = jest.fn().mockResolvedValue({ outcomes: [] });
	const readinessPlanMock = jest.fn(
		(keys: ReadinessPlan['keys']) =>
			({ keys, run: readinessRun }) as ReadinessPlan
	);
	const readinessDescriptors = [
		{
			key: 'composer',
			metadata: { label: 'Composer dependencies', scopes: ['apply'] },
		},
		{
			key: 'tsx-runtime',
			metadata: { label: 'TSX runtime', scopes: ['apply'] },
		},
	] satisfies ReadinessHelperDescriptor[];
	const readinessRegistry = {
		plan: readinessPlanMock,
		describe: jest.fn(() => readinessDescriptors),
	} as unknown as ReadinessRegistry;

	return {
		readinessRun,
		readinessPlanMock,
		buildReadinessRegistry: jest.fn(() => readinessRegistry),
		readinessDescriptors,
	};
}

describe('ApplyCommand integration', () => {
	it('applies git patches and reports summary', async () => {
		await withWorkspace(async (workspace) => {
			const layout = await loadTestLayout({
				cwd: workspace,
				strict: true,
			});
			const target = path.posix.join('php', 'JobController.php');
			const baseContents = ['<?php', 'class JobController {}', ''].join(
				'\n'
			);
			const incomingContents = [
				'<?php',
				'class JobController extends BaseController {}',
				'',
			].join('\n');

			await seedPlan(workspace, target, {
				base: baseContents,
				incoming: incomingContents,
				description: 'Update controller shim',
				current: baseContents,
				layout: {
					planManifest: layout.resolve('plan.manifest'),
					planBase: layout.resolve('plan.base'),
					planIncoming: layout.resolve('plan.incoming'),
				},
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readiness = createReadinessRegistryStub();
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			const { stdout } = assignCommandContext(command, {
				cwd: workspace,
			});

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
			expect(command.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
			expect(command.records).toEqual([
				expect.objectContaining({
					file: target,
					status: 'applied',
					description: 'Update controller shim',
				}),
			]);
			expect(command.manifest?.actions).toEqual(
				expect.arrayContaining([
					target,
					layout.resolve('patch.manifest'),
					path.posix.join(layout.resolve('plan.base'), target),
				])
			);
			expect(stdout.toString()).toContain('Applied: 1');
			expect(stdout.toString()).toContain(target);

			const targetPath = toFsPath(workspace, target);
			const contents = await fs.readFile(targetPath, 'utf8');
			expect(contents).toBe(incomingContents);
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});

	it('creates backups when the backup flag is set', async () => {
		await withWorkspace(async (workspace) => {
			const layout = await loadTestLayout({
				cwd: workspace,
				strict: true,
			});
			const target = path.posix.join('php', 'BackupController.php');
			const baseContents = [
				'<?php',
				'class BackupController {}',
				'',
			].join('\n');
			const updatedContents = [
				'<?php',
				'class BackupController extends BaseController {}',
				'',
			].join('\n');

			await seedPlan(workspace, target, {
				base: baseContents,
				incoming: updatedContents,
				current: baseContents,
				description: 'Update controller shim',
				layout: {
					planManifest: layout.resolve('plan.manifest'),
					planBase: layout.resolve('plan.base'),
					planIncoming: layout.resolve('plan.incoming'),
				},
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readiness = createReadinessRegistryStub();
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = true;
			command.force = false;
			assignCommandContext(command, { cwd: workspace });

			await command.execute();

			const backupPath = `${toFsPath(workspace, target)}.bak`;
			const backupContents = await fs.readFile(backupPath, 'utf8');
			expect(backupContents).toBe(baseContents);
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});
	it('accepts git repositories located in ancestor directories', async () => {
		await withWorkspace(async (workspace) => {
			const layout = await loadTestLayout({
				cwd: workspace,
				strict: true,
			});
			const projectWorkspace = path.join(workspace, 'packages', 'demo');
			await fs.mkdir(projectWorkspace, { recursive: true });

			const target = path.posix.join('php', 'AncestorController.php');
			const baseContents = [
				'<?php',
				'class AncestorController {}',
				'',
			].join('\n');
			const incomingContents = [
				'<?php',
				'class AncestorController extends BaseController {}',
				'',
			].join('\n');

			await seedPlan(projectWorkspace, target, {
				base: baseContents,
				incoming: incomingContents,
				current: baseContents,
				description: 'Update controller shim',
				layout: {
					planManifest: layout.resolve('plan.manifest'),
					planBase: layout.resolve('plan.base'),
					planIncoming: layout.resolve('plan.incoming'),
				},
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(projectWorkspace));
			const readiness = createReadinessRegistryStub();
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			assignCommandContext(command, { cwd: projectWorkspace });

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
			expect(command.summary).toEqual({
				applied: 1,
				conflicts: 0,
				skipped: 0,
			});
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});

	it('records apply runs in the workspace log', async () => {
		await withWorkspace(async (workspace) => {
			const layout = await loadTestLayout({
				cwd: workspace,
				strict: true,
			});
			const target = path.posix.join('php', 'LogController.php');
			const baseContents = ['<?php', 'class LogController {}', ''].join(
				'\n'
			);
			const incomingContents = [
				'<?php',
				'class LogController extends Base {}',
				'',
			].join('\n');

			await seedPlan(workspace, target, {
				base: baseContents,
				incoming: incomingContents,
				current: baseContents,
				description: 'Promote controller changes',
				layout: {
					planManifest: layout.resolve('plan.manifest'),
					planBase: layout.resolve('plan.base'),
					planIncoming: layout.resolve('plan.incoming'),
				},
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readiness = createReadinessRegistryStub();
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			assignCommandContext(command, { cwd: workspace });

			await command.execute();

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'success',
					flags: expect.objectContaining({
						allowDirty: false,
						yes: true,
						backup: false,
						force: false,
						cleanup: [],
					}),
					summary: { applied: 1, conflicts: 0, skipped: 0 },
				})
			);
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});

	it('returns success when no plan exists', async () => {
		await withWorkspace(async (workspace) => {
			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readiness = createReadinessRegistryStub();
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			const { stdout } = assignCommandContext(command, {
				cwd: workspace,
			});

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
			expect(command.summary).toEqual({
				applied: 0,
				conflicts: 0,
				skipped: 0,
			});
			expect(command.records).toEqual([]);
			expect(stdout.toString()).toContain('No apply manifest produced');

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'skipped',
					exitCode: WPK_EXIT_CODES.SUCCESS,
					summary: { applied: 0, conflicts: 0, skipped: 0 },
				})
			);
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});

	it('exits with validation error when conflicts occur', async () => {
		await withWorkspace(async (workspace) => {
			const layout = await loadTestLayout({
				cwd: workspace,
				strict: true,
			});
			const target = path.posix.join('php', 'Conflict.php');
			const base = ['line-one', 'line-two', ''].join('\n');
			const incoming = ['line-one updated', 'line-two', ''].join('\n');
			const current = ['line-one custom', 'line-two', ''].join('\n');

			await seedPlan(workspace, target, {
				base,
				incoming,
				current,
				description: 'Introduce new logic',
				layout: {
					planManifest: layout.resolve('plan.manifest'),
					planBase: layout.resolve('plan.base'),
					planIncoming: layout.resolve('plan.incoming'),
				},
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readiness = createReadinessRegistryStub();
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			const { stdout } = assignCommandContext(command, {
				cwd: workspace,
			});

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.VALIDATION_ERROR);
			expect(command.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});
			expect(stdout.toString()).toContain('Conflicts: 1');

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'conflict',
					exitCode: WPK_EXIT_CODES.VALIDATION_ERROR,
					summary: { applied: 0, conflicts: 1, skipped: 0 },
				})
			);
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});

	it('returns success for conflicts when force is enabled', async () => {
		await withWorkspace(async (workspace) => {
			const layout = await loadTestLayout({
				cwd: workspace,
				strict: true,
			});
			const target = path.posix.join('php', 'Forced.php');
			const base = ['original', ''].join('\n');
			const incoming = ['updated', ''].join('\n');
			const current = ['custom', ''].join('\n');

			await seedPlan(workspace, target, {
				base,
				incoming,
				current,
				description: 'Introduce conflict',
				layout: {
					planManifest: layout.resolve('plan.manifest'),
					planBase: layout.resolve('plan.base'),
					planIncoming: layout.resolve('plan.incoming'),
				},
			});

			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readiness = createReadinessRegistryStub();
			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = true;
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(exitCode).toBe(WPK_EXIT_CODES.SUCCESS);
			expect(command.summary).toEqual({
				applied: 0,
				conflicts: 1,
				skipped: 0,
			});

			const entries = await readApplyLogEntries(workspace);
			expect(entries.at(-1)).toEqual(
				expect.objectContaining({
					status: 'conflict',
					exitCode: WPK_EXIT_CODES.SUCCESS,
					flags: expect.objectContaining({
						allowDirty: false,
						yes: true,
						backup: false,
						force: true,
						cleanup: [],
					}),
				})
			);
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});
});
