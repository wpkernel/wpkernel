import { createDefaultError, createErrorFactory } from '../error-factory';

describe('error-factory', () => {
	describe('createDefaultError', () => {
		it('returns an Error with prefixed message and code property', () => {
			const error = createDefaultError(
				'ValidationError',
				'invalid payload'
			);

			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe('[ValidationError] invalid payload');
			expect((error as Error & { code: string }).code).toBe(
				'ValidationError'
			);
		});
	});

	describe('createErrorFactory', () => {
		class CustomError extends Error {
			public readonly code: string;

			public constructor(code: string, message: string) {
				super(message);
				this.name = code;
				this.code = code;
			}
		}

		it('wraps a provided constructor', () => {
			const factory = createErrorFactory((code, message) => {
				return new CustomError(code, message);
			});

			const error = factory('RuntimeError', 'boom');
			expect(error).toBeInstanceOf(CustomError);
			expect(error.name).toBe('RuntimeError');
			expect(error.message).toBe('boom');
			expect((error as CustomError).code).toBe('RuntimeError');
		});
	});
});
