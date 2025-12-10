import path from 'node:path';
import type * as tsModule from 'typescript';
import { WPKernelError } from '@wpkernel/core/contracts';
import type { Reporter } from '@wpkernel/core/reporter';
import type { GenerationSummary } from './types';

/**
 * Options for validating generated imports.
 *
 * @category Commands
 * @public
 */
export interface ValidateGeneratedImportsOptions {
	projectRoot: string;
	summary: GenerationSummary;
	reporter: Reporter;
}

type TypeScriptModule = typeof tsModule;

type CompilerOptions = tsModule.CompilerOptions;
type Diagnostic = tsModule.Diagnostic;

const RELEVANT_MESSAGE_PATTERNS = [
	/Cannot find module/i,
	/has no exported member/i,
	/does not contain a default export/i,
	/File '.+' is not a module/i,
	/Could not find a declaration file for module/i,
];

const SCRIPT_EXTENSIONS = new Set([
	'.ts',
	'.tsx',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
]);

export async function validateGeneratedImports({
	projectRoot,
	summary,
	reporter,
}: ValidateGeneratedImportsOptions): Promise<void> {
	if (summary.dryRun) {
		reporter.debug(
			'Skipping import validation because dry-run mode is enabled.'
		);
		return;
	}

	const scriptEntries = summary.entries.filter(
		(entry: GenerationSummary['entries'][number]) =>
			entry.status !== 'skipped' && isScriptFile(entry.path)
	);

	if (scriptEntries.length === 0) {
		reporter.debug('No generated script artifacts to validate.');
		return;
	}

	const ts = await loadTypeScript(reporter);

	if (!ts) {
		return;
	}
	const compilerOptions = await loadCompilerOptions(ts, projectRoot);
	compilerOptions.noEmit = true;

	const rootNames = Array.from(
		new Set(
			scriptEntries.map((entry: GenerationSummary['entries'][number]) =>
				toAbsolutePath(projectRoot, entry.path)
			)
		)
	);
	const generatedPathSet = new Set(
		rootNames.map((filePath) => normalisePath(filePath))
	);

	const host = ts.createCompilerHost(compilerOptions, true);
	const program = ts.createProgram({
		rootNames,
		options: compilerOptions,
		host,
	});

	const diagnostics = [
		...program.getOptionsDiagnostics(),
		...program.getSyntacticDiagnostics(),
		...program.getSemanticDiagnostics(),
	];

	const relevantDiagnostics = diagnostics.filter((diagnostic) =>
		isRelevantDiagnostic(ts, diagnostic, generatedPathSet, projectRoot)
	);

	if (relevantDiagnostics.length === 0) {
		reporter.debug(
			'Module export validation passed for generated artifacts.',
			{
				checkedFiles: scriptEntries.map((entry) => entry.path),
			}
		);
		return;
	}

	const formatted = ts.formatDiagnosticsWithColorAndContext(
		relevantDiagnostics,
		{
			getCanonicalFileName: (fileName: string) =>
				normaliseRelativePath(projectRoot, fileName),
			getCurrentDirectory: () => projectRoot,
			getNewLine: () => ts.sys.newLine,
		}
	);

	throw new WPKernelError('ValidationError', {
		message:
			'Generated artifacts reference modules or exports that do not exist. Ensure project dependencies are installed and builders are up to date.',
		context: {
			diagnostics: relevantDiagnostics.map((diagnostic) => ({
				code: diagnostic.code,
				message: ts.flattenDiagnosticMessageText(
					diagnostic.messageText,
					'\n'
				),
				file: diagnostic.file
					? normaliseRelativePath(
							projectRoot,
							diagnostic.file.fileName
						)
					: undefined,
			})),
		},
		data: {
			formattedDiagnostics: formatted,
		},
	});
}

