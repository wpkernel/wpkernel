import { WPKernelError } from '@wpkernel/core/error';
import { createPhpDriverInstaller } from '../installer/createPhpDriverInstaller';
import type { WorkspaceLike } from '../types';

type Logger = ReturnType<typeof createLogger>;

type Workspace = WorkspaceLike & {
	resolve: jest.Mock<string, [string]>;
	exists: jest.Mock<Promise<boolean>, [string]>;
};

function createLogger() {
	return {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
	} satisfies {
		info: jest.Mock;
		debug: jest.Mock;
		error: jest.Mock;
	};
}

function baseWorkspace(): Workspace {
	return {
		root: '/workspace',
		resolve: jest.fn((file: string) => `/workspace/${file}`),
		exists: jest.fn(async (_target: string) => true),
	} satisfies Workspace;
}

function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
	return { ...baseWorkspace(), ...overrides };
}

describe('createPhpDriverInstaller', () => {
	let logger: Logger;

	beforeEach(() => {
		logger = createLogger();
	});

	it('skips installation when vendor autoload exists', async () => {
		const workspace = createWorkspace();
		const installer = createPhpDriverInstaller();

		const result = await installer.install({ workspace, logger });

		expect(result).toEqual({
			installed: false,
			skippedReason: 'already-installed',
		});
		expect(workspace.resolve).toHaveBeenNthCalledWith(1, 'composer.json');
		expect(workspace.resolve).toHaveBeenNthCalledWith(
			2,
			'vendor/autoload.php'
		);
		expect(workspace.exists).toHaveBeenNthCalledWith(
			1,
			'/workspace/composer.json'
		);
		expect(workspace.exists).toHaveBeenNthCalledWith(
			2,
			'/workspace/vendor/autoload.php'
		);
		expect(logger.debug).toHaveBeenCalledWith(
			'PHP parser dependency detected in bundled assets.'
		);
	});

	it('throws when bundled assets are missing', async () => {
		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('composer.json')
			),
		});
		const installer = createPhpDriverInstaller();

		await expect(
			installer.install({ workspace, logger })
		).rejects.toBeInstanceOf(WPKernelError);
		expect(logger.error).toHaveBeenCalledWith(
			'Bundled PHP parser assets missing from CLI build.',
			{ autoloadPath: '/workspace/vendor/autoload.php' }
		);
	});

	it('skips installation when composer.json is missing', async () => {
		const workspace = createWorkspace({
			exists: jest.fn(async (target: string) =>
				target.endsWith('vendor/autoload.php')
			),
		});
		const installer = createPhpDriverInstaller();

		const result = await installer.install({ workspace, logger });

		expect(result).toEqual({
			installed: false,
			skippedReason: 'missing-manifest',
		});
		expect(logger.debug).toHaveBeenCalledWith(
			'createPhpDriverInstaller: composer.json missing, skipping installer.'
		);
	});
});
