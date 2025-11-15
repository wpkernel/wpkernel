import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WPKernelError } from '@wpkernel/core/error';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';
import type { WorkspaceLike } from '../workspace';

export interface PhpAstNode {
	readonly nodeType: string;
}

export type PhpProgram = ReadonlyArray<PhpAstNode>;

export interface PhpPrettyPrintResult {
	readonly code: string;
	readonly ast?: PhpProgram;
}

export interface PhpPrettyPrintPayload {
	readonly filePath: string;
	readonly program: PhpProgram;
}

export interface PhpPrettyPrinter {
	prettyPrint: (
		payload: PhpPrettyPrintPayload
	) => Promise<PhpPrettyPrintResult>;
}

interface CreatePhpPrettyPrinterOptions {
	readonly workspace: WorkspaceLike;
	readonly phpBinary?: string;
	readonly scriptPath?: string;
	readonly importMetaUrl?: string;
	readonly autoloadPaths?: readonly string[];
}

export function resolvePrettyPrintScriptPath(
	options: {
		readonly importMetaUrl?: string;
	} = {}
): string {
	const packageRoot =
		resolvePackageRootFromProvidedImportMeta(options.importMetaUrl) ??
		resolvePackageRootFromDirname() ??
		resolvePackageRootFromModuleUrl();

	if (packageRoot) {
		return path.resolve(packageRoot, 'php', 'pretty-print.php');
	}

	return path.resolve(process.cwd(), 'php', 'pretty-print.php');
}

function resolvePackageRootFromDirname(): string | null {
	if (typeof __dirname !== 'string') {
		return null;
	}

	return path.resolve(__dirname, '..', '..');
}

function resolvePackageRootFromModuleUrl(): string | null {
	const moduleUrl = getImportMetaUrl();
	if (!moduleUrl) {
		return null;
	}

	return resolvePackageRootFromProvidedImportMeta(moduleUrl);
}

function resolvePackageRootFromProvidedImportMeta(
	importMetaUrl?: string
): string | null {
	if (!importMetaUrl) {
		return null;
	}

	try {
		const modulePath = fileURLToPath(importMetaUrl);
		const moduleDirectory = path.dirname(modulePath);
		const initialParent = path.resolve(moduleDirectory, '..');
		if (path.basename(initialParent) === 'dist') {
			return path.resolve(initialParent, '..');
		}

		return initialParent;
	} catch {
		return null;
	}
}

let cachedImportMetaUrl: string | null | undefined;

function getImportMetaUrl(): string | null {
	if (cachedImportMetaUrl !== undefined) {
		return cachedImportMetaUrl;
	}

	cachedImportMetaUrl = resolveModuleUrlFromStack();
	return cachedImportMetaUrl;
}

function resolveModuleUrlFromStack(): string | null {
	const originalPrepareStackTrace = Error.prepareStackTrace;

	try {
		Error.prepareStackTrace = (_, structuredStackTrace) =>
			structuredStackTrace;
		const callSites = new Error().stack as unknown as
			| ReadonlyArray<NodeJS.CallSite>
			| undefined;

		if (!Array.isArray(callSites)) {
			return null;
		}

		for (const callSite of callSites) {
			const fileName = callSite.getFileName?.();
			if (typeof fileName !== 'string') {
				continue;
			}

			if (fileName.startsWith('file:')) {
				return fileName;
			}

			if (path.isAbsolute(fileName)) {
				return pathToFileURL(fileName).href;
			}
		}

		return null;
	} catch {
		return null;
	} finally {
		Error.prepareStackTrace = originalPrepareStackTrace;
	}
}

function resolveDefaultScriptPath(
	options: { readonly importMetaUrl?: string } = {}
): string {
	return resolvePrettyPrintScriptPath({
		importMetaUrl: options.importMetaUrl,
	});
}

