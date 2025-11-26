import { configureWPKernel } from '../configure-wpkernel';
import { createReporter } from '../../reporter';
import type { Reporter } from '../../reporter';
import { invalidate as invalidateCache } from '../../resource/cache';
import { WPKernelError } from '../../error/WPKernelError';
import type {
	WPKInstance,
	WPKernelRegistry,
	WPKernelUIRuntime,
	WPKernelUIAttach,
	UIIntegrationOptions,
} from '../types';
import {
	WPKernelEventBus,
	getWPKernelEventBus,
	setWPKernelEventBus,
	type CustomKernelEvent,
} from '../../events/bus';
import { createActionMiddleware } from '../../actions/middleware';
import { wpkEventsPlugin } from '../plugins/events';
import { getNamespace as detectNamespace } from '../../namespace/detect';
import type { ResourceConfig } from '../../resource/types';
import { resetReporterResolution } from '../../reporter/resolve';

function createMockReporter(): jest.Mocked<Reporter> {
	const reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child: jest.fn(),
	} as unknown as jest.Mocked<Reporter>;

	reporter.child.mockReturnValue(reporter);

	return reporter;
}

jest.mock('../../actions/middleware', () => ({
	createActionMiddleware: jest.fn(() =>
		jest.fn(() => jest.fn((action) => action))
	),
}));

jest.mock('../../reporter', () => ({
	createReporter: jest.fn(),
	createNoopReporter: jest.fn(createMockReporter),
	setWPKernelReporter: jest.fn(),
	getWPKernelReporter: jest.fn(() => undefined),
	clearWPKReporter: jest.fn(),
}));

jest.mock('../plugins/events', () => ({
	wpkEventsPlugin: jest.fn(() => ({ destroy: jest.fn() })),
}));

jest.mock('../../resource/cache', () => ({
	invalidate: jest.fn(),
}));

jest.mock('../../namespace/detect', () => ({
	getNamespace: jest.fn(() => 'detected.namespace'),
}));

type Middleware = ReturnType<typeof createActionMiddleware>;

