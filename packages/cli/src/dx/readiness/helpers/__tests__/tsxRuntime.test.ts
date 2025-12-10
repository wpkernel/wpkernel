import { EnvironmentalError } from '@wpkernel/core/error';
import {
	createTsxRuntimeReadinessHelper,
	type TsxRuntimeDependencies,
} from '../tsxRuntime';
import type { DxContext } from '../../../context';
import {
	createReadinessTestContext,
	createRecordingReporter,
} from '@cli-tests/readiness.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { makePromiseWithChild } from '@cli-tests/dx/quickstart.test-support';

function createModuleNotFound(
	specifier: string,
	message?: string
): NodeJS.ErrnoException {
	const error = new Error(
		message ?? `Cannot find module '${specifier}'`
	) as NodeJS.ErrnoException;
	error.code = 'MODULE_NOT_FOUND';
	return error;
}

const buildWorkspace = () => makeWorkspaceMock({ root: '/tmp/project' });

function makeExecMock(): jest.MockedFunction<TsxRuntimeDependencies['exec']> {
	const mock = jest.fn(
		(..._args: Parameters<TsxRuntimeDependencies['exec']>) =>
			makePromiseWithChild({ stdout: '', stderr: '' })
	);
	return mock as unknown as jest.MockedFunction<
		TsxRuntimeDependencies['exec']
	>;
}