async function loadTypeScript(
	reporter: Reporter
): Promise<TypeScriptModule | null> {
	try {
		return await import('typescript');
	} catch (error) {
		if (isMissingTypeScriptError(error)) {
			reporter.warn(
				'Skipping generated import validation because TypeScript is not installed. Install it to enable validation.'
			);
			return null;
		}

		throw new WPKernelError('DeveloperError', {
			message:
				'TypeScript is required to validate generated imports. Install it as a development dependency.',
			data:
				error instanceof Error
					? { originalError: error }
					: { rawError: error },
		});
	}
}

async function loadCompilerOptions(
	ts: TypeScriptModule,
	projectRoot: string
): Promise<CompilerOptions> {
	const configPath =
		findProjectConfigPath(ts, projectRoot, 'tsconfig.json') ??
		findProjectConfigPath(ts, projectRoot, 'jsconfig.json');

	if (!configPath) {
		return applyCompilerOptionDefaults(ts, projectRoot, {});
	}

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

	if (configFile.error) {
		const formatted = ts.formatDiagnosticsWithColorAndContext(
			[configFile.error],
			{
				getCanonicalFileName: (fileName: string) =>
					normaliseRelativePath(projectRoot, fileName),
				getCurrentDirectory: () => projectRoot,
				getNewLine: () => ts.sys.newLine,
			}
		);

		throw new WPKernelError('DeveloperError', {
			message: `Unable to read ${path.basename(configPath)} for validation.`,
			data: { diagnostics: formatted },
		});
	}

	const parsed = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname(configPath)
	);

	if (parsed.errors.length > 0) {
		const formatted = ts.formatDiagnosticsWithColorAndContext(
			parsed.errors,
			{
				getCanonicalFileName: (fileName: string) =>
					normaliseRelativePath(projectRoot, fileName),
				getCurrentDirectory: () => projectRoot,
				getNewLine: () => ts.sys.newLine,
			}
		);

		throw new WPKernelError('DeveloperError', {
			message: `${path.basename(configPath)} contains errors that block validation.`,
			data: { diagnostics: formatted },
		});
	}

	return applyCompilerOptionDefaults(ts, projectRoot, parsed.options);
}

function findProjectConfigPath(
	ts: TypeScriptModule,
	projectRoot: string,
	fileName: string
): string | undefined {
	return (
		ts.findConfigFile(projectRoot, ts.sys.fileExists, fileName) ?? undefined
	);
}

function applyCompilerOptionDefaults(
	ts: TypeScriptModule,
	projectRoot: string,
	options: CompilerOptions
): CompilerOptions {
	const resolved: CompilerOptions = { ...options };

	const defaults: Partial<CompilerOptions> = {
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		module: ts.ModuleKind.ESNext,
		target: ts.ScriptTarget.ES2022,
		jsx: ts.JsxEmit.ReactJSX,
		allowJs: true,
		skipLibCheck: true,
		esModuleInterop: true,
		allowSyntheticDefaultImports: true,
		resolveJsonModule: true,
	};

	for (const [key, value] of Object.entries(defaults) as Array<
		[keyof CompilerOptions, CompilerOptions[keyof CompilerOptions]]
	>) {
		if (resolved[key] === undefined) {
			resolved[key] = value;
		}
	}

	const normalisedProjectRoot = path.resolve(projectRoot);
	const resolvedBaseUrl = resolveBaseUrl(resolved.baseUrl);

	if (
		!resolvedBaseUrl ||
		!isPathWithin(normalisedProjectRoot, resolvedBaseUrl)
	) {
		resolved.baseUrl = normalisedProjectRoot;
	}

	return resolved;
}

function resolveBaseUrl(
	baseUrl: CompilerOptions['baseUrl']
): string | undefined {
	if (typeof baseUrl !== 'string') {
		return undefined;
	}

	try {
		return path.resolve(baseUrl);
	} catch (_error) {
		return undefined;
	}
}

function isPathWithin(root: string, candidate: string): boolean {
	const normalisedRoot = root.endsWith(path.sep)
		? root
		: `${root}${path.sep}`;
	const normalisedCandidate = candidate.endsWith(path.sep)
		? candidate
		: `${candidate}${path.sep}`;

	return (
		normalisedCandidate === normalisedRoot ||
		normalisedCandidate.startsWith(normalisedRoot)
	);
}

