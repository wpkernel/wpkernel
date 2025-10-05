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
			'kernel/notices'
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
});
