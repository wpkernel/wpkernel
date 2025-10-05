import type { ActionErrorEvent } from '../../actions/types';
import { KernelError } from '../../error/KernelError';
import { kernelEventsPlugin } from '../plugins/events';
import type { Reporter } from '../../reporter';
import type { KernelRegistry } from '../types';

function createRegistryMock(): KernelRegistry & { createNotice: jest.Mock } {
	const createNotice = jest.fn();
	const dispatch = jest.fn().mockReturnValue({ createNotice });
	return {
		dispatch,
		createNotice,
	} as unknown as KernelRegistry & { createNotice: jest.Mock };
}

describe('kernelEventsPlugin', () => {
	beforeEach(() => {
		(window.wp?.hooks?.addAction as jest.Mock | undefined)?.mockReset?.();
		(
			window.wp?.hooks?.removeAction as jest.Mock | undefined
		)?.mockReset?.();
	});

	it('dispatches notices and reports errors from action events', () => {
		const registry = createRegistryMock();
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as jest.Mocked<Reporter>;
		reporter.child.mockReturnValue(reporter);

		let eventHandler: ((event: ActionErrorEvent) => void) | undefined;
		const addAction = window.wp?.hooks?.addAction as jest.Mock;
		addAction.mockImplementation((hookName, _namespace, handler) => {
			if (hookName === 'wpk.action.error') {
				eventHandler = handler as (event: ActionErrorEvent) => void;
			}
		});

		const middleware = kernelEventsPlugin({
			reporter,
			registry,
		});

		const next = jest.fn();
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'IGNORE',
		});

		const error = new Error('Network failed');
		eventHandler?.({
			error,
			actionName: 'CreatePost',
			requestId: 'act_123',
			namespace: 'acme',
			phase: 'error',
			durationMs: 25,
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
		} as ActionErrorEvent);

		expect(registry.createNotice).toHaveBeenCalledWith(
			'error',
			'Network failed',
			expect.objectContaining({ id: 'act_123', isDismissible: true })
		);
		expect(reporter.error).toHaveBeenCalledWith('Network failed', {
			action: 'CreatePost',
			namespace: 'acme',
			requestId: 'act_123',
			status: 'error',
		});

		middleware.destroy?.();
		expect(window.wp?.hooks?.removeAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.stringMatching(/^wpk\/notices\/\d+$/)
		);
	});

	it('maps KernelError codes to notice statuses', () => {
		const registry = createRegistryMock();
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as jest.Mocked<Reporter>;
		reporter.child.mockReturnValue(reporter);

		const addAction = window.wp?.hooks?.addAction as jest.Mock;
		let eventHandler: ((event: ActionErrorEvent) => void) | undefined;
		addAction.mockImplementation((hookName, _namespace, handler) => {
			if (hookName === 'wpk.action.error') {
				eventHandler = handler as (event: ActionErrorEvent) => void;
			}
		});

		const middleware = kernelEventsPlugin({ reporter, registry });
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'IGNORE',
		});

		eventHandler?.({
			error: new KernelError('PolicyDenied', { message: 'denied' }),
			actionName: 'CheckPolicy',
			requestId: 'act_warning',
			namespace: 'acme',
			phase: 'error',
			durationMs: 5,
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
		} as ActionErrorEvent);

		expect(registry.createNotice).toHaveBeenNthCalledWith(
			1,
			'warning',
			'denied',
			expect.objectContaining({ id: 'act_warning' })
		);

		eventHandler?.({
			error: new KernelError('ValidationError', { message: 'invalid' }),
			actionName: 'Validate',
			requestId: 'act_info',
			namespace: 'acme',
			phase: 'error',
			durationMs: 5,
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
		} as ActionErrorEvent);

		expect(registry.createNotice).toHaveBeenNthCalledWith(
			2,
			'info',
			'invalid',
			expect.objectContaining({ id: 'act_info' })
		);

		eventHandler?.({
			error: 'string failure',
			actionName: 'StringError',
			requestId: 'act_string',
			namespace: 'acme',
			phase: 'error',
			durationMs: 5,
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
		} as ActionErrorEvent);

		expect(registry.createNotice).toHaveBeenNthCalledWith(
			3,
			'error',
			'string failure',
			expect.objectContaining({ id: 'act_string' })
		);

		middleware.destroy?.();
	});

	it('creates unique namespaces for multiple plugin instances', () => {
		const addAction = window.wp?.hooks?.addAction as jest.Mock;
		const capturedNamespaces: string[] = [];

		addAction.mockImplementation((_hookName: string, namespace: string) => {
			capturedNamespaces.push(namespace);
		});

		const registry = createRegistryMock();

		// Create multiple instances
		const middleware1 = kernelEventsPlugin({ registry });
		const middleware2 = kernelEventsPlugin({ registry });
		const middleware3 = kernelEventsPlugin({ registry });

		// Trigger middleware creation to register handlers
		const next = jest.fn();
		middleware1({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'IGNORE',
		});
		middleware2({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'IGNORE',
		});
		middleware3({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'IGNORE',
		});

		// Verify all namespaces are unique
		expect(capturedNamespaces).toHaveLength(3);
		expect(new Set(capturedNamespaces).size).toBe(3);

		// Verify namespace format
		capturedNamespaces.forEach((ns) => {
			expect(ns).toMatch(/^wpk\/notices\/\d+$/);
		});
	});

	it('handles registries that cannot dispatch notices', () => {
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as jest.Mocked<Reporter>;
		reporter.child.mockReturnValue(reporter);

		const addAction = window.wp?.hooks?.addAction as jest.Mock;
		let eventHandler: ((event: ActionErrorEvent) => void) | undefined;
		addAction.mockImplementation((hookName, _namespace, handler) => {
			if (hookName === 'wpk.action.error') {
				eventHandler = handler as (event: ActionErrorEvent) => void;
			}
		});

		const middleware = kernelEventsPlugin({
			reporter,
			registry: undefined,
		});

		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'IGNORE',
		});

		eventHandler?.({
			error: { reason: 'totally-unknown' },
			actionName: 'UnknownAction',
			requestId: 'fallback_1',
			namespace: 'acme',
			phase: 'error',
			durationMs: 5,
			scope: 'crossTab',
			bridged: false,
			timestamp: Date.now(),
		} as ActionErrorEvent);

		expect(reporter.error).toHaveBeenCalledWith(
			'An unexpected error occurred',
			expect.objectContaining({
				action: 'UnknownAction',
				requestId: 'fallback_1',
				status: 'error',
			})
		);
	});

	it('swallows registry dispatch errors when notices cannot be resolved', () => {
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as jest.Mocked<Reporter>;
		reporter.child.mockReturnValue(reporter);

		const dispatch = jest.fn(() => {
			throw new Error('dispatch failed');
		});

		const registry = { dispatch } as unknown as KernelRegistry;

		const addAction = window.wp?.hooks?.addAction as jest.Mock;
		let eventHandler: ((event: ActionErrorEvent) => void) | undefined;
		addAction.mockImplementation((hookName, _namespace, handler) => {
			if (hookName === 'wpk.action.error') {
				eventHandler = handler as (event: ActionErrorEvent) => void;
			}
		});

		const middleware = kernelEventsPlugin({ reporter, registry });
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'IGNORE',
		});

		expect(() =>
			eventHandler?.({
				error: new KernelError('UnknownError', { message: 'uh oh' }),
				actionName: 'FailingAction',
				requestId: 'fallback_2',
				namespace: 'acme',
				phase: 'error',
				durationMs: 12,
				scope: 'crossTab',
				bridged: false,
				timestamp: Date.now(),
			} as ActionErrorEvent)
		).not.toThrow();

		expect(dispatch).toHaveBeenCalledWith('core/notices');
		expect(reporter.error).toHaveBeenCalledWith(
			'uh oh',
			expect.any(Object)
		);
	});

	it('ignores registry responses without createNotice helpers', () => {
		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as jest.Mocked<Reporter>;
		reporter.child.mockReturnValue(reporter);

		const dispatch = jest.fn().mockReturnValue({});
		const registry = { dispatch } as unknown as KernelRegistry;

		const addAction = window.wp?.hooks?.addAction as jest.Mock;
		let eventHandler: ((event: ActionErrorEvent) => void) | undefined;
		addAction.mockImplementation((hookName, _namespace, handler) => {
			if (hookName === 'wpk.action.error') {
				eventHandler = handler as (event: ActionErrorEvent) => void;
			}
		});

		const middleware = kernelEventsPlugin({ reporter, registry });
		middleware({ dispatch: jest.fn(), getState: jest.fn() })(jest.fn())({
			type: 'IGNORE',
		});

		eventHandler?.({
			error: new KernelError('PolicyDenied', { message: 'denied' }),
			actionName: 'DeniedAction',
			requestId: 'fallback_3',
			namespace: 'acme',
			phase: 'error',
			durationMs: 8,
			scope: 'crossTab',
			bridged: true,
			timestamp: Date.now(),
		} as ActionErrorEvent);

		expect(dispatch).toHaveBeenCalledWith('core/notices');
		expect(reporter.error).toHaveBeenCalledWith(
			'denied',
			expect.any(Object)
		);
	});
});