describe('configureWPKernel', () => {
	const actionMiddleware: Middleware = jest
		.fn()
		.mockImplementation((next) => (action: unknown) => next(action));
	let mockReporter: jest.Mocked<Reporter>;
	const eventMiddleware = { destroy: jest.fn() };
	let originalSilentFlag: string | undefined;

	beforeEach(() => {
		jest.clearAllMocks();
		resetReporterResolution();
		originalSilentFlag = process.env.WPK_SILENT_REPORTERS;
		delete process.env.WPK_SILENT_REPORTERS;
		mockReporter = createMockReporter();
		(createActionMiddleware as jest.Mock).mockReturnValue(actionMiddleware);
		(createReporter as jest.Mock).mockReturnValue(mockReporter);
		(wpkEventsPlugin as jest.Mock).mockReturnValue(eventMiddleware);
		(invalidateCache as jest.Mock).mockImplementation(() => undefined);
		globalThis.getWPData = jest.fn();
		setWPKernelEventBus(new WPKernelEventBus());
	});

	afterEach(() => {
		(actionMiddleware as jest.Mock).mockReset();
		eventMiddleware.destroy.mockReset();
		if (typeof originalSilentFlag === 'undefined') {
			delete process.env.WPK_SILENT_REPORTERS;
		} else {
			process.env.WPK_SILENT_REPORTERS = originalSilentFlag;
		}
	});

	it('installs middleware on the provided registry and cleans up on teardown', () => {
		const detachActions = jest.fn();
		const detachEvents = jest.fn();
		const customMiddleware = jest.fn();
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachActions)
				.mockReturnValueOnce(detachEvents),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as WPKernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const wpk = configureWPKernel({
			namespace: 'acme',
			registry,
			middleware: [customMiddleware],
			reporter: mockReporter,
		});

		expect(registry.__experimentalUseMiddleware).toHaveBeenCalledTimes(2);
		const [actionFactory] =
			registry.__experimentalUseMiddleware.mock.calls[0];
		const [eventsFactory] =
			registry.__experimentalUseMiddleware.mock.calls[1];

		expect(typeof actionFactory).toBe('function');
		expect(typeof eventsFactory).toBe('function');
		const installedActions = actionFactory();
		expect(installedActions).toEqual([actionMiddleware, customMiddleware]);

		const [installedEvents] = eventsFactory();
		expect(installedEvents).toBe(eventMiddleware);

		wpk.teardown();
		expect(detachActions).toHaveBeenCalled();
		expect(detachEvents).toHaveBeenCalled();
		expect(eventMiddleware.destroy).toHaveBeenCalled();
	});

	it('handles registries without middleware support gracefully', () => {
		const registry = {
			dispatch: jest.fn(),
		} as unknown as WPKernelRegistry;

		const wpk = configureWPKernel({ namespace: 'acme', registry });

		expect(
			(registry as { __experimentalUseMiddleware?: unknown })
				.__experimentalUseMiddleware
		).toBeUndefined();

		expect(() => wpk.teardown()).not.toThrow();
	});

	it('falls back to global registry when not provided', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as WPKernelRegistry;

		(globalThis.getWPData as jest.Mock).mockReturnValue(registry);

		configureWPKernel({ namespace: 'acme' });

		expect(globalThis.getWPData).toHaveBeenCalled();
		expect(registry.__experimentalUseMiddleware).toHaveBeenCalled();
	});

	it('handles missing global registry helpers gracefully', () => {
		delete (globalThis as { getWPData?: unknown }).getWPData;

		const wpk = configureWPKernel({ namespace: 'acme' });

		expect(wpk.getRegistry()).toBeUndefined();
	});

	it('delegates invalidate calls to resource cache with registry context', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as WPKernelRegistry;

		const wpk = configureWPKernel({ namespace: 'acme', registry });
		const patterns = ['post', 'list'];

		wpk.invalidate(patterns);
		expect(invalidateCache).toHaveBeenCalledWith(
			patterns,
			expect.objectContaining({
				registry,
				namespace: 'acme',
				reporter: expect.objectContaining({
					child: expect.any(Function),
				}),
			})
		);

		wpk.invalidate(patterns, { emitEvent: false });
		expect(invalidateCache).toHaveBeenCalledWith(
			patterns,
			expect.objectContaining({
				emitEvent: false,
				registry,
				namespace: 'acme',
				reporter: expect.objectContaining({
					child: expect.any(Function),
				}),
			})
		);
	});

	it('emits custom events through the event bus', () => {
		const wpk = configureWPKernel({ namespace: 'acme' });
		const payload = { foo: 'bar' };
		const bus = getWPKernelEventBus();
		const emitSpy = jest.spyOn(bus, 'emit');

		wpk.emit('wpk.event', payload);

		expect(emitSpy).toHaveBeenCalledWith('custom:event', {
			eventName: 'wpk.event',
			payload,
		});
	});

	it('throws WPKernelError when emit is called with invalid event name', () => {
		const wpk = configureWPKernel({ namespace: 'acme' });

		expect(() => wpk.emit('', {})).toThrow(WPKernelError);
	});

	it('reports UI disabled state by default', () => {
		const wpk = configureWPKernel({ namespace: 'acme' });

		expect(wpk.ui.isEnabled()).toBe(false);
	});

	it('attaches UI runtime when adapter is provided', () => {
		const runtime: WPKernelUIRuntime = {
			namespace: 'acme',
			reporter: mockReporter,
			registry: undefined,
			events: new WPKernelEventBus(),
			invalidate: jest.fn(),
			options: undefined,
		};
		const attach = jest.fn(() => runtime);

		const wpk = configureWPKernel({
			namespace: 'acme',
			ui: { attach },
		});

		expect(attach).toHaveBeenCalledWith(wpk, undefined);
		expect(wpk.hasUIRuntime()).toBe(true);
		expect(wpk.getUIRuntime()).toBe(runtime);
		expect(wpk.ui.isEnabled()).toBe(true);
	});

	it('allows manual UI runtime attachment', () => {
		const runtime: WPKernelUIRuntime = {
			namespace: 'acme',
			reporter: mockReporter,
			registry: undefined,
			events: new WPKernelEventBus(),
			invalidate: jest.fn(),
			options: undefined,
		};
		const attach = jest.fn(() => runtime);

		const wpk = configureWPKernel({ namespace: 'acme' });

		expect(wpk.hasUIRuntime()).toBe(false);

		const attached = wpk.attachUIBindings(attach);

		expect(attach).toHaveBeenCalledWith(wpk, undefined);
		expect(attached).toBe(runtime);
		expect(wpk.getUIRuntime()).toBe(runtime);
		expect(wpk.ui.isEnabled()).toBe(true);
	});

	it('exposes the shared event bus on the WPKernel instance', () => {
		const wpk = configureWPKernel({ namespace: 'acme' });
		const bus = getWPKernelEventBus();

		expect(wpk.events).toBe(bus);
	});

	it('exposes namespace, reporter, and registry accessors', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValue(() => undefined),
			dispatch: jest.fn(),
		} as unknown as WPKernelRegistry;

		const wpk = configureWPKernel({
			namespace: 'acme',
			registry,
			reporter: mockReporter,
		});

		expect(wpk.getNamespace()).toBe('acme');
		expect(wpk.getReporter()).toBe(mockReporter);
		expect(wpk.getRegistry()).toBe(registry);
	});

	it('falls back to detected namespace when none is provided', () => {
		const detectNamespaceMock = detectNamespace as jest.MockedFunction<
			typeof detectNamespace
		>;
		detectNamespaceMock.mockReturnValueOnce('fallback.namespace');

		const wpk = configureWPKernel();

		expect(detectNamespaceMock).toHaveBeenCalled();
		expect(wpk.getNamespace()).toBe('fallback.namespace');
	});

	it('handles middleware hooks that do not return teardown callbacks', () => {
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(undefined)
				.mockReturnValueOnce(undefined),
			dispatch: jest.fn(),
		} as unknown as WPKernelRegistry;

		(wpkEventsPlugin as jest.Mock).mockReturnValueOnce({});

		const wpk = configureWPKernel({ namespace: 'acme', registry });

		expect(() => wpk.teardown()).not.toThrow();
	});

	it('normalizes teardown errors that are not Error instances', () => {
		const detachActions = jest.fn(() => {
			throw 'cleanup-failed';
		});
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachActions)
				.mockReturnValueOnce(() => undefined),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as WPKernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';

		try {
			const wpk = configureWPKernel({ namespace: 'acme', registry });

			wpk.teardown();

			expect(mockReporter.error).toHaveBeenCalledWith(
				'WPKernel teardown failed',
				expect.any(Error)
			);
			const errorArg = mockReporter.error.mock.calls.pop()?.[1];
			expect(errorArg).toBeInstanceOf(Error);
			expect((errorArg as Error).message).toBe('cleanup-failed');
		} finally {
			process.env.NODE_ENV = originalEnv;
		}
	});

	it('reports errors thrown during teardown cleanup', () => {
		const detachActions = jest.fn(() => {
			throw new Error('cleanup failed');
		});
		const detachEvents = jest.fn();
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachActions)
				.mockReturnValueOnce(detachEvents),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as WPKernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';

		try {
			const wpk = configureWPKernel({
				namespace: 'acme',
				registry,
				reporter: mockReporter,
			});

			wpk.teardown();

			expect(mockReporter.error).toHaveBeenCalledWith(
				'WPKernel teardown failed',
				expect.any(Error)
			);
		} finally {
			process.env.NODE_ENV = originalEnv;
		}
	});

	it('defines resources using WPKernel reporter namespace', () => {
		const childReporter = createMockReporter();
		mockReporter.child.mockReturnValue(childReporter);

		const wpk = configureWPKernel({
			namespace: 'acme',
			reporter: mockReporter,
		});

		const resource = wpk.defineResource<{ id: number }>({
			name: 'thing',
			routes: {
				get: { path: '/acme/v1/things/:id', method: 'GET' },
			},
		});

		expect(mockReporter.child).toHaveBeenCalledWith('resource.thing');
		expect(resource.reporter).toBe(childReporter);
		expect(resource.storeKey).toBe('acme/thing');
	});

	it('respects custom resource reporters when provided', () => {
		const wpk = configureWPKernel({ namespace: 'acme' });
		const customReporter = createMockReporter();

		const resource = wpk.defineResource<{ id: number }>({
			name: 'thing',
			reporter: customReporter,
			routes: {
				list: { path: '/acme/v1/things', method: 'GET' },
			},
		});

		expect(resource.reporter).toBe(customReporter);
		expect(resource.routes.list).toBeDefined();
	});

	it('preserves explicit resource namespaces supplied in config', () => {
		const wpk = configureWPKernel({ namespace: 'acme' });

		const resource = wpk.defineResource<{ id: number }>({
			name: 'thing',
			namespace: 'custom',
			routes: {
				get: { path: '/custom/v1/things/:id', method: 'GET' },
			},
		});

		expect(resource.storeKey).toBe('custom/thing');
		expect(resource.events?.created).toBe('custom.thing.created');
	});

	it('wires DataViews options through configureWPKernel for auto-registration and events', () => {
		const controllers = new Map<string, unknown>();
		const registryEntries = new Map<string, unknown>();
		const customEvents: CustomKernelEvent[] = [];
		const attach = jest.fn(
			(wpk: WPKInstance, options?: UIIntegrationOptions) => {
				const runtime: WPKernelUIRuntime = {
					kernel: wpk,
					namespace: wpk.getNamespace(),
					reporter: wpk.getReporter(),
					events: wpk.events,
					options,
					invalidate: wpk.invalidate.bind(wpk),
					dataviews: {
						registry: registryEntries,
						controllers,
						preferences: {
							adapter: {
								get: jest.fn(),
								set: jest.fn(),
							},
							get: jest.fn(),
							set: jest.fn(),
							getScopeOrder: jest
								.fn()
								.mockReturnValue(['user', 'role', 'site']),
						},
						events: {
							registered: (payload: unknown) =>
								wpk.emit('ui:dataviews:registered', payload),
							unregistered: (payload: unknown) =>
								wpk.emit('ui:dataviews:unregistered', payload),
							viewChanged: (payload: unknown) =>
								wpk.emit('ui:dataviews:view-changed', payload),
							actionTriggered: (payload: unknown) =>
								wpk.emit(
									'ui:dataviews:action-triggered',
									payload
								),
						},
						reporter: wpk.getReporter(),
						options: {
							enable: true,
							autoRegisterResources: true,
						},
						getResourceReporter: () => wpk.getReporter(),
					},
				} as unknown as WPKernelUIRuntime;

				wpk.events.on('resource:defined', ({ resource }) => {
					const metadata = (
						resource as {
							ui?: {
								admin?: { dataviews?: Record<string, unknown> };
							};
						}
					).ui?.admin?.dataviews;

					if (!metadata) {
						return;
					}

					controllers.set(resource.name, metadata);
					registryEntries.set(resource.name, {
						resource: resource.name,
						preferencesKey: `${wpk.getNamespace()}/dataviews/${resource.name}`,
					});
				});

				wpk.events.on('custom:event', (payload: CustomKernelEvent) => {
					customEvents.push(payload);
				});

				return runtime;
			}
		);

		const wpk = configureWPKernel({
			namespace: 'acme',
			ui: {
				enable: true,
				attach: attach as unknown as WPKernelUIAttach,
				options: {
					dataviews: {
						enable: true,
						autoRegisterResources: true,
					},
				},
			},
		});

		expect(attach).toHaveBeenCalledWith(
			wpk,
			expect.objectContaining({
				dataviews: expect.objectContaining({ enable: true }),
			})
		);

		const resourceDefinition = {
			name: 'job',
			routes: { list: { path: '/acme/v1/jobs', method: 'GET' } },
			ui: {
				admin: {
					dataviews: {
						fields: [{ id: 'title', label: 'Title' }],
						defaultView: { type: 'table', fields: ['title'] },
						mapQuery: () => ({ search: undefined }),
					},
				},
			},
		};

		const resource = wpk.defineResource(
			resourceDefinition as unknown as ResourceConfig<
				unknown,
				{ search?: string }
			>
		);

		expect((resource as { ui?: unknown }).ui).toBeDefined();
		expect(controllers.get('job')).toBe(
			resourceDefinition.ui.admin.dataviews
		);
		expect(registryEntries.get('job')).toEqual(
			expect.objectContaining({ resource: 'job' })
		);

		const [firstCall] = attach.mock.results;

		expect(firstCall).toBeDefined();

		const runtimeWithDataViews = firstCall!.value as WPKernelUIRuntime & {
			dataviews?: { events: { viewChanged: (payload: unknown) => void } };
		};

		const dataviewsRuntime = runtimeWithDataViews.dataviews;

		expect(dataviewsRuntime).toBeDefined();

		dataviewsRuntime!.events.viewChanged({
			resource: 'job',
			viewState: {
				fields: ['title'],
				page: 1,
				perPage: 20,
			},
		});

		expect(customEvents).toContainEqual(
			expect.objectContaining({
				eventName: 'ui:dataviews:view-changed',
			})
		);
	});

	it('respects namespace embedded within resource name shorthand', () => {
		const wpk = configureWPKernel({ namespace: 'acme' });

		const resource = wpk.defineResource<{ id: number }>({
			name: 'custom:thing',
			routes: {
				get: { path: '/custom/v1/things/:id', method: 'GET' },
			},
		});

		expect(resource.storeKey).toBe('custom/thing');
		expect(resource.events?.updated).toBe('custom.thing.updated');
	});

	it('prefers explicit namespace when provided alongside shorthand name syntax', () => {
		const wpk = configureWPKernel({ namespace: 'acme' });

		const resource = wpk.defineResource<{ id: number }>({
			name: 'custom:thing',
			namespace: 'custom-explicit',
			routes: {
				create: {
					path: '/custom-explicit/v1/things',
					method: 'POST',
				},
			},
		});

		expect(resource.storeKey).toBe('custom-explicit/thing');
		expect(resource.events?.created).toBe('custom-explicit.thing.created');
	});
});
