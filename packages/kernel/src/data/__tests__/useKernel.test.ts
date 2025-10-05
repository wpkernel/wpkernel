import type { ReduxMiddleware } from '../../actions/types';
import type { Reporter } from '../../reporter';
import { useKernel } from '../registry';
import type { KernelRegistry } from '../types';

describe('useKernel', () => {
	beforeEach(() => {
		(window.wp?.hooks?.addAction as jest.Mock | undefined)?.mockReset?.();
		(
			window.wp?.hooks?.removeAction as jest.Mock | undefined
		)?.mockReset?.();
	});

	it('installs kernel middleware and returns cleanup handler', () => {
		const detachAction = jest.fn();
		const detachEvents = jest.fn();
		const registry = {
			__experimentalUseMiddleware: jest
				.fn()
				.mockReturnValueOnce(detachAction)
				.mockReturnValueOnce(detachEvents),
			dispatch: jest.fn().mockReturnValue({ createNotice: jest.fn() }),
		} as unknown as KernelRegistry & {
			__experimentalUseMiddleware: jest.Mock;
		};

		const reporter = {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			child: jest.fn(),
		} as jest.Mocked<Reporter>;
		reporter.child.mockReturnValue(reporter);
		const customMiddleware: ReduxMiddleware = () => (next) => (action) =>
			next(action);

		const cleanup = useKernel(registry, {
			reporter,
			middleware: [customMiddleware],
			namespace: 'acme',
		});

		expect(registry.__experimentalUseMiddleware).toHaveBeenCalledTimes(2);

		const actionMiddlewareFactory =
			registry.__experimentalUseMiddleware.mock.calls[0][0];
		const middlewares = actionMiddlewareFactory();
		expect(Array.isArray(middlewares)).toBe(true);
		expect(middlewares).toHaveLength(2);
		expect(middlewares[1]).toBe(customMiddleware);

		const eventsMiddlewareFactory =
			registry.__experimentalUseMiddleware.mock.calls[1][0];
		const [eventsMiddleware] = eventsMiddlewareFactory();
		const next = jest.fn();
		eventsMiddleware({ dispatch: jest.fn(), getState: jest.fn() })(next)({
			type: 'PING',
		});
		expect(window.wp?.hooks?.addAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.stringMatching(/^wpk\/notices\/\d+$/),
			expect.any(Function)
		);

		cleanup();

		expect(detachAction).toHaveBeenCalled();
		expect(detachEvents).toHaveBeenCalled();
		expect(window.wp?.hooks?.removeAction).toHaveBeenCalledWith(
			'wpk.action.error',
			expect.stringMatching(/^wpk\/notices\/\d+$/)
		);
	});

	it('returns noop when registry does not support middleware', () => {
		const registry = {} as unknown as KernelRegistry;

		const cleanup = useKernel(registry);
		expect(cleanup()).toBeUndefined();
	});
});
