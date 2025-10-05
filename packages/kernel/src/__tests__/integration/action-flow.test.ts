/**
 * @file Integration test covering defineAction orchestration with resources.
 *
 * Tests comprehensive action flows including:
 * - Resource integration and event emission
 * - Error handling and lifecycle events
 * - Policy enforcement
 * - Background job integration
 * - Cache invalidation
 * - Cross-tab vs tab-local scoping
 */

import { defineAction } from '../../actions/define';
import { defineResource } from '../../resource/define';
import * as cache from '../../resource/cache';

describe('Action Flow Integration', () => {
	let mockApiFetch: jest.Mock;
	let mockDoAction: jest.Mock;

	beforeEach(() => {
		mockApiFetch = jest.fn();
		mockDoAction = jest.fn();

		const windowWithWp = window as Window & {
			wp?: {
				data?: unknown;
				apiFetch?: jest.Mock;
				hooks?: { doAction: jest.Mock };
			};
		};

		const existingWp = windowWithWp.wp || {};
		(window as unknown as { wp?: unknown }).wp = {
			...existingWp,
			data: existingWp.data,
			apiFetch: mockApiFetch as unknown,
			hooks: { doAction: mockDoAction } as unknown,
		};
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('executes resource create flow and emits canonical events', async () => {
		const createdThing = { id: 42, title: 'Created' };
		mockApiFetch.mockResolvedValue(createdThing);
		const invalidateSpy = jest
			.spyOn(cache, 'invalidate')
			.mockImplementation(() => undefined);

		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				create: { path: '/wpk/v1/things', method: 'POST' },
			},
		});

		const CreateThing = defineAction<
			{ data: { title: string } },
			{ id: number; title: string }
		>('Thing.Create', async (ctx, { data }) => {
			const created = await resource.create!(data);
			const events = resource.events!;
			ctx.emit(events.created, { id: created.id, data: created });
			ctx.invalidate(['thing', 'list']);
			return created;
		});

		const result = await CreateThing({ data: { title: 'Created' } });

		expect(result).toEqual(createdThing);
		expect(mockApiFetch).toHaveBeenCalledWith({
			path: '/wpk/v1/things',
			method: 'POST',
			data: { title: 'Created' },
			parse: true,
		});
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({ actionName: 'Thing.Create' })
		);
		const events = resource.events!;
		expect(mockDoAction).toHaveBeenCalledWith(events.created, {
			id: createdThing.id,
			data: createdThing,
		});
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.complete',
			expect.objectContaining({
				actionName: 'Thing.Create',
				result: createdThing,
			})
		);
		expect(invalidateSpy).toHaveBeenCalledWith(
			['thing', 'list'],
			undefined
		);

		invalidateSpy.mockRestore();
	});

	it('handles errors and emits wpk.action.error lifecycle event', async () => {
		const errorMessage = 'Network failure';
		mockApiFetch.mockRejectedValue(new Error(errorMessage));

		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				update: { path: '/wpk/v1/things/:id', method: 'PUT' },
			},
		});

		const UpdateThing = defineAction<
			{ id: number; updates: { title: string } },
			{ id: number; title: string }
		>('Thing.Update', async (ctx, { id, updates }) => {
			const updated = await resource.update!(id, updates);
			ctx.invalidate([`thing:${id}`, 'list']);
			return updated;
		});

		await expect(
			UpdateThing({ id: 1, updates: { title: 'New Title' } })
		).rejects.toThrow();

		// Verify error lifecycle event was emitted
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.objectContaining({
				actionName: 'Thing.Update',
				phase: 'error',
			})
		);
	});

	it('integrates with policy enforcement', async () => {
		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				update: { path: '/wpk/v1/things/:id', method: 'PUT' },
			},
		});

		let policyCalled = false;
		const mockPolicy = {
			assert: (capability: string) => {
				policyCalled = true;
				expect(capability).toBe('edit_things');
				// Don't throw - allow the action to proceed
			},
			can: () => true,
		};

		// Set up runtime with custom policy
		(globalThis as any).__WP_KERNEL_ACTION_RUNTIME__ = {
			policy: mockPolicy,
		};

		mockApiFetch.mockResolvedValue({ id: 1, title: 'Updated' });

		const UpdateThing = defineAction<
			{ id: number; updates: { title: string } },
			{ id: number; title: string }
		>('Thing.Update', async (ctx, { id, updates }) => {
			ctx.policy.assert('edit_things', undefined);
			const result = await resource.update!(id, updates);
			ctx.invalidate([`thing:${id}`, 'list']);
			return result;
		});

		await UpdateThing({ id: 1, updates: { title: 'Updated' } });

		expect(policyCalled).toBe(true);

		// Cleanup
		delete (globalThis as any).__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('integrates with background jobs', async () => {
		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				create: { path: '/wpk/v1/things', method: 'POST' },
			},
		});

		let jobEnqueued = false;
		const mockJobs = {
			enqueue: async (jobName: string, payload: any) => {
				jobEnqueued = true;
				expect(jobName).toBe('ProcessNewThing');
				expect(payload).toEqual({ thingId: 42 });
			},
			wait: async () => ({}),
		};

		// Set up runtime with custom jobs
		(globalThis as any).__WP_KERNEL_ACTION_RUNTIME__ = {
			jobs: mockJobs,
		};

		const createdThing = { id: 42, title: 'Created' };
		mockApiFetch.mockResolvedValue(createdThing);

		const CreateThing = defineAction<
			{ data: { title: string } },
			{ id: number; title: string }
		>('Thing.Create', async (ctx, { data }) => {
			const created = await resource.create!(data);
			await ctx.jobs.enqueue('ProcessNewThing', { thingId: created.id });
			return created;
		});

		await CreateThing({ data: { title: 'Created' } });

		expect(jobEnqueued).toBe(true);

		// Cleanup
		delete (globalThis as any).__WP_KERNEL_ACTION_RUNTIME__;
	});

	it('respects tab-local scope configuration', async () => {
		const resource = defineResource<{ id: number; title: string }>({
			name: 'thing',
			routes: {
				create: { path: '/wpk/v1/things', method: 'POST' },
			},
		});

		const createdThing = { id: 42, title: 'Created' };
		mockApiFetch.mockResolvedValue(createdThing);

		const CreateThing = defineAction<
			{ data: { title: string } },
			{ id: number; title: string }
		>(
			'Thing.CreateLocal',
			async (_ctx, { data }) => {
				const created = await resource.create!(data);
				return created;
			},
			{ scope: 'tabLocal' }
		);

		await CreateThing({ data: { title: 'Created' } });

		// Verify lifecycle events still emitted
		expect(mockDoAction).toHaveBeenCalledWith(
			'wpk.action.start',
			expect.objectContaining({
				actionName: 'Thing.CreateLocal',
				scope: 'tabLocal',
				bridged: false, // tab-local actions are not bridged by default
			})
		);
	});
});
