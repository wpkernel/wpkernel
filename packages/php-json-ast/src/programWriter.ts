import { createHelper } from '@wpkernel/pipeline';
import { buildPhpPrettyPrinter } from './php-driver';
import type {
	BuilderHelper,
	PipelineContext,
	BuilderInput,
	BuilderOutput,
} from './programBuilder';
import { getPhpBuilderChannel } from './builderChannel';
import type { PhpProgramAction } from './builderChannel';
import type { PhpProgram } from './nodes';
import {
	persistCodemodDiagnostics,
	persistProgramArtifacts,
} from './utils/programArtifacts';

export interface PhpDriverConfigurationOptions {
	readonly binary?: string;
	readonly scriptPath?: string;
	readonly importMetaUrl?: string;
	readonly autoloadPaths?: readonly string[];
}

export interface CreatePhpProgramWriterHelperOptions {
	readonly driver?: PhpDriverConfigurationOptions;
	readonly key?: string;
}

type BuilderApplyOptions<
	TContext extends PipelineContext,
	TInput extends BuilderInput,
	TOutput extends BuilderOutput,
> = Parameters<BuilderHelper<TContext, TInput, TOutput>['apply']>[0];
type BuilderNext = Parameters<BuilderHelper['apply']>[1];

export function createPhpProgramWriterHelper<
	TContext extends PipelineContext = PipelineContext,
	TInput extends BuilderInput = BuilderInput,
	TOutput extends BuilderOutput = BuilderOutput,
>(
	options: CreatePhpProgramWriterHelperOptions = {}
): BuilderHelper<TContext, TInput, TOutput> {
	return createHelper<
		TContext,
		TInput,
		TOutput,
		PipelineContext['reporter'],
		'builder'
	>({
		key: options.key ?? 'builder.generate.php.writer',
		kind: 'builder',
		async apply(
			helperOptions: BuilderApplyOptions<TContext, TInput, TOutput>,
			next?: BuilderNext
		) {
			const { context, reporter, output } = helperOptions;
			const channel = getPhpBuilderChannel(context);
			const pending = channel.drain();

			if (pending.length === 0) {
				reporter.debug(
					'createPhpProgramWriterHelper: no programs queued.'
				);
				await next?.();
				return;
			}

			const prettyPrinterOptions: Parameters<
				typeof buildPhpPrettyPrinter
			>[0] = {
				workspace: context.workspace,
				phpBinary: options.driver?.binary,
				scriptPath: options.driver?.scriptPath,
				autoloadPaths: options.driver?.autoloadPaths,
			};

			if (options.driver?.importMetaUrl) {
				(
					prettyPrinterOptions as { importMetaUrl?: string }
				).importMetaUrl = options.driver.importMetaUrl;
			}

			const prettyPrinter = buildPhpPrettyPrinter(prettyPrinterOptions);

			await processPendingPrograms(
				context,
				output,
				reporter,
				pending,
				prettyPrinter
			);

			await next?.();
		},
	});
}

async function processPendingPrograms(
	context: PipelineContext,
	output: BuilderOutput,
	reporter: PipelineContext['reporter'],
	pending: readonly PhpProgramAction[],
	prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>
): Promise<void> {
	for (const action of pending) {
		const { code, ast } = await prettyPrinter.prettyPrint({
			filePath: action.file,
			program: action.program,
		});

		const finalAst = (ast ?? action.program) as PhpProgram;

		await persistProgramArtifacts(
			context,
			output,
			action.file,
			code,
			finalAst
		);

		if (action.codemod) {
			await persistCodemodDiagnostics(
				context,
				output,
				action.file,
				action.codemod
			);
		}

		reporter.debug('createPhpProgramWriterHelper: emitted PHP artifact.', {
			file: action.file,
		});
	}
}
