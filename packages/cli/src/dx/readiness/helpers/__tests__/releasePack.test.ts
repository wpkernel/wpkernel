import path from 'node:path';
import { EnvironmentalError } from '@wpkernel/core/error';
import { createReleasePackReadinessHelper } from '../releasePack';
import {
	createReadinessTestContext,
	makeNoEntry,
} from '../../test/test-support';

const repoRoot = '/repo';
const projectRoot = path.join(repoRoot, 'packages', 'cli');
const manifest = [
	{
		packageName: '@wpkernel/example',
		packageDir: path.join('packages', 'example'),
		expectedArtifacts: [path.join('dist', 'index.js')],
	},
] as const;

function createContext() {
	return createReadinessTestContext({
		projectRoot,
		workspaceRoot: null,
		workspace: null,
		cwd: projectRoot,
	});
}

describe('createReleasePackReadinessHelper', () => {
	it('reports ready when all artefacts exist', async () => {
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				return undefined;
			}

			throw makeNoEntry(target);
		});

		const helper = createReleasePackReadinessHelper({
			manifest,
			dependencies: {
				access,
				exec: jest.fn(),
			},
		});

		const context = createContext();
		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');
		expect(detection.message).toBe('Release pack artefacts detected.');

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
		expect(access).toHaveBeenCalledWith(
			path.join(repoRoot, 'pnpm-workspace.yaml')
		);
	});

	it('rebuilds missing artefacts and confirms readiness', async () => {
		let built = false;
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				if (built) {
					return undefined;
				}

				throw makeNoEntry(target);
			}

			throw makeNoEntry(target);
		});

		const exec = jest.fn(async () => {
			built = true;
		});

		const helper = createReleasePackReadinessHelper({
			manifest,
			dependencies: { access, exec },
		});

		const context = createContext();
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');
		expect(detection.message).toContain('Missing build artefact');

		await helper.execute?.(context, detection.state);
		expect(exec).toHaveBeenCalledWith(
			'pnpm',
			['--filter', '@wpkernel/example', 'build'],
			{ cwd: repoRoot }
		);

		const confirmation = await helper.confirm(context, detection.state);
		expect(confirmation.status).toBe('ready');
	});

	it('throws when artefacts remain missing after rebuild', async () => {
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				throw makeNoEntry(target);
			}

			throw makeNoEntry(target);
		});

		const helper = createReleasePackReadinessHelper({
			manifest,
			dependencies: {
				access,
				exec: jest.fn(),
			},
		});

		const context = createContext();
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		const run = helper.execute?.(context, detection.state);
		expect(run).toBeDefined();
		await expect(run as Promise<unknown>).rejects.toBeInstanceOf(
			EnvironmentalError
		);
		await expect(run as Promise<unknown>).rejects.toMatchObject({
			reason: 'build.missingArtifact',
		});
	});

	it('surfaces build failures when rebuild fails', async () => {
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				throw makeNoEntry(target);
			}

			throw makeNoEntry(target);
		});

		const exec = jest.fn(async () => {
			throw new Error('boom');
		});

		const helper = createReleasePackReadinessHelper({
			manifest,
			dependencies: { access, exec },
		});

		const context = createContext();
		const detection = await helper.detect(context);
		expect(detection.status).toBe('pending');

		await expect(
			helper.execute?.(context, detection.state)
		).rejects.toMatchObject({
			reason: 'build.failed',
		});
	});

	it('skips rebuilding when artefacts already exist', async () => {
		const access = jest.fn(async (target: string) => {
			if (target === path.join(repoRoot, 'pnpm-workspace.yaml')) {
				return undefined;
			}

			if (
				target ===
				path.join(repoRoot, 'packages', 'example', 'dist', 'index.js')
			) {
				return undefined;
			}

			throw makeNoEntry(target);
		});

		const exec = jest.fn();

		const helper = createReleasePackReadinessHelper({
			manifest,
			dependencies: {
				access,
				exec,
			},
		});

		const context = createContext();
		const detection = await helper.detect(context);
		expect(detection.status).toBe('ready');

		await helper.execute?.(context, detection.state);
		expect(exec).not.toHaveBeenCalled();
	});

	it('fails when the repository root cannot be resolved', async () => {
		const helper = createReleasePackReadinessHelper({
			manifest,
			dependencies: {
				access: jest.fn(async () => {
					throw makeNoEntry('missing');
				}),
				exec: jest.fn(),
			},
		});

		await expect(helper.detect(createContext())).rejects.toMatchObject({
			code: 'DeveloperError',
		});
	});
});
