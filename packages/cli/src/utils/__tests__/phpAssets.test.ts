import { WPKernelError } from '@wpkernel/core/error';
import { createModuleResolver } from '../module-url';
import {
	resolveBundledComposerAutoloadPath,
	resolveBundledPhpDriverPrettyPrintPath,
	resolveBundledPhpJsonAstIngestionPath,
} from '../phpAssets';

jest.mock('../module-url', () => {
	const stub = jest.fn();
	return {
		createModuleResolver: jest.fn(() => stub),
		__resolverStub: stub,
	};
});

const resolverStub: jest.Mock = jest.requireMock('../module-url')
	.__resolverStub as jest.Mock;

describe('phpAssets helpers', () => {
	beforeEach(() => {
		resolverStub.mockReset();
		(createModuleResolver as jest.Mock).mockReturnValue(resolverStub);
	});

	it('throws when required dependency cannot be resolved', () => {
		resolverStub.mockImplementation(() => {
			const err = new Error('missing') as NodeJS.ErrnoException;
			err.code = 'MODULE_NOT_FOUND';
			throw err;
		});

		expect(() => resolveBundledPhpJsonAstIngestionPath()).toThrow(
			WPKernelError
		);
	});

	it('returns paths when dependency exists', () => {
		resolverStub.mockImplementation((request: string) =>
			request.endsWith('package.json') ? '/tmp/pkg/package.json' : request
		);

		expect(
			resolveBundledPhpDriverPrettyPrintPath().endsWith(
				'pretty-print.php'
			)
		).toBe(true);
		expect(
			resolveBundledPhpJsonAstIngestionPath().endsWith(
				'ingest-program.php'
			)
		).toBe(true);
	});

	it('allows optional composer autoload resolution to return null', () => {
		resolverStub.mockImplementation(() => {
			const err = new Error('missing') as NodeJS.ErrnoException;
			err.code = 'MODULE_NOT_FOUND';
			throw err;
		});

		expect(
			resolveBundledComposerAutoloadPath({ optional: true })
		).toBeNull();
	});
});
