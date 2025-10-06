import { KernelError } from '../../error/KernelError';
import { createReporter } from '../../reporter';
import { kernelEventsPlugin } from '../../data/plugins/events';
import { registerKernelStore } from '../../data/store';
import type { KernelRegistry } from '../../data/types';
import { ensureWpData } from '@test-utils/wp';
import type { ActionErrorEvent } from '../../actions/types';

function createActionErrorEvent(
	overrides: Partial<ActionErrorEvent> = {}
): ActionErrorEvent {
	return {
		phase: 'error',
		error: new KernelError('ValidationError', { message: 'test error' }),
		actionName: 'TestAction',
		requestId: 'test-req-id',
		namespace: 'test',
		durationMs: 10,
		scope: 'crossTab',
		bridged: false,
		timestamp: Date.now(),
		...overrides,
	};
}

describe('Integration: Kernel error reporting flow', () => {
	let createNotice: jest.Mock;
	let recordedHooks: Record<string, unknown[]>;
	let actionHandlers: Map<
		string,
		Map<string, (payload: ActionErrorEvent) => void>
	>;
	let originalConsoleError: typeof console.error;

	beforeEach(() => {
		const wpData = ensureWpData();
		createNotice = jest.fn();
		wpData.createReduxStore.mockReturnValue({
			name: 'wpk/integration-store',
		});
		wpData.dispatch.mockImplementation((storeName: string) => {
			if (storeName === 'core/notices') {
				return { createNotice };
			}
			return {};
		});

		recordedHooks = {};
		actionHandlers = new Map();

		if (!window.wp?.hooks) {
			throw new Error(
				'window.wp.hooks not initialized for integration test'
			);
		}

		window.wp.hooks.addAction = jest
			.fn()
			.mockImplementation(
				(
					hookName: string,
					namespace: string,
					handler: (payload: ActionErrorEvent) => void
				) => {
					const namespaceMap =
						actionHandlers.get(hookName) ?? new Map();
					namespaceMap.set(namespace, handler);
					actionHandlers.set(hookName, namespaceMap);
				}
			);

		window.wp.hooks.removeAction = jest
			.fn()
			.mockImplementation((hookName: string, namespace: string) => {
				const namespaceMap = actionHandlers.get(hookName);
				if (!namespaceMap) {
					return;
				}
				namespaceMap.delete(namespace);
				if (namespaceMap.size === 0) {
					actionHandlers.delete(hookName);
				}
			});

		window.wp.hooks.doAction = jest
			.fn()
			.mockImplementation((hookName: string, payload: unknown) => {
				const namespaceMap = actionHandlers.get(hookName);
				if (namespaceMap) {
					namespaceMap.forEach((handler) =>
						handler(payload as ActionErrorEvent)
					);
				}
				(recordedHooks[hookName] ||= []).push(payload);
			});

		originalConsoleError = console.error;
		console.error = jest.fn();
	});

	afterEach(() => {
		console.error = originalConsoleError;
		jest.restoreAllMocks();
	});

	it('creates notices and reporter output when action errors are emitted', () => {
		const registry = ensureWpData() as unknown as KernelRegistry;

		type IntegrationState = Record<string, never>;
		type IntegrationActions = {
			noop: () => void;
		};
		type IntegrationSelectors = {
			selectNothing: () => undefined;
		};

		registerKernelStore<
			'wpk/integration',
			IntegrationState,
			IntegrationActions,
			IntegrationSelectors
		>('wpk/integration', {
			reducer: jest.fn(
				(state: IntegrationState = {}, _action: unknown) => state
			),
			actions: {
				noop: jest.fn(),
			},
			selectors: {
				selectNothing: jest.fn(),
			},
		});

		const reporter = createReporter({
			namespace: 'integration',
			channel: 'all',
			level: 'info',
		});

		const middleware = kernelEventsPlugin({ reporter, registry });
		const next = jest.fn();
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'INIT',
		});

		const event = createActionErrorEvent({
			error: new KernelError('ValidationError', {
				message: 'Invalid input',
			}),
			actionName: 'SavePost',
			requestId: 'req-123',
			namespace: 'integration',
			durationMs: 42,
		});

		window.wp?.hooks?.doAction?.('wpk.action.error', event);

		expect(createNotice).toHaveBeenCalledWith(
			'info',
			'Invalid input',
			expect.objectContaining({ id: 'req-123', isDismissible: true })
		);

		expect(console.error).toHaveBeenCalledWith(
			'[integration]',
			'Invalid input',
			expect.objectContaining({
				action: 'SavePost',
				namespace: 'integration',
				requestId: 'req-123',
				status: 'info',
			})
		);
		expect(recordedHooks['integration.reporter.error']).toEqual([
			expect.objectContaining({
				message: 'Invalid input',
				context: expect.objectContaining({ status: 'info' }),
			}),
		]);

		middleware.destroy?.();

		window.wp?.hooks?.doAction?.('wpk.action.error', {
			...event,
			requestId: 'req-456',
		});

		expect(createNotice).toHaveBeenCalledTimes(1);
	});
});
