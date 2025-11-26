import {
	DataViewsMock,
	createWPKernelRuntime,
	type RuntimeWithDataViews,
	flushDataViews,
	buildActionConfig,
	renderActionScenario,
	createAction,
	createDataViewsTestController,
	createNoticeRegistry,
	type DefaultActionInput,
} from '../../../tests/ResourceDataView.test-support';
import { act } from 'react';
import { WPKernelError } from '@wpkernel/core/error';
import type { CacheKeyPattern } from '@wpkernel/core/resource';
import type { ResourceDataViewActionConfig } from '../types';

describe('ResourceDataView actions', () => {
	beforeEach(() => {
		DataViewsMock.mockClear();
	});

	it('executes actions and invalidates caches', async () => {
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });
		const resourceInvalidate = jest.fn();
		const { runtime, getActionEntries } = renderActionScenario({
			items: [{ id: 1 }, { id: 2 }],
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
			resourceOverrides: { invalidate: resourceInvalidate },
		});

		const [firstAction] = getActionEntries();
		expect(firstAction).toBeDefined();

		await act(async () => {
			await firstAction!.callback([{ id: 1 }, { id: 2 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(actionImpl).toHaveBeenCalledWith({ selection: ['1', '2'] });
		expect(runtime.invalidate).toHaveBeenCalledWith([['jobs', 'list']]);
		expect(resourceInvalidate).toHaveBeenCalledWith([['jobs', 'list']]);
		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: true,
			})
		);
		expect(runtime.dataviews.reporter.info).toHaveBeenCalledWith(
			'DataViews action completed',
			expect.objectContaining({ actionId: 'delete' })
		);
	});

	it('disables actions when capabilities deny access', async () => {
		const runtime = createWPKernelRuntime();
		const capabilityCan = jest.fn().mockResolvedValue(false);
		runtime.capabilities = {
			capability: {
				can: capabilityCan,
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				capability: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		await flushDataViews();

		const actions = getActionEntries();
		expect(actions).toHaveLength(1);
		expect(actions[0]?.disabled).toBe(true);
		expect(capabilityCan).toHaveBeenCalledWith('jobs.delete');
	});

	it('omits denied actions when disabledWhenDenied is false', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => false),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		const { getDataViewProps } = renderActionScenario({
			runtime,
			action: {
				capability: 'jobs.delete',
				disabledWhenDenied: false,
			},
		});

		await flushDataViews();

		expect(getDataViewProps().actions).toEqual([]);
	});

	it('warns when capability evaluation promise rejects', async () => {
		const runtime = createWPKernelRuntime();
		const warnSpy = runtime.dataviews.reporter.warn as jest.Mock;
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => Promise.reject(new Error('nope'))),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		renderActionScenario({
			runtime,
			action: {
				capability: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		await flushDataViews(2);

		expect(warnSpy).toHaveBeenCalledWith(
			'Capability evaluation failed for DataViews action',
			expect.objectContaining({ capability: 'jobs.delete' })
		);
	});

	it('logs errors when capability evaluation throws synchronously', () => {
		const runtime = createWPKernelRuntime();
		const errorSpy = runtime.dataviews.reporter.error as jest.Mock;
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => {
					throw new Error('boom');
				}),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		renderActionScenario({
			runtime,
			action: {
				capability: 'jobs.delete',
			},
		});

		expect(errorSpy).toHaveBeenCalledWith(
			'Capability evaluation threw an error',
			expect.objectContaining({
				error: expect.any(WPKernelError),
				capability: 'jobs.delete',
				resource: 'jobs',
			})
		);
	});

	it('respects invalidateOnSuccess overrides', async () => {
		const runtime = createWPKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });
		const resourceInvalidate = jest.fn();
		const invalidate = jest.fn();
		runtime.invalidate = invalidate;

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				invalidateOnSuccess: () => false,
			},
			resourceOverrides: { invalidate: resourceInvalidate },
		});

		const [firstAction] = getActionEntries();
		expect(firstAction).toBeDefined();

		await act(async () => {
			await firstAction!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(invalidate).not.toHaveBeenCalled();
		expect(resourceInvalidate).not.toHaveBeenCalled();
	});

	it('disables actions when no capability runtime is available', () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = undefined;

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				capability: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		const actions = getActionEntries();
		expect(actions).toHaveLength(1);
		const [firstAction] = actions;
		expect(firstAction).toBeDefined();
		expect(firstAction!.disabled).toBe(true);
	});

	it('disables capability-gated actions when capability runtime is not available', () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = undefined;

		const { getActionEntries } = renderActionScenario({
			runtime,
			actions: [
				buildActionConfig({
					capability: 'jobs.delete',
					disabledWhenDenied: true,
				}),
				buildActionConfig({
					id: 'edit',
					label: 'Edit',
					capability: 'jobs.edit',
					disabledWhenDenied: true,
				}),
			],
		});

		const actions = getActionEntries();
		expect(actions).toHaveLength(2);
		const [firstAction, secondAction] = actions;
		expect(firstAction).toBeDefined();
		expect(secondAction).toBeDefined();
		expect(firstAction!.disabled).toBe(true);
		expect(secondAction!.disabled).toBe(true);
	});

	it('emits runtime-missing permission events when capability runtime is absent', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = undefined;

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				capability: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		const [actionEntry] = getActionEntries();
		expect(actionEntry).toBeDefined();

		await act(async () => {
			await actionEntry!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.dataviews.events.permissionDenied).toHaveBeenCalledWith(
			expect.objectContaining({
				resource: 'jobs',
				actionId: 'delete',
				reason: 'runtime-missing',
				source: 'action',
				selection: ['1'],
			})
		);
	});

	it('keeps capability-free actions enabled even with capability runtime present', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => Promise.resolve(true)),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		const { getActionEntries } = renderActionScenario({
			runtime,
			actions: [
				buildActionConfig({ capability: 'jobs.delete' }),
				buildActionConfig({
					id: 'view',
					label: 'View',
				}),
			],
		});

		await flushDataViews();

		const actions = getActionEntries();
		expect(actions).toHaveLength(2);
		const [firstAction, secondAction] = actions;
		expect(firstAction).toBeDefined();
		expect(secondAction).toBeDefined();
		expect(firstAction!.disabled).toBe(false);
		expect(secondAction!.disabled).toBe(false);
	});

	it('emits a pending event while capability resolution is in progress', async () => {
		const runtime = createWPKernelRuntime();
		let resolveCapability: ((value: boolean) => void) | undefined;
		runtime.capabilities = {
			capability: {
				can: jest.fn(
					() =>
						new Promise<boolean>((resolve) => {
							resolveCapability = resolve;
						})
				),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		const actionImpl = jest.fn();
		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				capability: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		const [pendingAction] = getActionEntries();
		expect(pendingAction).toBeDefined();

		await act(async () => {
			await pendingAction!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: false,
				reason: 'capability-pending',
			})
		);
		expect(runtime.dataviews.events.permissionDenied).toHaveBeenCalledWith(
			expect.objectContaining({
				resource: 'jobs',
				actionId: 'delete',
				reason: 'pending',
				source: 'action',
				selection: ['1'],
			})
		);
		expect(actionImpl).not.toHaveBeenCalled();

		resolveCapability?.(true);
		await flushDataViews();
	});

	it('warns when executing a denied capability-gated action', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => Promise.resolve(false)),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		const actionImpl = jest.fn();
		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				capability: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		await flushDataViews();

		const [deniedAction] = getActionEntries();

		await act(async () => {
			await deniedAction!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: false,
				reason: 'capability-denied',
			})
		);
		expect(runtime.dataviews.events.permissionDenied).toHaveBeenCalledWith(
			expect.objectContaining({
				resource: 'jobs',
				actionId: 'delete',
				reason: 'forbidden',
				source: 'action',
				selection: ['1'],
			})
		);
		expect(runtime.dataviews.reporter.warn).toHaveBeenCalledWith(
			'DataViews action blocked by capability',
			expect.objectContaining({ actionId: 'delete' })
		);
		expect(actionImpl).not.toHaveBeenCalled();
	});

	it('emits notices on successful actions', async () => {
		const { registry, createNotice } = createNoticeRegistry();
		const runtime = createWPKernelRuntime({ registry });
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
		});

		const [actionEntry] = getActionEntries();
		await act(async () => {
			await actionEntry!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(createNotice).toHaveBeenCalledWith(
			'success',
			'“Delete” - completed successfully.',
			expect.objectContaining({
				context: 'wpkernel/dataviews',
				id: 'wp-kernel/dataviews/jobs/delete/success',
			})
		);
	});

	it('aggregates bulk selection notices into a single success message', async () => {
		const { registry, createNotice } = createNoticeRegistry();
		const runtime = createWPKernelRuntime({ registry });
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
		});

		const [actionEntry] = getActionEntries();
		await act(async () => {
			await actionEntry!.callback([{ id: 1 }, { id: 2 }, { id: 3 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(createNotice).toHaveBeenCalledWith(
			'success',
			'“Delete” - completed for 3 items.',
			expect.objectContaining({
				context: 'wpkernel/dataviews',
				id: 'wp-kernel/dataviews/jobs/delete/success',
			})
		);
	});

	it('emits notices on failing actions', async () => {
		const { registry, createNotice } = createNoticeRegistry();
		const runtime = createWPKernelRuntime({ registry });
		const error = new WPKernelError('ServerError', {
			message: 'Request failed',
		});
		const actionImpl = jest.fn().mockRejectedValue(error);

		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
		});

		const [actionEntry] = getActionEntries();

		await expect(
			actionEntry!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			})
		).rejects.toMatchObject({ message: 'Request failed' });

		expect(createNotice).toHaveBeenCalledWith(
			'error',
			'“Delete” - failed: Request failed',
			expect.objectContaining({
				context: 'wpkernel/dataviews',
				id: 'wp-kernel/dataviews/jobs/delete/failure',
			})
		);
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'DataViews action failed',
			expect.objectContaining({ actionId: 'delete' })
		);
	});

	it('emits an empty-selection action event', async () => {
		const runtime = createWPKernelRuntime();

		const { getActionEntries } = renderActionScenario({ runtime });

		const [actionEntry] = getActionEntries();

		await act(async () => {
			await actionEntry!.callback([], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.dataviews.events.actionTriggered).toHaveBeenCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: false,
				reason: 'empty-selection',
			})
		);
	});

	it('normalizes mixed selection flows via the controller helper', async () => {
		type MixedItem = {
			id: string | number;
			slug?: string;
			legacyId?: number;
		};

		const items: MixedItem[] = [
			{ id: 1, slug: 'alpha' },
			{ id: 2, slug: 'beta', legacyId: 22 },
			{ id: 0 },
			{ id: 'custom-3' },
			{ id: 4, legacyId: 99 },
			{ id: 5 },
		];

		const runtime = createWPKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });

		type MixedActionConfig = ResourceDataViewActionConfig<
			MixedItem,
			DefaultActionInput,
			unknown
		>;

		const buildMetaImpl = jest.fn(
			({
				selection,
			}: Parameters<NonNullable<MixedActionConfig['buildMeta']>>[0]) => ({
				selectionCount: selection.length,
			})
		);

		const scenario = renderActionScenario<MixedItem>({
			runtime,
			items,
			configOverrides: {
				getItemId: (item: MixedItem) => {
					if (item.slug) {
						return `${item.slug}-slug`;
					}
					if (typeof item.legacyId === 'number') {
						return `legacy-${item.legacyId}`;
					}
					if (typeof item.id === 'number') {
						if (item.id === 5) {
							return '';
						}
						return `num-${item.id}`;
					}
					if (typeof item.id === 'string') {
						return item.id;
					}
					return '';
				},
			},
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				buildMeta: ((context) =>
					buildMetaImpl(context)) as MixedActionConfig['buildMeta'],
			},
		});

		const controller = createDataViewsTestController(scenario);

		const first = items[0]!;
		const second = items[1]!;
		const third = items[2]!;
		const fourth = items[3]!;
		const fifth = items[4]!;
		const sixth = items[5]!;

		controller.setSelection(['manual-only']);
		controller.setSelectionFromItems([third, sixth]);

		const mixedSelection = controller.getProps().selection ?? [];

		controller.setSelection(['manual-only', ...mixedSelection, '42']);

		await flushDataViews();

		const [entry] = scenario.getActionEntries();
		const onActionPerformed = jest.fn();

		const selectedItems = [first, second, third, fourth, fifth, sixth];

		await act(async () => {
			await entry!.callback(selectedItems, {
				onActionPerformed,
			});
		});

		const expectedSelection = [
			'alpha-slug',
			'beta-slug',
			'num-0',
			'custom-3',
			'legacy-99',
		];

		expect(actionImpl).toHaveBeenCalledWith({
			selection: expectedSelection,
		});
		expect(buildMetaImpl).toHaveBeenCalledWith({
			selection: expectedSelection,
			items: selectedItems,
		});
		expect(
			runtime.dataviews.events.actionTriggered
		).toHaveBeenLastCalledWith(
			expect.objectContaining({
				actionId: 'delete',
				permitted: true,
				selection: expectedSelection,
				meta: { selectionCount: expectedSelection.length },
			})
		);
		expect(onActionPerformed).toHaveBeenCalledWith(selectedItems);
	});

	it('normalizes unexpected errors thrown by action callbacks', async () => {
		const runtime = createWPKernelRuntime();

		const actionImpl = jest.fn().mockRejectedValue(new Error('boom'));
		const { getActionEntries } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
			},
		});

		const [actionEntry] = getActionEntries();

		const rejection = await actionEntry!
			.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			})
			.catch((error: unknown) => error);

		expect(rejection).toBeInstanceOf(WPKernelError);
		expect((rejection as WPKernelError).code).toBe('UnknownError');
		expect(runtime.dataviews.reporter.error).toHaveBeenCalledWith(
			'Unhandled error thrown by DataViews action',
			expect.objectContaining({ selection: ['1'] })
		);
	});

	it('invalidates custom cache patterns returned by actions', async () => {
		const runtime = createWPKernelRuntime();
		const actionImpl = jest.fn().mockResolvedValue({ ok: true });

		const customPatterns: CacheKeyPattern[] = [['jobs', 'custom']];
		const { getActionEntries, resource } = renderActionScenario({
			runtime,
			action: {
				action: createAction(actionImpl, {
					scope: 'crossTab',
					bridged: true,
				}),
				invalidateOnSuccess: () => customPatterns,
			},
		});

		const [actionEntry] = getActionEntries();

		await act(async () => {
			await actionEntry!.callback([{ id: 1 }], {
				onActionPerformed: jest.fn(),
			});
		});

		expect(runtime.invalidate).toHaveBeenCalledWith(customPatterns);
		expect(resource.invalidate).toHaveBeenCalledWith(customPatterns);
	});

	it('ignores capability resolution when component unmounts before completion', async () => {
		const runtime = createWPKernelRuntime();
		let resolveCapability: ((value: boolean) => void) | undefined;
		runtime.capabilities = {
			capability: {
				can: jest.fn(
					() =>
						new Promise<boolean>((resolve) => {
							resolveCapability = resolve;
						})
				),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		const { renderResult } = renderActionScenario({
			runtime,
			action: {
				capability: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		renderResult.unmount();
		resolveCapability?.(true);

		await flushDataViews();

		expect(runtime.dataviews.reporter.warn).not.toHaveBeenCalled();
	});

	it('ignores capability rejections after unmount', async () => {
		const runtime = createWPKernelRuntime();
		let rejectCapability: ((reason?: unknown) => void) | undefined;
		runtime.capabilities = {
			capability: {
				can: jest.fn(
					() =>
						new Promise<boolean>((_, reject) => {
							rejectCapability = reject;
						})
				),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		const { renderResult: rejectionRender } = renderActionScenario({
			runtime,
			action: {
				capability: 'jobs.delete',
				disabledWhenDenied: true,
			},
		});

		rejectionRender.unmount();
		rejectCapability?.(new Error('denied'));

		await flushDataViews();

		expect(runtime.dataviews.reporter.warn).not.toHaveBeenCalled();
	});
});