export function buildPhpPrettyPrinter(
	options: CreatePhpPrettyPrinterOptions
): PhpPrettyPrinter {
	const scriptPath =
		options.scriptPath ??
		resolveDefaultScriptPath({ importMetaUrl: options.importMetaUrl });
	const phpBinary = options.phpBinary ?? 'php';
	const defaultMemoryLimit = process.env.PHP_MEMORY_LIMIT ?? '512M';
	const normalizedAutoloadPaths = normalizeAutoloadPaths(
		options.autoloadPaths
	);
	const phpDriverAutoloadEnvValue = mergeAutoloadEnvValues(
		process.env.PHP_DRIVER_AUTOLOAD_PATHS,
		normalizedAutoloadPaths
	);
	const wpkAutoloadEnvValue = mergeAutoloadEnvValues(
		process.env.WPK_PHP_AUTOLOAD_PATHS,
		normalizedAutoloadPaths
	);

	async function prettyPrint(
		payload: PhpPrettyPrintPayload
	): Promise<PhpPrettyPrintResult> {
		ensureValidPayload(payload);

		const { workspace } = options;
		const memoryLimit = resolveMemoryLimit(defaultMemoryLimit);

		const env: NodeJS.ProcessEnv = {
			...process.env,
			PHP_MEMORY_LIMIT: memoryLimit,
		};

		if (phpDriverAutoloadEnvValue) {
			env.PHP_DRIVER_AUTOLOAD_PATHS = phpDriverAutoloadEnvValue;
		}

		if (wpkAutoloadEnvValue) {
			env.WPK_PHP_AUTOLOAD_PATHS = wpkAutoloadEnvValue;
		}

		const child = spawn(
			phpBinary,
			[
				'-d',
				`memory_limit=${memoryLimit}`,
				scriptPath,
				workspace.root,
				payload.filePath,
			],
			{
				cwd: workspace.root,
				env,
			}
		);

		const input = JSON.stringify({
			file: payload.filePath,
			ast: payload.program,
		});

		let stdout = '';
		let stderr = '';

		child.stdout?.setEncoding?.('utf8');
		child.stderr?.setEncoding?.('utf8');

		child.stdout?.on('data', (chunk) => {
			stdout += chunk;
		});

		child.stderr?.on('data', (chunk) => {
			stderr += chunk;
		});

		const exitCode = await waitForBridgeExit(child, input, {
			phpBinary,
			scriptPath,
		});

		if (exitCode !== 0) {
			logBridgeFailure(stdout, stderr);
			throw new WPKernelError('DeveloperError', {
				message: 'Failed to pretty print PHP artifacts.',
				data: {
					filePath: payload.filePath,
					exitCode,
					stderr,
					stderrSummary: collectStderrSummary(stderr),
				},
			});
		}

		return parseBridgeOutput(stdout, {
			filePath: payload.filePath,
			stderr,
		});
	}

	return {
		prettyPrint,
	};
}

function ensureValidPayload(payload: PhpPrettyPrintPayload): void {
	const { program } = payload;

	if (!Array.isArray(program)) {
		throw new WPKernelError('DeveloperError', {
			message: 'PHP pretty printer requires an AST payload.',
			data: {
				filePath: payload.filePath,
			},
		});
	}

	program.forEach((node, index) => {
		if (!node || typeof node !== 'object') {
			throw makeInvalidNodeError(payload.filePath, index);
		}

		const nodeType = (node as { nodeType?: unknown }).nodeType;
		if (typeof nodeType !== 'string' || nodeType.length === 0) {
			throw makeInvalidNodeError(payload.filePath, index);
		}
	});
}

function makeInvalidNodeError(filePath: string, index: number): WPKernelError {
	return new WPKernelError('DeveloperError', {
		message:
			'PHP pretty printer requires AST nodes with a string nodeType.',
		data: {
			filePath,
			invalidNodeIndex: index,
		},
	});
}

function resolveMemoryLimit(defaultMemoryLimit: string): string {
	const envLimit = process.env.PHP_MEMORY_LIMIT;
	return typeof envLimit === 'string' && envLimit !== ''
		? envLimit
		: defaultMemoryLimit;
}

