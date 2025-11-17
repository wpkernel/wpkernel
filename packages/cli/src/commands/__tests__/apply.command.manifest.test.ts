import { WPK_EXIT_CODES } from '@wpkernel/core/contracts';
import { assignCommandContext } from '@wpkernel/test-utils/cli';
import { createWorkspaceRunner as buildWorkspaceRunner } from '../../../tests/workspace.test-support';
import * as ApplyModule from '../apply';
import {
	TMP_PREFIX,
	buildLoadedConfig,
} from '@wpkernel/test-utils/cli/commands/apply.test-support';
import type {
	ReadinessHelperDescriptor,
	ReadinessPlan,
	ReadinessRegistry,
} from '../../dx';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

const withWorkspace = buildWorkspaceRunner({ prefix: TMP_PREFIX });

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

describe('ApplyCommand manifest handling', () => {
	it('reports failure when manifest parsing fails', async () => {
		await withWorkspace(async (workspace) => {
			const layout = loadTestLayoutSync();
			const applyStatePath = layout.resolve('apply.state');
			const loadConfig = jest
				.fn()
				.mockResolvedValue(buildLoadedConfig(workspace));
			const readText = jest
				.fn()
				.mockImplementation(async (file: string) => {
					if (file === 'layout.manifest.json') {
						return JSON.stringify({
							directories: {
								'.wpk': {
									apply: {
										'patch-manifest.json': 'patch.manifest',
										'patch-manifest.base.json':
											'patch.manifest.base',
										'patch-manifest.incoming.json':
											'patch.manifest.incoming',
										'plan.json': 'plan.manifest',
										base: 'plan.base',
										incoming: 'plan.incoming',
										'state.json': 'apply.state',
									},
									tmp: 'tmp',
								},
								inc: { Rest: 'controllers.applied' },
							},
						});
					}
					if (file === applyStatePath) {
						return '';
					}

					return 'invalid-json';
				});
			const dryRun = jest.fn(async (fn) => {
				try {
					const result = await fn();
					return { result, manifest: { writes: [], deletes: [] } };
				} catch (error) {
					throw error;
				}
			});
			const buildWorkspace = jest.fn().mockReturnValue({
				readText,
				resolve: jest.fn(),
				dryRun,
			});
			const createPatcher = jest.fn().mockReturnValue({
				apply: jest.fn(async () => undefined),
			});
			const ensureGitRepository = jest.fn().mockResolvedValue(undefined);
			const appendApplyLog = jest.fn().mockResolvedValue(undefined);
			const readiness = createReadinessRegistryStub();

			const ApplyCommand = ApplyModule.buildApplyCommand({
				loadWPKernelConfig: loadConfig,
				buildWorkspace,
				createPatcher,
				ensureGitRepository,
				appendApplyLog,
				buildReadinessRegistry: readiness.buildReadinessRegistry,
			});
			const command = new ApplyCommand();
			command.yes = true;
			command.backup = false;
			command.force = false;
			assignCommandContext(command, { cwd: workspace });

			const exitCode = await command.execute();

			expect(buildWorkspace).toHaveBeenCalledWith(workspace);
			expect(createPatcher).toHaveBeenCalled();
			expect(readText).toHaveBeenCalledWith(
				ApplyModule.PATCH_MANIFEST_PATH
			);
			expect(exitCode).toBe(WPK_EXIT_CODES.UNEXPECTED_ERROR);
			expect(command.summary).toBeNull();
			expect(command.records).toEqual([]);
			expect(readiness.readinessRun).toHaveBeenCalledTimes(1);
		});
	});
});
