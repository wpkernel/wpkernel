import { createReporter } from '../index';

describe('createReporter', () => {
	const originalInfo = console.info;
	const originalWarn = console.warn;
	const originalError = console.error;
	const originalDebug = console.debug;

	beforeEach(() => {
		console.info = jest.fn();
		console.warn = jest.fn();
		console.error = jest.fn();
		console.debug = jest.fn();
		(window.wp?.hooks?.doAction as jest.Mock | undefined)?.mockReset?.();
	});

	afterEach(() => {
		console.info = originalInfo;
		console.warn = originalWarn;
		console.error = originalError;
		console.debug = originalDebug;
	});

	it('logs to console transport when info is invoked', () => {
		const reporter = createReporter({
			namespace: 'test',
			channel: 'console',
			level: 'debug',
		});

		reporter.info('hello world', { source: 'unit-test' });
		reporter.warn('warn message');
		reporter.error('error message');
		reporter.debug('debug message');

		expect(console.info).toHaveBeenCalledWith('[test]', 'hello world', {
			source: 'unit-test',
		});
		expect(console.warn).toHaveBeenCalledWith('[test]', 'warn message');
		expect(console.error).toHaveBeenCalledWith('[test]', 'error message');
		expect(console.debug).toHaveBeenCalledWith('[test]', 'debug message');

		expect(console as any).toHaveInformedWith('[test]', 'hello world', {
			source: 'unit-test',
		});
		expect(console as any).toHaveWarnedWith('[test]', 'warn message');
		expect(console as any).toHaveErroredWith('[test]', 'error message');
	});

	it('emits WordPress hooks when hooks channel is selected', () => {
		const reporter = createReporter({
			namespace: 'acme',
			channel: 'hooks',
		});

		reporter.error('failed to save', { retry: true });

		const doAction = window.wp?.hooks?.doAction as jest.Mock | undefined;
		expect(doAction).toHaveBeenCalledWith(
			'acme.reporter.error',
			expect.objectContaining({
				message: 'failed to save',
				context: { retry: true },
			})
		);
	});

	it('supports child reporters with nested namespaces', () => {
		const reporter = createReporter({
			namespace: 'kernel',
			channel: 'console',
		});
		const child = reporter.child('policy');

		child.warn('denied');

		expect(console.warn).toHaveBeenCalledWith('[kernel.policy]', 'denied');
	});

	it('respects enabled=false by skipping transports', () => {
		const reporter = createReporter({
			namespace: 'disabled',
			enabled: false,
		});

		reporter.info('ignored');

		expect(console.info).not.toHaveBeenCalled();
	});

	it('throws for unsupported bridge channel', () => {
		expect(() => createReporter({ channel: 'bridge' })).toThrow(
			'Bridge transport is planned for a future sprint'
		);
	});
});