function isRelevantDiagnostic(
	ts: TypeScriptModule,
	diagnostic: Diagnostic,
	generatedPathSet: Set<string>,
	projectRoot: string
): boolean {
	if (
		diagnostic.file &&
		isApplyArtifact(projectRoot, diagnostic.file.fileName)
	) {
		return false;
	}

	if (diagnostic.category !== ts.DiagnosticCategory.Error) {
		return false;
	}

	const message = ts.flattenDiagnosticMessageText(
		diagnostic.messageText,
		'\n'
	);

	if (!RELEVANT_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
		return false;
	}

	if (!diagnostic.file) {
		return true;
	}

	const specifier = extractModuleSpecifier(diagnostic);
	if (specifier && !shouldValidateModule(specifier)) {
		return false;
	}

	const absolute = normalisePath(path.resolve(diagnostic.file.fileName));

	if (generatedPathSet.has(absolute)) {
		return true;
	}

	const relative = normaliseRelativePath(
		projectRoot,
		diagnostic.file.fileName
	);
	const resolvedRelative = normalisePath(path.resolve(projectRoot, relative));
	return generatedPathSet.has(resolvedRelative);
}

function isScriptFile(filePath: string): boolean {
	const extension = path.extname(filePath).toLowerCase();
	return SCRIPT_EXTENSIONS.has(extension);
}

function toAbsolutePath(projectRoot: string, filePath: string): string {
	return path.isAbsolute(filePath)
		? filePath
		: path.resolve(projectRoot, filePath);
}

function normalisePath(filePath: string): string {
	return path.resolve(filePath).split(path.sep).join('/');
}

function normaliseRelativePath(projectRoot: string, filePath: string): string {
	const relative = path.relative(projectRoot, path.resolve(filePath));
	if (!relative || relative === '.') {
		return path.basename(filePath);
	}
	return relative.split(path.sep).join('/');
}

function isApplyArtifact(projectRoot: string, filePath: string): boolean {
	const normalisedRoot = path.resolve(projectRoot);
	const applyRoot = path.resolve(path.join(normalisedRoot, '.wpk', 'apply'));
	const normalisedFilePath = path.resolve(filePath);

	return (
		normalisedFilePath === applyRoot ||
		normalisedFilePath.startsWith(`${applyRoot}${path.sep}`)
	);
}

function extractModuleSpecifier(diagnostic: Diagnostic): string | null {
	if (
		!diagnostic.file ||
		typeof diagnostic.start !== 'number' ||
		typeof diagnostic.length !== 'number'
	) {
		return null;
	}

	const sourceText = diagnostic.file.text;
	if (!sourceText) {
		return null;
	}

	const raw = sourceText
		.slice(diagnostic.start, diagnostic.start + diagnostic.length)
		.trim();

	if (raw.length === 0) {
		return null;
	}

	return raw.replace(/^['"`]/, '').replace(/['"`]$/, '');
}

function shouldValidateModule(specifier: string): boolean {
	if (specifier.startsWith('.')) {
		return true;
	}

	if (specifier.startsWith('@/')) {
		return true;
	}

	if (/^@wpkernel(\/|$)/.test(specifier)) {
		return true;
	}

	if (specifier.startsWith('@test-utils/')) {
		return true;
	}

	return false;
}

function isMissingTypeScriptError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}

	const code = (error as { code?: unknown }).code;

	if (code === 'MODULE_NOT_FOUND' || code === 'ERR_MODULE_NOT_FOUND') {
		const message = String(
			(error as { message?: unknown }).message ?? ''
		).toLowerCase();
		return message.includes('typescript');
	}

	const message = String(
		(error as { message?: unknown }).message ?? ''
	).toLowerCase();
	return message.includes("cannot find package 'typescript'");
}
