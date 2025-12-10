import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderInput,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import type { CreatePhpProgramWriterHelperOptions } from '@wpkernel/php-json-ast';
import { createWpProgramWriterHelper as createCoreProgramWriterHelper } from '@wpkernel/wp-json-ast';
import { getPhpBuilderConfigState } from './pipeline.builder';

/**
 * Creates a PHP builder helper for writing PHP program files to the filesystem.
 *
 * This helper takes the generated PHP program representations from the channel
 * and writes them to the appropriate output directory, using the configured
 * PHP driver for formatting and pretty-printing.
 *
 * @category AST Builders
 * @param    options - Options for configuring the PHP program writer.
 * @returns A `BuilderHelper` instance for writing PHP program files.
 */
export function createWpProgramWriterHelper(
	options: CreatePhpProgramWriterHelperOptions = {}
): BuilderHelper {
	return createHelper({
		key: options.key ?? 'builder.generate.php.writer',
		kind: 'builder',
		dependsOn: [
			'builder.generate.php.channel.bootstrap',
			'builder.generate.php.config',
		],
		async apply(applyOptions: BuilderApplyOptions) {
			const mergedOptions = {
				emitAst: false,
				...options,
			} as CreatePhpProgramWriterHelperOptions;
			const config = getPhpBuilderConfigState(applyOptions.context);
			const helper = createCoreProgramWriterHelper<
				PipelineContext,
				BuilderInput,
				BuilderOutput
			>({
				...mergedOptions,
				driver: mergedOptions.driver ?? config.driver,
			});

			await helper.apply(applyOptions);
		},
	});
}

/**
 * @deprecated Use {@link createWpProgramWriterHelper} instead.
 */
export const createPhpProgramWriterHelper = createWpProgramWriterHelper;
