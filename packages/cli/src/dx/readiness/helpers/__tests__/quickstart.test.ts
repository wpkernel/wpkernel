import { EnvironmentalError } from '@wpkernel/core/error';
import { createNoopReporter } from '@wpkernel/core/reporter';
import {
	createQuickstartDepsMock,
	makePromiseWithChild,
	makeRejectedPromiseWithChild,
	type QuickstartDepsMock,
} from '@cli-tests/dx/quickstart.test-support';
import type { DxContext } from '../../../context';
import { createQuickstartReadinessHelper } from '../quickstart';

describe('quickstart readiness helper', () => {
	let deps: QuickstartDepsMock;
	const baseContext: DxContext = {
		reporter: createNoopReporter(),
		workspace: null,
		environment: {
			cwd: process.cwd(),
			projectRoot: process.cwd(),
			workspaceRoot: null,
			allowDirty: false,
		},
	};

	beforeEach(() => {
		deps = createQuickstartDepsMock();
	});

	function createError(
		code: string,
		stdout = '',
		stderr = ''
	): NodeJS.ErrnoException & { stdout?: string; stderr?: string } {
		const error = new Error(code) as NodeJS.ErrnoException & {
			stdout?: string;
			stderr?: string;
		};
		error.code = code;
		if (stdout) {
			error.stdout = stdout;
		}
		if (stderr) {
			error.stderr = stderr;
		}
		return error;
	}

	it('throws EnvironmentalError when wpk binary is missing', async () => {
		deps.access.mockRejectedValue(createError('ENOENT'));
		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		await helper.detect(baseContext).catch((error) => {
			expect(error).toBeInstanceOf(EnvironmentalError);
			expect((error as EnvironmentalError).reason).toBe(
				'cli.binary.missing'
			);
		});

		expect(deps.exec).toHaveBeenCalledTimes(1);
		expect(deps.rm).toHaveBeenCalledWith(
			expect.stringContaining('wpk-quickstart-'),
			{
				recursive: true,
				force: true,
			}
		);
	});

	it('throws EnvironmentalError when tsx runtime is missing', async () => {
		deps.resolve.mockImplementation(() => {
			throw new Error("Cannot find module 'tsx'");
		});
		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		await helper.detect(baseContext).catch((error) => {
			expect((error as EnvironmentalError).reason).toBe('tsx.missing');
		});

		expect(deps.exec).toHaveBeenCalledTimes(1);
		expect(deps.rm).toHaveBeenCalledWith(
			expect.stringContaining('wpk-quickstart-'),
			{
				recursive: true,
				force: true,
			}
		);
	});

	it('reports ready when create and generate succeed', async () => {
		deps.exec
			.mockReturnValueOnce(
				makePromiseWithChild({
					stdout: Buffer.from('scaffold'),
					stderr: Buffer.from(''),
				})
			)
			.mockReturnValueOnce(
				makePromiseWithChild({
					stdout: Buffer.from('generate'),
					stderr: Buffer.from(''),
				})
			);
		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		const detection = await helper.detect(baseContext);
		const state = detection.state!;

		expect(detection.status).toBe('ready');
		expect(detection.state).toBeDefined();
		expect(detection.message).toContain('Quickstart scaffolding verified');
		expect(deps.exec).toHaveBeenCalledTimes(2);
		expect(deps.exec.mock.calls.length).toBeGreaterThan(0);
		const firstCall = deps.exec.mock.calls[0]!;
		expect(firstCall[0]).toBe('npm');
		expect(firstCall[1]).toEqual(['create', '@wpkernel/wpk', 'quickstart']);
		expect(deps.resolve).toHaveBeenCalled();

		const confirmation = await helper.confirm(baseContext, state);
		expect(confirmation.status).toBe('ready');
		expect(deps.rm).toHaveBeenCalledWith(
			expect.stringContaining('wpk-quickstart-'),
			{
				recursive: true,
				force: true,
			}
		);
	});

	it('rethrows unexpected access errors when resolving binary candidates', async () => {
		const accessError = createError('EACCES');
		deps.access.mockRejectedValue(accessError);
		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		await expect(helper.detect(baseContext)).rejects.toBe(accessError);
	});

	it('throws cli.binary.missing when the generate invocation cannot resolve the binary', async () => {
		deps.exec
			.mockReturnValueOnce(
				makePromiseWithChild({
					stdout: Buffer.from(''),
					stderr: Buffer.from(''),
				})
			)
			.mockReturnValueOnce(
				makeRejectedPromiseWithChild(createError('ENOENT'))
			);
		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		await helper.detect(baseContext).catch((error) => {
			expect((error as EnvironmentalError).reason).toBe(
				'cli.binary.missing'
			);
		});
	});

	it('surfaces tsx missing errors when generate stdout reports module absence', async () => {
		deps.exec
			.mockReturnValueOnce(
				makePromiseWithChild({
					stdout: Buffer.from(''),
					stderr: Buffer.from(''),
				})
			)
			.mockReturnValueOnce(
				makeRejectedPromiseWithChild(
					createError('EFAIL', "Cannot find module 'tsx'", '')
				)
			);
		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		await helper.detect(baseContext).catch((error) => {
			expect((error as EnvironmentalError).reason).toBe('tsx.missing');
		});
	});

	it('wraps unexpected generate failures in cli.quickstart.failed errors', async () => {
		deps.exec
			.mockReturnValueOnce(
				makePromiseWithChild({
					stdout: Buffer.from(''),
					stderr: Buffer.from(''),
				})
			)
			.mockReturnValueOnce(
				makeRejectedPromiseWithChild(
					createError('EFAIL', 'unexpected', 'generate failed')
				)
			);
		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		await helper.detect(baseContext).catch((error) => {
			expect((error as EnvironmentalError).reason).toBe(
				'cli.quickstart.failed'
			);
		});
	});

	it('checks Windows binary candidates when resolving the CLI entrypoint', async () => {
		deps.access
			.mockRejectedValueOnce(createError('ENOENT'))
			.mockRejectedValueOnce(createError('ENOENT'))
			.mockResolvedValueOnce(undefined);
		const originalDescriptor = Object.getOwnPropertyDescriptor(
			process,
			'platform'
		);
		Object.defineProperty(process, 'platform', {
			value: 'win32',
		});

		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		try {
			const detection = await helper.detect(baseContext);
			expect(detection.status).toBe('ready');
		} finally {
			if (originalDescriptor) {
				Object.defineProperty(process, 'platform', originalDescriptor);
			}
		}
	});

	it('propagates unexpected tsx resolution failures', async () => {
		const unexpected = new Error('resolution boom');
		deps.resolve.mockImplementation(() => {
			throw unexpected;
		});

		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		await expect(helper.detect(baseContext)).rejects.toBe(unexpected);
	});

	it('suppresses cleanup failures when removing the temp workspace', async () => {
		deps.rm.mockRejectedValue(new Error('cleanup failed'));
		const helper = createQuickstartReadinessHelper({ dependencies: deps });

		const detection = await helper.detect(baseContext);
		expect(detection.status).toBe('ready');
	});

	it('reports pending confirmation when the run has not completed', async () => {
		const helper = createQuickstartReadinessHelper();

		const confirmation = await helper.confirm(baseContext, {
			run: null,
		} as unknown as Parameters<
			ReturnType<typeof createQuickstartReadinessHelper>['confirm']
		>[1]);

		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe(
			'Quickstart execution has not completed yet.'
		);
	});
});
