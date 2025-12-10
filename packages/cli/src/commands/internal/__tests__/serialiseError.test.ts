import {
	WPKernelError,
	serializeWPKernelError,
	type SerializedError,
} from '@wpkernel/core/contracts';
import { serialiseError } from '../serialiseError';

describe('serialiseError', () => {
	it('returns serialized wpk errors unchanged', () => {
		const kernelError = new WPKernelError('DeveloperError', {
			message: 'Already typed error',
			data: { value: 123 },
		});

		const result = serialiseError(kernelError);

		expect(result).toEqual(serializeWPKernelError(kernelError));
	});

	it('wraps native errors with WPKernelError metadata', () => {
		const nativeError = new Error('native failure');

		const result = serialiseError(nativeError);

		expect(result).toMatchObject<SerializedError>({
			name: 'WPKernelError',
			code: 'UnknownError',
			message: nativeError.message,
		});
		expect(result.data?.originalError).toBe(nativeError);
	});

	it('creates an unknown error payload for arbitrary inputs', () => {
		const result = serialiseError({ some: 'value' });

		expect(result).toMatchObject<SerializedError>({
			name: 'WPKernelError',
			code: 'UnknownError',
			message: 'Unexpected error occurred.',
		});
		expect(result.data?.value).toEqual({ some: 'value' });
	});
});
