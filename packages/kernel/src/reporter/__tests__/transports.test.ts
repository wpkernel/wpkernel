import type { LogLayerTransportParams } from '@loglayer/transport';
import { createTransports } from '../transports';
import { WPK_NAMESPACE } from '../../namespace/constants';
import { ensureWpData } from '@test-utils/wp';

describe('reporter transports', () => {
	const originalConsole = {
		info: console.info,
		warn: console.warn,
		error: console.error,
		debug: console.debug,
	};
	const originalEnv = process.env.NODE_ENV;

	beforeEach(() => {
		console.info = jest.fn();
		console.warn = jest.fn();
		console.error = jest.fn();
		console.debug = jest.fn();

		process.env.NODE_ENV = 'test';

		const wpData = ensureWpData();
		wpData.dispatch.mockReset();
		wpData.register.mockReset();

		if (window.wp?.hooks) {
			window.wp.hooks.doAction = jest.fn();
			window.wp.hooks.addAction = jest.fn();
			window.wp.hooks.removeAction = jest.fn();
		}
	});

	afterEach(() => {
		console.info = originalConsole.info;
		console.warn = originalConsole.warn;
		console.error = originalConsole.error;
		console.debug = originalConsole.debug;

		process.env.NODE_ENV = originalEnv;
		jest.restoreAllMocks();
	});

	function createParams(
		overrides: Partial<LogLayerTransportParams> = {}
	): LogLayerTransportParams {
		return {
			logLevel: 'info',
			context: {},
			messages: ['integration message'],
			metadata: {},
			...overrides,
		} as LogLayerTransportParams;
	}

	it('disables console transport when running in production', () => {
		process.env.NODE_ENV = 'production';

		const transport = createTransports('console', 'info');
		const params = createParams({
			context: { namespace: 'acme' },
			messages: ['should not log'],
		});

		const result = (
			transport as {
				shipToLogger: (p: LogLayerTransportParams) => unknown[];
			}
		).shipToLogger(params);

		expect(result).toEqual([]);
		expect(console.info).not.toHaveBeenCalled();
	});

	it('emits console output with fallback namespace', () => {
		const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1234);

		const transport = createTransports('console', 'debug');
		const params = createParams({
			logLevel: 'debug',
			messages: ['hello world'],
			metadata: { context: { attempt: 1 } },
			context: {},
		});

		const output = (
			transport as {
				shipToLogger: (p: LogLayerTransportParams) => unknown[];
			}
		).shipToLogger(params);

		expect(console.debug).toHaveBeenCalledWith(
			`[${WPK_NAMESPACE}]`,
			'hello world',
			{
				attempt: 1,
			}
		);
		expect(output).toEqual([
			`[${WPK_NAMESPACE}]`,
			'hello world',
			{ attempt: 1 },
		]);

		dateSpy.mockRestore();
	});

	it('sends hook events when WordPress hooks are available', () => {
		const doAction = window.wp?.hooks?.doAction as jest.Mock | undefined;
		const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(4321);

		const transport = createTransports('hooks', 'error');
		const params = createParams({
			logLevel: 'error',
			messages: ['failed to fetch'],
			context: { namespace: 'demo' },
			metadata: { context: { requestId: '123' } },
		});

		const payloads = (
			transport as {
				shipToLogger: (p: LogLayerTransportParams) => unknown[];
			}
		).shipToLogger(params);

		expect(doAction).toHaveBeenCalledWith('demo.reporter.error', {
			message: 'failed to fetch',
			context: { requestId: '123' },
			timestamp: 4321,
		});
		expect(payloads).toEqual([
			expect.objectContaining({
				message: 'failed to fetch',
				context: { requestId: '123' },
				timestamp: 4321,
			}),
		]);

		dateSpy.mockRestore();
	});

	it('returns empty payload when hooks transport cannot access WordPress hooks', () => {
		const originalDoAction = window.wp?.hooks?.doAction;
		if (window.wp?.hooks) {
			window.wp.hooks.doAction =
				undefined as unknown as typeof window.wp.hooks.doAction;
		}

		const transport = createTransports('hooks', 'info');
		const result = (
			transport as {
				shipToLogger: (p: LogLayerTransportParams) => unknown[];
			}
		).shipToLogger(createParams());

		expect(result).toEqual([]);

		if (window.wp?.hooks) {
			window.wp.hooks.doAction =
				originalDoAction as typeof window.wp.hooks.doAction;
		}
	});

	it('creates combined transports when using the "all" channel', () => {
		const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(9876);
		const transports = createTransports('all', 'warn') as {
			shipToLogger: (p: LogLayerTransportParams) => unknown[];
		}[];

		const params = createParams({
			logLevel: 'warn',
			messages: ['combined message'],
			context: { namespace: 'combo' },
			metadata: { context: { attempt: 2 } },
		});

		const results = transports.map((transport) =>
			transport.shipToLogger(params)
		);

		expect(transports).toHaveLength(2);
		expect(console.warn).toHaveBeenCalledWith(
			'[combo]',
			'combined message',
			{ attempt: 2 }
		);
		expect(window.wp?.hooks?.doAction).toHaveBeenCalledWith(
			'combo.reporter.warn',
			{
				message: 'combined message',
				context: { attempt: 2 },
				timestamp: 9876,
			}
		);
		expect(results).toEqual([
			['[combo]', 'combined message', { attempt: 2 }],
			[
				expect.objectContaining({
					message: 'combined message',
					context: { attempt: 2 },
					timestamp: 9876,
				}),
			],
		]);

		dateSpy.mockRestore();
	});
});
