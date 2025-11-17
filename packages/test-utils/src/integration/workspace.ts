import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ensureLayoutManifest } from '../layout-manifest.test-support.js';

/**
 * Options for configuring a temporary workspace.
 *
 * @category Integration
 */
export interface WorkspaceOptions {
	/** A prefix for the temporary directory name. */
	prefix?: string;
	/** Whether to change the current working directory to the workspace. */
	chdir?: boolean;
	/** A map of relative file paths to their content (string or Buffer). */
	files?: Record<string, string | Buffer>;
	/** A setup function to run before the test. */
	setup?: (workspace: string) => Promise<void> | void;
	/** A teardown function to run after the test. */
	teardown?: (workspace: string) => Promise<void> | void;
}

/**
 * Creates and manages a temporary workspace for integration tests.
 *
 * @category Integration
 * @param    run     - The test function to execute within the workspace. It receives the workspace path as an argument.
 * @param    options - Configuration options for the workspace.
 * @returns A Promise that resolves when the test and cleanup are complete.
 */
export async function withWorkspace(
	run: (workspace: string) => Promise<void>,
	options: WorkspaceOptions = {}
): Promise<void> {
	const {
		prefix = path.join(os.tmpdir(), 'wpk-cli-workspace-'),
		chdir = true,
		files,
		setup,
		teardown,
	} = options;

	const workspace = await fs.mkdtemp(prefix);
	const previousCwd = process.cwd();

	try {
		await ensureLayoutManifest(workspace);

		if (files) {
			await Promise.all(
				Object.entries(files).map(async ([relativePath, contents]) => {
					const absolutePath = path.join(workspace, relativePath);
					await fs.mkdir(path.dirname(absolutePath), {
						recursive: true,
					});
					await fs.writeFile(absolutePath, contents);
				})
			);
		}

		if (setup) {
			await setup(workspace);
		}

		if (chdir) {
			process.chdir(workspace);
		}

		try {
			await run(workspace);
		} finally {
			if (chdir) {
				process.chdir(previousCwd);
			}

			if (teardown) {
				await teardown(workspace);
			}
		}
	} finally {
		await fs.rm(workspace, { recursive: true, force: true });
	}
}

/**
 * Creates a workspace runner function with default options.
 *
 * @category Integration
 * @param    defaultOptions - Default options to apply to all workspaces created by the runner.
 * @returns A function that takes a test function and optional overrides, and runs it within a workspace.
 */
export function createWorkspaceRunner(
	defaultOptions: WorkspaceOptions = {}
): (
	run: (workspace: string) => Promise<void>,
	overrides?: WorkspaceOptions
) => Promise<void> {
	return async (run, overrides: WorkspaceOptions = {}): Promise<void> => {
		const { files: defaultFiles, ...baseDefaults } = defaultOptions;
		const { files: overrideFiles, ...baseOverrides } = overrides;

		let files: WorkspaceOptions['files'];
		if (overrideFiles === undefined) {
			files = defaultFiles;
		} else if (defaultFiles === undefined) {
			files = overrideFiles;
		} else {
			files = { ...defaultFiles, ...overrideFiles };
		}

		await withWorkspace(run, {
			...baseDefaults,
			...baseOverrides,
			files,
		});
	};
}
