import { WPKernelError } from '@wpkernel/core/error';
import { createPhpDriverInstaller } from '../installer';

type Reporter = ReturnType<typeof createReporter>;

type Workspace = ReturnType<typeof baseWorkspace>;

function createReporter() {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis(),
	};
}

function baseWorkspace() {
	return {
		root: '/workspace',
		resolve: jest.fn((target: string) => `/workspace/${target}`),
		exists: jest.fn(async (target: string) => {
			return !target.endsWith('missing');
		}),
	};
}

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
	return { ...baseWorkspace(), ...overrides };
}

describe('createPhpDriverInstaller', () => {
	let reporter: Reporter;

	beforeEach(() => {
		reporter = createReporter();
	});

	it('skips installation when vendor autoload exists', async () => {
		const helper = createPhpDriverInstaller();
		const workspace = createWorkspace();

		await helper.apply(
			{
				context: { workspace },
				input: undefined as never,
				output: undefined as never,
				reporter,
			},
			undefined
		);

		expect(workspace.resolve).toHaveBeenCalledWith('vendor/autoload.php');
		expect(workspace.exists).toHaveBeenNthCalledWith(
			1,
			'/workspace/composer.json'
		);
		expect(workspace.exists).toHaveBeenNthCalledWith(
			2,
			'/workspace/vendor/autoload.php'
		);
		expect(reporter.debug).toHaveBeenCalledWith(
			'PHP parser dependency detected in bundled assets.'
		);
	});

	it('throws when bundled assets are missing', async () => {
		const helper = createPhpDriverInstaller();
		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('composer.json') ? true : false
			),
		});

		await expect(
			helper.apply(
				{
					context: { workspace },
					input: undefined as never,
					output: undefined as never,
					reporter,
				},
				undefined
			)
		).rejects.toBeInstanceOf(WPKernelError);

		expect(reporter.error).toHaveBeenCalledWith(
			'Bundled PHP parser assets missing from CLI build.',
			{ autoloadPath: '/workspace/vendor/autoload.php' }
		);
	});

	it('skips installation when composer manifest is missing', async () => {
		const helper = createPhpDriverInstaller();
		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('composer.json') ? false : false
			),
		});

		await helper.apply(
			{
				context: { workspace },
				input: undefined as never,
				output: undefined as never,
				reporter,
			},
			undefined
		);

		expect(reporter.debug).toHaveBeenCalledWith(
			'createPhpDriverInstaller: composer.json missing, skipping installer.'
		);
	});
});
