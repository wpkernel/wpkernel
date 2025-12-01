import { BundlerError } from '../BundlerError';

describe('BundlerError', () => {
	it('captures code and context', () => {
		const error = new BundlerError('DeveloperError', {
			message: 'Failed to build',
			context: { step: 'bundle' },
		});

		expect(error.code).toBe('DeveloperError');
		expect(error.context).toEqual({ step: 'bundle' });
		expect(typeof error.message).toBe('string');
	});

	it('wraps existing WPKernelError', () => {
		const base = new BundlerError('Underlying failure');
		const wrapped = BundlerError.wrap(
			base as unknown as Error,
			'DeveloperError',
			{
				step: 'wrap',
			}
		);

		expect(wrapped).toBe(base);
	});

	it('wraps non-WP errors with context', () => {
		const original = new Error('boom');
		const wrapped = BundlerError.wrap(original, 'DeveloperError', {
			step: 'wrap',
		});

		expect(wrapped).toBeInstanceOf(BundlerError);
		expect(wrapped.context).toEqual({ step: 'wrap' });
		expect(wrapped.data?.originalError).toBe(original);
	});
});
