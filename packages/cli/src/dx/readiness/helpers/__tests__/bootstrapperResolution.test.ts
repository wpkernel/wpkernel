import path from 'node:path';
import { type EnvironmentalError } from '@wpkernel/core/error';
import {
	createQuickstartDepsMock,
	type QuickstartDepsMock,
	makePromiseWithChild,
	makeRejectedPromiseWithChild,
} from '@cli-tests/dx/quickstart.test-support';
import {
	createBootstrapperResolutionReadinessHelper,
	type BootstrapperResolutionDependencies,
} from '../bootstrapperResolution';
import {
	createReadinessTestContext,
	makeNoEntry,
} from '@cli-tests/readiness.test-support';

const repoRoot = '/repo';
const projectRoot = path.join(repoRoot, 'packages', 'cli');
const bootstrapperPath = path.join(
	repoRoot,
	'packages',
	'create-wpk',
	'dist',
	'index.js'
);

describe('createBootstrapperResolutionReadinessHelper', () => {
	let deps: QuickstartDepsMock;

	beforeEach(() => {
		deps = createQuickstartDepsMock();
	});

	it('reports pending when the compiled bootstrapper entry is missing', async () => {
		deps.access.mockImplementation(async (target, _mode?: number) => {
			if (target === path.join(projectRoot, 'pnpm-workspace.yaml')) {
				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'pnpm-workspace.yaml')
			) {
				throw makeNoEntry(target);
			}

			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (target === bootstrapperPath) {
				throw makeNoEntry(target);
			}

			throw new Error(`Unexpected access: ${target}`);
		});

		const helper = createBootstrapperResolutionReadinessHelper({
			dependencies: deps as Partial<BootstrapperResolutionDependencies>,
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(detection.message).toBe(
			'Missing compiled bootstrapper entry at packages/create-wpk/dist/index.js.'
		);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('pending');
		expect(confirmation.message).toBe(
			'Bootstrapper resolution pending verification.'
		);

		expect(deps.access).toHaveBeenCalledWith(
			path.join(repoRoot, 'pnpm-workspace.yaml')
		);
	});

	it('reports ready when the bootstrapper resolves bundled dependencies', async () => {
		deps.access.mockImplementation(async (target, _mode?: number) => {
			if (target === path.join(projectRoot, 'pnpm-workspace.yaml')) {
				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'pnpm-workspace.yaml')
			) {
				throw makeNoEntry(target);
			}

			if (
				target === path.join(repoRoot, 'pnpm-workspace.yaml') ||
				target === bootstrapperPath
			) {
				return undefined;
			}

			throw new Error(`Unexpected access: ${target}`);
		});
		deps.mkdtemp.mockResolvedValue('/tmp/wpk-bootstrapper-123');
		deps.exec.mockReturnValue(
			makePromiseWithChild({
				stdout: Buffer.from('help'),
				stderr: Buffer.from(''),
			})
		);

		const helper = createBootstrapperResolutionReadinessHelper({
			dependencies: deps as Partial<BootstrapperResolutionDependencies>,
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(detection.message).toBe(
			'Bootstrapper resolved CLI entrypoint via --help invocation.'
		);

		expect(deps.exec).toHaveBeenCalledWith(
			process.execPath,
			[bootstrapperPath, '--', '--help'],
			expect.objectContaining({
				cwd: '/tmp/wpk-bootstrapper-123',
				env: process.env,
			})
		);

		expect(deps.rm).toHaveBeenCalledWith('/tmp/wpk-bootstrapper-123', {
			recursive: true,
			force: true,
		});

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(confirmation.message).toBe(
			'Bootstrapper resolved CLI entrypoint via --help invocation.'
		);
	});

	it('throws an EnvironmentalError when bootstrapper resolution fails', async () => {
		deps.access.mockImplementation(async (target, _mode?: number) => {
			if (target === path.join(projectRoot, 'pnpm-workspace.yaml')) {
				throw makeNoEntry(target);
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'pnpm-workspace.yaml')
			) {
				throw makeNoEntry(target);
			}

			if (
				target === path.join(repoRoot, 'pnpm-workspace.yaml') ||
				target === bootstrapperPath
			) {
				return undefined;
			}

			throw new Error(`Unexpected access: ${target}`);
		});
		deps.mkdtemp.mockResolvedValue('/tmp/wpk-bootstrapper-999');
		deps.exec.mockImplementation(() => {
			const error = new Error(
				'Cannot find module'
			) as NodeJS.ErrnoException & {
				stdout?: string;
				stderr?: string;
				code?: number;
			};
			error.stderr = 'Cannot find module @wpkernel/cli';
			error.stdout = '';
			return makeRejectedPromiseWithChild(error);
		});

		const helper = createBootstrapperResolutionReadinessHelper({
			dependencies: deps as Partial<BootstrapperResolutionDependencies>,
		});

		const context = createReadinessTestContext({
			projectRoot,
			workspaceRoot: null,
			workspace: null,
			cwd: projectRoot,
		});

		await expect(helper.detect(context)).rejects.toMatchObject({
			reason: 'bootstrapper.resolve',
		} satisfies Partial<EnvironmentalError>);

		expect(deps.rm).toHaveBeenCalledWith('/tmp/wpk-bootstrapper-999', {
			recursive: true,
			force: true,
		});
	});
});
