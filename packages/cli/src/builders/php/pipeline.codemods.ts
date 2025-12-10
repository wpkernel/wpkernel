import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import {
	consumePhpProgramIngestion,
	runPhpCodemodIngestion,
} from '@wpkernel/php-json-ast';
import { createHelper } from '../../runtime';
import { getPhpBuilderConfigState } from './pipeline.builder';
import { resolveBundledPhpJsonAstIngestionPath } from '../../utils/phpAssets';
import type { BuilderApplyOptions, BuilderHelper } from '../../runtime/types';

export interface CreatePhpCodemodIngestionHelperOptions {
	readonly files: readonly string[];
	readonly configurationPath?: string;
	readonly enableDiagnostics?: boolean;
	readonly phpBinary?: string;
	readonly scriptPath?: string;
	readonly importMetaUrl?: string;
	readonly autoloadPaths?: readonly string[];
}

export function createPhpCodemodIngestionHelper(
	options: CreatePhpCodemodIngestionHelperOptions
): BuilderHelper {
	return createHelper({
		key: 'builder.generate.php.codemod-ingestion',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.channel.bootstrap',
			'builder.generate.php.config',
		],
		async apply(helperOptions: BuilderApplyOptions): Promise<void> {
			const { context, input, reporter } = helperOptions;

			if (input.phase !== 'generate') {
				return;
			}

			const resolvedOptions = pickCodemodOptions({
				context,
				reporter,
				options,
			});
			if (!resolvedOptions) {
				return;
			}

			const targets = await resolveTargets(
				context.workspace.resolve.bind(context.workspace),
				context.workspace.exists.bind(context.workspace),
				reporter,
				resolvedOptions.files
			);

			if (targets.length === 0) {
				reporter.debug(
					'createPhpCodemodIngestionHelper: no codemod targets resolved.'
				);
				return;
			}

			reporter.info(
				'createPhpCodemodIngestionHelper: running PHP codemod ingestion.',
				{
					files: targets,
				}
			);

			const configurationPath = resolvedOptions.configurationPath
				? resolvePath(
						context.workspace.resolve.bind(context.workspace),
						resolvedOptions.configurationPath
					)
				: undefined;

			const scriptPath =
				resolvedOptions.scriptPath ??
				resolveBundledPhpJsonAstIngestionPath();

			const ingestionResult = await runPhpCodemodIngestion({
				workspaceRoot: context.workspace.root,
				files: targets,
				phpBinary: resolvedOptions.phpBinary,
				scriptPath,
				configurationPath,
				enableDiagnostics: resolvedOptions.enableDiagnostics,
				importMetaUrl: resolvedOptions.importMetaUrl,
				autoloadPaths: resolvedOptions.autoloadPaths,
			});

			if (ingestionResult.exitCode !== 0) {
				throw new WPKernelError('DeveloperError', {
					message: 'PHP codemod ingestion failed.',
					data: {
						exitCode: ingestionResult.exitCode,
						stderr: ingestionResult.stderr,
					},
				});
			}

			const source = toAsyncIterable(ingestionResult.lines);
			await consumePhpProgramIngestion({
				context,
				source,
				reporter,
				defaultMetadata: { kind: 'codemod-ingestion' },
			});

			reporter.info(
				'createPhpCodemodIngestionHelper: codemod ingestion completed.',
				{
					files: targets,
				}
			);
		},
	});
}

function resolvePath(
	resolve: (...segments: string[]) => string,
	candidate: string
): string {
	return path.isAbsolute(candidate) ? candidate : resolve(candidate);
}

async function resolveTargets(
	resolve: (...segments: string[]) => string,
	exists: (target: string) => Promise<boolean>,
	reporter: BuilderApplyOptions['reporter'],
	files: readonly string[]
): Promise<string[]> {
	const resolved: string[] = [];
	const seen = new Set<string>();

	for (const file of files) {
		if (typeof file !== 'string' || file.length === 0) {
			continue;
		}

		const absolute = resolve(file);
		if (seen.has(absolute)) {
			continue;
		}

		seen.add(absolute);

		if (!(await exists(absolute))) {
			reporter.warn(
				'createPhpCodemodIngestionHelper: codemod target missing, skipping.',
				{
					file,
				}
			);
			continue;
		}

		resolved.push(absolute);
	}

	return resolved;
}

async function* toAsyncIterable(
	lines: readonly string[]
): AsyncIterable<string> {
	for (const line of lines) {
		yield line;
	}
}

function pickCodemodOptions(options: {
	readonly context: BuilderApplyOptions['context'];
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly options?: CreatePhpCodemodIngestionHelperOptions;
}): CreatePhpCodemodIngestionHelperOptions | null {
	const resolved =
		(options.options?.files?.length ?? 0) > 0
			? options.options
			: getPhpBuilderConfigState(options.context).codemods;

	if (!resolved || resolved.files.length === 0) {
		options.reporter.debug(
			'createPhpCodemodIngestionHelper: no codemod targets resolved.'
		);
		return null;
	}

	return resolved;
}
