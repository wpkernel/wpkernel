import {
	createWPKernelRuntime,
	createConfig,
	renderResourceDataView,
	flushDataViews,
	type RuntimeWithDataViews,
} from '../../../tests/ResourceDataView.test-support';

describe('ResourceDataView permissions', () => {
	function renderWithCapability(runtime: RuntimeWithDataViews) {
		const config = createConfig({
			screen: {
				menu: {
					capability: 'jobs.view',
					slug: '',
					title: '',
				},
			},
		});

		renderResourceDataView({ runtime, config });
	}

	it.skip('handles menu capability check failures without emitting events', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => false),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		renderWithCapability(runtime);
		await flushDataViews();

		expect(runtime.dataviews.events.permissionDenied).toHaveBeenCalledWith(
			expect.objectContaining({
				resource: 'jobs',
				capability: 'jobs.view',
				source: 'screen',
				reason: 'forbidden',
			})
		);
	});

	it.skip('emits runtime-missing events when capability runtime is unavailable', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = undefined;

		renderWithCapability(runtime);
		await flushDataViews();

		expect(
			runtime.dataviews.events.permissionDenied
		).not.toHaveBeenCalled();
	});

	it.skip('handles capability check errors without emitting permission events', async () => {
		const runtime = createWPKernelRuntime();
		runtime.capabilities = {
			capability: {
				can: jest.fn(() => Promise.reject(new Error('nope'))),
			},
		} as unknown as RuntimeWithDataViews['capabilities'];

		renderWithCapability(runtime);
		await flushDataViews(2);

		expect(runtime.dataviews.events.permissionDenied).toHaveBeenCalledWith(
			expect.objectContaining({
				resource: 'jobs',
				capability: 'jobs.view',
				source: 'screen',
				reason: 'error',
			})
		);
	});
});
