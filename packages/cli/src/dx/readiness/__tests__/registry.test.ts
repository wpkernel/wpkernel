import { createReporter } from '@wpkernel/core/reporter';
import { WPKernelError } from '@wpkernel/core/error';
import {
	createReadinessHelper,
	createReadinessRegistry,
	type ReadinessDetection,
	type ReadinessConfirmation,
} from '..';
import type { DxContext } from '../../context';
import { createRecordingReporter } from '@cli-tests/readiness.test-support';

describe('ReadinessRegistry', () => {
	function buildContext(overrides: Partial<DxContext> = {}): DxContext {
		const reporter = createReporter({
			namespace: 'wpk.test.dx',
			level: 'debug',
			enabled: false,
		});

		return {
			reporter,
			workspace: null,
			environment: {
				cwd: process.cwd(),
				projectRoot: process.cwd(),
				workspaceRoot: null,
				allowDirty: false,
			},
			...overrides,
		} satisfies DxContext;
	}

	it('rejects duplicate helper keys', () => {
		const registry = createReadinessRegistry();
		registry.register(
			createReadinessHelper({
				key: 'git',
				metadata: { label: 'Test git helper' },
				async detect(): Promise<ReadinessDetection<null>> {
					return { status: 'ready', state: null };
				},
				async confirm(): Promise<ReadinessConfirmation<null>> {
					return { status: 'ready', state: null };
				},
			})
		);

		expect(() =>
			registry.register(
				createReadinessHelper({
					key: 'git',
					metadata: { label: 'Duplicate git helper' },
					async detect(): Promise<ReadinessDetection<null>> {
						return { status: 'ready', state: null };
					},
					async confirm(): Promise<ReadinessConfirmation<null>> {
						return { status: 'ready', state: null };
					},
				})
			)
		).toThrow(WPKernelError);
	});

	it('runs detection and confirmation for ready helpers', async () => {
		const registry = createReadinessRegistry();
		registry.register(
			createReadinessHelper({
				key: 'git',
				metadata: { label: 'Ready helper' },
				async detect(): Promise<ReadinessDetection<null>> {
					return { status: 'ready', state: null };
				},
				async confirm(): Promise<ReadinessConfirmation<null>> {
					return { status: 'ready', state: null };
				},
			})
		);

		const plan = registry.plan(['git']);
		const result = await plan.run(buildContext());

		expect(result.error).toBeUndefined();
		expect(result.outcomes).toHaveLength(1);
		expect(result.outcomes[0]).toMatchObject({
			key: 'git',
			status: 'ready',
		});
	});

	it('executes pending helpers and marks them as updated', async () => {
		const registry = createReadinessRegistry();
		const executeSpy = jest.fn();

		registry.register(
			createReadinessHelper({
				key: 'git',
				metadata: { label: 'Pending helper' },
				async detect(): Promise<ReadinessDetection<{ count: number }>> {
					return { status: 'pending', state: { count: 0 } };
				},
				async execute(
					_context,
					state
				): Promise<{ state: { count: number } }> {
					executeSpy();
					return { state: { count: state.count + 1 } };
				},
				async confirm(): Promise<
					ReadinessConfirmation<{ count: number }>
				> {
					return { status: 'ready', state: { count: 1 } };
				},
			})
		);

		const plan = registry.plan(['git']);
		const result = await plan.run(buildContext());

		expect(executeSpy).toHaveBeenCalledTimes(1);
		expect(result.error).toBeUndefined();
		expect(result.outcomes[0]).toMatchObject({
			key: 'git',
			status: 'updated',
		});
	});

	it('runs cleanup and rollback when execution fails', async () => {
		const registry = createReadinessRegistry();
		const cleanupSpy = jest.fn();
		const rollbackSpy = jest.fn();

		registry.register(
			createReadinessHelper({
				key: 'git',
				metadata: { label: 'Failure helper' },
				async detect(): Promise<ReadinessDetection<{ count: number }>> {
					return { status: 'pending', state: { count: 0 } };
				},
				async execute(): Promise<{
					state: { count: number };
					cleanup: () => Promise<void>;
				}> {
					return {
						state: { count: 1 },
						cleanup: async () => {
							cleanupSpy();
						},
					};
				},
				async confirm(): Promise<
					ReadinessConfirmation<{ count: number }>
				> {
					throw new Error('boom');
				},
				async rollback(): Promise<void> {
					rollbackSpy();
				},
			})
		);

		const plan = registry.plan(['git']);
		const result = await plan.run(buildContext());

		expect(cleanupSpy).toHaveBeenCalledTimes(1);
		expect(rollbackSpy).toHaveBeenCalledTimes(1);
		expect(result.error).toBeInstanceOf(Error);
		expect(result.outcomes[0]).toMatchObject({
			key: 'git',
			status: 'failed',
		});
	});

	it('emits reporter events for each readiness phase', async () => {
		const registry = createReadinessRegistry();
		const records = createRecordingReporter();
		const detectionState: { steps: string[] } = { steps: [] };

		registry.register(
			createReadinessHelper({
				key: 'composer',
				metadata: { label: 'Composer helper' },
				async detect() {
					return {
						status: 'pending',
						message: 'Composer dependencies missing.',
						state: detectionState,
					} satisfies ReadinessDetection<typeof detectionState>;
				},
				async prepare(_context, state) {
					state.steps.push('prepare');
					return { state };
				},
				async execute(_context, state) {
					state.steps.push('execute');
					return { state };
				},
				async confirm() {
					return {
						status: 'ready',
						message: 'Composer ready.',
						state: detectionState,
					} satisfies ReadinessConfirmation<typeof detectionState>;
				},
			})
		);

		const plan = registry.plan(['composer']);
		const result = await plan.run(
			buildContext({ reporter: records.reporter })
		);

		expect(result.error).toBeUndefined();
		expect(records.records).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					namespace: 'composer.detect',
					level: 'info',
					message: 'Detect phase started.',
				}),
				expect.objectContaining({
					namespace: 'composer.detect',
					level: 'warn',
					message: 'Detect phase reported pending readiness.',
					context: expect.objectContaining({
						status: 'pending',
						message: 'Composer dependencies missing.',
					}),
				}),
				expect.objectContaining({
					namespace: 'composer.prepare',
					level: 'info',
					message: 'Prepare phase started.',
				}),
				expect.objectContaining({
					namespace: 'composer.prepare',
					level: 'info',
					message: 'Prepare phase completed.',
				}),
				expect.objectContaining({
					namespace: 'composer.execute',
					level: 'info',
					message: 'Execute phase started.',
				}),
				expect.objectContaining({
					namespace: 'composer.execute',
					level: 'info',
					message: 'Execute phase completed.',
				}),
				expect.objectContaining({
					namespace: 'composer.confirm',
					level: 'info',
					message: 'Confirm phase started.',
				}),
				expect.objectContaining({
					namespace: 'composer.confirm',
					level: 'info',
					message: 'Confirm phase reported ready.',
					context: expect.objectContaining({
						status: 'ready',
						message: 'Composer ready.',
					}),
				}),
				expect.objectContaining({
					namespace: 'composer',
					level: 'info',
					message: 'Readiness helper completed.',
					context: expect.objectContaining({ status: 'updated' }),
				}),
			])
		);
	});

	it('logs ready helpers without pending phases', async () => {
		const registry = createReadinessRegistry();
		const records = createRecordingReporter();

		registry.register(
			createReadinessHelper({
				key: 'git',
				metadata: { label: 'Ready logging helper' },
				async detect() {
					return {
						status: 'ready',
						message: 'Git repository clean.',
						state: null,
					} satisfies ReadinessDetection<null>;
				},
				async confirm() {
					return {
						status: 'ready',
						message: 'Git ready.',
						state: null,
					} satisfies ReadinessConfirmation<null>;
				},
			})
		);

		const plan = registry.plan(['git']);
		await plan.run(buildContext({ reporter: records.reporter }));

		expect(records.records).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					namespace: 'git.detect',
					level: 'info',
					message: 'Detect phase started.',
				}),
				expect.objectContaining({
					namespace: 'git.detect',
					level: 'info',
					message: 'Detect phase reported ready.',
				}),
				expect.objectContaining({
					namespace: 'git.confirm',
					level: 'info',
					message: 'Confirm phase reported ready.',
				}),
				expect.objectContaining({
					namespace: 'git',
					level: 'info',
					message: 'Readiness helper completed.',
					context: expect.objectContaining({ status: 'ready' }),
				}),
			])
		);
	});

	it('logs blocked helpers and skips confirmation', async () => {
		const registry = createReadinessRegistry();
		const records = createRecordingReporter();

		registry.register(
			createReadinessHelper({
				key: 'composer',
				metadata: { label: 'Blocked helper' },
				async detect() {
					return {
						status: 'blocked',
						message: 'Composer missing.',
						state: null,
					} satisfies ReadinessDetection<null>;
				},
				async confirm() {
					return {
						status: 'pending',
						state: null,
					} satisfies ReadinessConfirmation<null>;
				},
			})
		);

		const plan = registry.plan(['composer']);
		await plan.run(buildContext({ reporter: records.reporter }));

		expect(records.records).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					namespace: 'composer.detect',
					level: 'info',
					message: 'Detect phase started.',
				}),
				expect.objectContaining({
					namespace: 'composer.detect',
					level: 'warn',
					message: 'Detect phase blocked readiness.',
				}),
				expect.objectContaining({
					namespace: 'composer',
					level: 'warn',
					message: 'Readiness helper blocked.',
					context: expect.objectContaining({ status: 'blocked' }),
				}),
			])
		);

		expect(
			records.records.some((entry) =>
				entry.namespace.startsWith('composer.confirm')
			)
		).toBe(false);
	});

	it('warns when confirmation reports pending readiness', async () => {
		const registry = createReadinessRegistry();
		const records = createRecordingReporter();

		registry.register(
			createReadinessHelper({
				key: 'workspace-hygiene',
				metadata: { label: 'Workspace hygiene' },
				async detect() {
					return {
						status: 'ready',
						state: null,
					} satisfies ReadinessDetection<null>;
				},
				async confirm() {
					return {
						status: 'pending',
						message: 'Workspace requires review.',
						state: null,
					} satisfies ReadinessConfirmation<null>;
				},
			})
		);

		const plan = registry.plan(['workspace-hygiene']);
		await plan.run(buildContext({ reporter: records.reporter }));

		expect(records.records).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					namespace: 'workspace-hygiene.confirm',
					level: 'warn',
					message: 'Confirm phase reported pending readiness.',
				}),
				expect.objectContaining({
					namespace: 'workspace-hygiene',
					level: 'warn',
					message: 'Readiness helper pending follow-up.',
					context: expect.objectContaining({
						status: 'pending',
						message: 'Workspace requires review.',
					}),
				}),
			])
		);
	});
});