async function waitForBridgeExit(
	child: ReturnType<typeof spawn>,
	input: string,
	meta: { phpBinary: string; scriptPath: string }
): Promise<number> {
	return new Promise((resolve, reject) => {
		let settled = false;
		const settleResolve = (value: number) => {
			if (!settled) {
				settled = true;
				resolve(value);
			}
		};
		const settleReject = (error: unknown) => {
			if (!settled) {
				settled = true;
				reject(error);
			}
		};

		child.on('error', (error) => {
			if (
				error &&
				typeof error === 'object' &&
				'code' in error &&
				(error as NodeJS.ErrnoException).code === 'ENOENT'
			) {
				settleReject(
					new WPKernelError('DeveloperError', {
						message:
							'PHP pretty printer is missing required dependencies.',
						data: meta,
					})
				);
				return;
			}

			settleReject(error);
		});
		child.on('close', (code) =>
			settleResolve(typeof code === 'number' ? code : 1)
		);

		const stdin = child.stdin;
		if (!stdin) {
			settleReject(
				new WPKernelError('DeveloperError', {
					message:
						'PHP pretty printer child process did not expose a writable stdin.',
					data: meta,
				})
			);
			return;
		}

		stdin.on('error', (error) => settleReject(error));
		stdin.end(input, 'utf8');
	});
}

function collectStderrSummary(stderr: string): string[] {
	return stderr
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, 3);
}

function parseBridgeOutput(
	stdout: string,
	context: { filePath: string; stderr: string }
): PhpPrettyPrintResult {
	try {
		const raw = JSON.parse(stdout) as {
			code?: unknown;
			ast?: unknown;
		};

		if (typeof raw.code !== 'string') {
			throw new Error('Missing code payload');
		}
		if (!raw.ast) {
			throw new Error('Missing AST payload');
		}

		return {
			code: raw.code,
			ast: raw.ast as PhpProgram,
		};
	} catch (error) {
		throw new WPKernelError('DeveloperError', {
			message:
				'Failed to parse pretty printer response for PHP artifacts.',
			data: {
				filePath: context.filePath,
				stderr: context.stderr,
				stdout,
				error:
					error instanceof Error
						? { message: error.message }
						: undefined,
			},
		});
	}
}

function logBridgeFailure(stdout: string, stderr: string): void {
	if (stderr.length > 0) {
		process.stderr.write(
			`[${WPK_NAMESPACE}.php-driver][stderr] ${JSON.stringify(stderr)}\n`
		);
	}
	if (stdout.length > 0) {
		process.stderr.write(
			`[${WPK_NAMESPACE}.php-driver][stdout] ${JSON.stringify(stdout)}\n`
		);
	}
	if (stderr.length === 0 && stdout.length === 0) {
		process.stderr.write(`[${WPK_NAMESPACE}.php-driver][stderr] ""\n`);
	}
}

function mergeAutoloadEnvValues(
	existingValue: string | undefined,
	additionalPaths: readonly string[]
): string | null {
	const segments: string[] = [];

	const pushUnique = (value: string) => {
		if (!segments.includes(value)) {
			segments.push(value);
		}
	};

	for (const value of splitAutoloadEnv(existingValue)) {
		pushUnique(value);
	}

	for (const value of additionalPaths) {
		pushUnique(value);
	}

	return segments.length > 0 ? segments.join(path.delimiter) : null;
}

function splitAutoloadEnv(value: string | undefined): string[] {
	if (typeof value !== 'string' || value.trim() === '') {
		return [];
	}

	return value
		.split(path.delimiter)
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0);
}

function normalizeAutoloadPaths(
	paths: readonly string[] | undefined
): string[] {
	if (!Array.isArray(paths) || paths.length === 0) {
		return [];
	}

	const normalized: string[] = [];

	for (const entry of paths) {
		if (typeof entry !== 'string') {
			continue;
		}

		const trimmed = entry.trim();
		if (trimmed.length === 0) {
			continue;
		}

		normalized.push(trimmed);
	}

	return normalized;
}
