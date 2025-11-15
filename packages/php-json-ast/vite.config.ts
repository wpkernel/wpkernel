import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';
import type { PluginOption } from 'vite';
import type { Reporter } from '@wpkernel/core/reporter';
import { createWPKLibConfig } from '../../vite.config.base';
import { createPhpDriverInstaller, type DriverHelper } from './src/installer';

interface WorkspaceLike {
	readonly root: string;
	resolve: (...parts: string[]) => string;
	exists: (target: string) => Promise<boolean>;
}

function resolvePackageRoot(): string {
	if (typeof __dirname === 'string') {
		return __dirname;
	}

	try {
		const moduleUrl = new Function('return import.meta.url')() as string;
		return fileURLToPath(new URL('.', moduleUrl));
	} catch {
		return process.cwd();
	}
}

const PACKAGE_ROOT = resolvePackageRoot();

function createWorkspace(root: string): WorkspaceLike {
	return {
		root,
		resolve: (...parts: string[]) => path.resolve(root, ...parts),
		async exists(target: string) {
			const resolved = path.isAbsolute(target)
				? target
				: path.resolve(root, target);

			try {
				await access(resolved);
				return true;
			} catch {
				return false;
			}
		},
	};
}

let cachedPhpDriverInstaller: DriverHelper | null = null;

function getPhpDriverInstaller(): DriverHelper {
	if (!cachedPhpDriverInstaller) {
		cachedPhpDriverInstaller = createPhpDriverInstaller();
	}

	return cachedPhpDriverInstaller;
}

function createConsoleReporter(): Reporter {
	const log = (
		level: 'info' | 'warn' | 'error' | 'debug',
		message: string,
		context?: unknown
	) => {
		switch (level) {
			case 'warn':
				if (typeof context === 'undefined') {
					console.warn(message);
				} else {
					console.warn(message, context);
				}
				break;
			case 'error':
				if (typeof context === 'undefined') {
					console.error(message);
				} else {
					console.error(message, context);
				}
				break;
			case 'debug':
				if (typeof context === 'undefined') {
					console.debug(message);
				} else {
					console.debug(message, context);
				}
				break;
			case 'info':
			default:
				if (typeof context === 'undefined') {
					console.info(message);
				} else {
					console.info(message, context);
				}
		}
	};

	const reporter: Reporter = {
		info(message, context) {
			log('info', message, context);
		},
		warn(message, context) {
			log('warn', message, context);
		},
		error(message, context) {
			log('error', message, context);
		},
		debug(message, context) {
			log('debug', message, context);
		},
		child() {
			return reporter;
		},
	};

	return reporter;
}

function phpDriverInstallerPlugin(): PluginOption {
	let hasRun = false;

	return {
		name: 'wpkernel-php-json-ast-php-driver-installer',
		apply: 'build',
		async buildStart() {
			if (hasRun) {
				return;
			}

			hasRun = true;

			const installer = getPhpDriverInstaller();
			const reporter = createConsoleReporter();
			const workspace = createWorkspace(PACKAGE_ROOT);

			await installer.apply(
				{
					context: {
						workspace,
						phase: 'generate' as const,
						reporter,
					},
					input: undefined as never,
					output: undefined as never,
					reporter,
				},
				undefined
			);
		},
	};
}

const config = createWPKLibConfig('@wpkernel/php-json-ast', {
	index: 'src/index.ts',
	nodes: 'src/nodes.ts',
	types: 'src/types.ts',
	modifiers: 'src/modifiers.ts',
	'php-driver': 'src/php-driver.ts',
});

const existingPlugins = config.plugins ?? [];

config.plugins = Array.isArray(existingPlugins)
	? [...existingPlugins, phpDriverInstallerPlugin()]
	: [existingPlugins, phpDriverInstallerPlugin()];

export default config;