describe('createTsxRuntimeReadinessHelper', () => {
	it('detects existing tsx runtime', async () => {
		const helper = createTsxRuntimeReadinessHelper({
			resolve: jest
				.fn()
				.mockReturnValue('/tmp/node_modules/tsx/esm/api.js'),
			exec: makeExecMock(),
		});
		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);
		expect(detection.status).toBe('ready');
		expect(detection.message).toContain('tsx runtime resolved at');
		expect(detection.state.resolvedPath).toBe(
			'/tmp/node_modules/tsx/esm/api.js'
		);
		expect(detection.state.missingError).toBeNull();
		expect(detection.state.installedDuringRun).toBe(false);
	});

	it('installs tsx when missing', async () => {
		const resolve = jest
			.fn()
			.mockImplementationOnce(() => {
				throw createModuleNotFound('tsx/esm/api');
			})
			.mockReturnValue('/tmp/node_modules/tsx/esm/api.js');
		const exec = makeExecMock();
		const workspace = buildWorkspace();
		const helper = createTsxRuntimeReadinessHelper({ resolve, exec });

		const baseContext = createReadinessTestContext({ workspace });
		const { reporter, records } = createRecordingReporter();
		const context: DxContext = { ...baseContext, reporter };
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(detection.state.missingError).toBeInstanceOf(EnvironmentalError);
		expect(detection.message).toContain('tsx runtime missing');

		const execution = await helper.execute?.(context, detection.state);
		expect(execution).toBeDefined();
		expect(execution?.state.installedDuringRun).toBe(true);
		expect(execution?.state.missingError).toBeNull();
		expect(execution?.state.resolvedPath).toBe(
			'/tmp/node_modules/tsx/esm/api.js'
		);
		expect(exec).toHaveBeenCalledWith(
			'npm',
			['install', '--save-dev', 'tsx'],
			{
				cwd: workspace.root,
			}
		);
		expect(
			records.some(
				(entry) =>
					entry.level === 'info' &&
					entry.message === 'Installed tsx runtime dependency.'
			)
		).toBe(true);

		const confirmation = await helper.confirm(context, execution!.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toContain('tsx runtime available at');

		await execution?.cleanup?.();
		expect(exec).toHaveBeenCalledWith(
			'npm',
			['uninstall', '--save-dev', 'tsx'],
			{
				cwd: workspace.root,
			}
		);
	});

	it('blocks when workspace is unavailable', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw createModuleNotFound('tsx/esm/api');
		});
		const helper = createTsxRuntimeReadinessHelper({
			resolve,
			exec: makeExecMock(),
		});

		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);

		expect(detection.status).toBe('blocked');
		expect(detection.message).toContain('tsx runtime missing');
		expect(detection.state.missingError).toBeInstanceOf(EnvironmentalError);
	});

	it('surfaces developer errors when resolution fails unexpectedly', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw new Error('resolution failure');
		});
		const { reporter, records } = createRecordingReporter();
		const workspace = buildWorkspace();
		const baseContext = createReadinessTestContext({ workspace });
		const context: DxContext = { ...baseContext, reporter };
		const helper = createTsxRuntimeReadinessHelper({
			resolve,
			exec: makeExecMock(),
		});

		const detection = await helper.detect(context);

		expect(detection.status).toBe('blocked');
		expect(detection.message).toBe(
			'Failed to resolve tsx runtime via CLI loader.'
		);
		expect(
			records.some(
				(entry) =>
					entry.level === 'error' &&
					entry.message === 'tsx runtime probe failed.'
			)
		).toBe(true);
	});

	it('reports pending confirmation when tsx remains missing after install', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw createModuleNotFound('tsx/esm/api');
		});
		const exec = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
		const workspace = buildWorkspace();
		const helper = createTsxRuntimeReadinessHelper({ resolve, exec });
		const baseContext = createReadinessTestContext({ workspace });
		const { reporter, records } = createRecordingReporter();
		const context: DxContext = { ...baseContext, reporter };

		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		const execution = await helper.execute?.(context, detection.state);
		expect(execution).toBeDefined();
		expect(execution?.state.missingError).toBeInstanceOf(
			EnvironmentalError
		);

		const confirmation = await helper.confirm(context, execution!.state);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.state.missingError).toBeInstanceOf(
			EnvironmentalError
		);
		expect(
			records.some(
				(entry) =>
					entry.level === 'error' &&
					entry.message === 'tsx runtime confirmation failed.'
			)
		).toBe(true);
	});

	it('reports missing runtime when resolution fails in cwd-only contexts', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw createModuleNotFound('tsx/esm/api');
		});
		const { reporter } = createRecordingReporter();
		const context: DxContext = {
			reporter,
			workspace: null,
			environment: {
				cwd: '/tmp/empty',
				projectRoot: '',
				workspaceRoot: null,
				allowDirty: false,
			},
		};
		const helper = createTsxRuntimeReadinessHelper({
			resolve,
			exec: jest.fn(),
		});

		const detection = await helper.detect(context);

		expect(detection.status).toBe('blocked');
		expect(detection.message).toBe('tsx runtime missing from /tmp/empty.');
	});

	it('skips installation when execute runs without a workspace', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw createModuleNotFound('tsx/esm/api');
		});
		const exec = jest.fn();
		const helper = createTsxRuntimeReadinessHelper({ resolve, exec });
		const detection = await helper.detect(
			createReadinessTestContext({ workspace: null })
		);

		const result = await helper.execute?.(
			createReadinessTestContext({ workspace: null }),
			detection.state
		);

		expect(result?.state.workspace).toBeNull();
		expect(exec).not.toHaveBeenCalled();
	});

	it('recognises alternate module missing messages', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw createModuleNotFound('tsx', "Can't resolve 'tsx'");
		});
		const workspace = buildWorkspace();
		const helper = createTsxRuntimeReadinessHelper({
			resolve,
			exec: jest.fn(),
		});

		const detection = await helper.detect(
			createReadinessTestContext({ workspace })
		);

		expect(detection.status).toBe('pending');
		expect(detection.state.missingError).toBeInstanceOf(EnvironmentalError);
	});

	it('falls back to developer error when resolver returns undefined', async () => {
		const resolve = jest
			.fn()
			.mockReturnValue(undefined as unknown as string);
		const exec = jest.fn();
		const workspace = buildWorkspace();
		const { reporter, records } = createRecordingReporter();
		const context: DxContext = {
			...createReadinessTestContext({ workspace }),
			reporter,
		};
		const helper = createTsxRuntimeReadinessHelper({ resolve, exec });

		const detection = await helper.detect(context);
		expect(detection.status).toBe('blocked');
		expect(detection.message).toBe(
			'tsx runtime probe failed with unknown error.'
		);
		expect(
			records.some(
				(entry) =>
					entry.level === 'error' &&
					entry.message === 'tsx runtime probe failed.'
			)
		).toBe(true);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe('tsx runtime still missing.');
	});

	it('strips original error metadata when throwable is not an Error instance', async () => {
		const resolve = jest.fn().mockImplementation(() => {
			throw 'boom';
		});
		const helper = createTsxRuntimeReadinessHelper({
			resolve,
			exec: jest.fn(),
		});
		const workspace = buildWorkspace();
		const detection = await helper.detect(
			createReadinessTestContext({ workspace })
		);

		expect(detection.status).toBe('blocked');
		const error = detection.state.missingError;
		expect(error?.code).toBe('DeveloperError');
		expect(error?.data).toEqual({ paths: expect.any(Array) });
	});

	it('omits cleanup when runtime was already present', async () => {
		const resolve = jest
			.fn()
			.mockReturnValue('/tmp/node_modules/tsx/esm/api.js');
		const exec = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
		const helper = createTsxRuntimeReadinessHelper({ resolve, exec });
		const workspace = buildWorkspace();
		const detection = await helper.detect(
			createReadinessTestContext({ workspace })
		);

		expect(detection.status).toBe('ready');

		const execution = await helper.execute?.(
			createReadinessTestContext({ workspace }),
			detection.state
		);

		expect(execution?.cleanup).toBeUndefined();
	});
});
