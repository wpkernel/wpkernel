import path from 'node:path';
import { WPKernelError } from '@wpkernel/core/error';
import {
	consumePhpProgramIngestion,
	runPhpCodemodIngestion,
} from '@wpkernel/php-json-ast';
import { createHelper } from '../../runtime';
import { resolveBundledPhpJsonAstIngestionPath } from '../../utils/phpAssets';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../../runtime/types';

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
		dependsOn: ['builder.generate.php.core'],
		async apply(
			helperOptions: BuilderApplyOptions,
			next?: BuilderNext
		): Promise<void> {
			const { context, input, reporter } = helperOptions;

			if (input.phase !== 'generate') {
				await next?.();
				return;
			}

			const targets = await resolveTargets(
				context.workspace.resolve.bind(context.workspace),
				context.workspace.exists.bind(context.workspace),
				reporter,
				options.files
			);

			if (targets.length === 0) {
				reporter.debug(
					'createPhpCodemodIngestionHelper: no codemod targets resolved.'
				);
				await next?.();
				return;
			}

			reporter.info(
				'createPhpCodemodIngestionHelper: running PHP codemod ingestion.',
				{
					files: targets,
				}
			);

			const configurationPath = options.configurationPath
				? resolvePath(
						context.workspace.resolve.bind(context.workspace),
						options.configurationPath
					)
				: undefined;

			const scriptPath =
				options.scriptPath ?? resolveBundledPhpJsonAstIngestionPath();

			const ingestionResult = await runPhpCodemodIngestion({
				workspaceRoot: context.workspace.root,
				files: targets,
				phpBinary: options.phpBinary,
				scriptPath,
				configurationPath,
				enableDiagnostics: options.enableDiagnostics,
				importMetaUrl: options.importMetaUrl,
				autoloadPaths: options.autoloadPaths,
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

			await next?.();
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
