import { buildProject } from './utils';
import {
	type BuildTsFormatterOptions,
	type TsFormatter,
	type TsFormatterFormatOptions,
} from '../types';

/**
 * Builds a TypeScript formatter instance.
 *
 * This function creates a `TsFormatter` that can be used to format TypeScript
 * code using `ts-morph`'s built-in formatting capabilities.
 *
 * @category AST Builders
 * @param    options - Options for building the formatter.
 * @returns A `TsFormatter` instance.
 */

export function buildTsFormatter(
	options: BuildTsFormatterOptions = {}
): TsFormatter {
	const projectFactory = options.projectFactory ?? buildProject;

	async function format(
		formatOptions: TsFormatterFormatOptions
	): Promise<string> {
		const project = await Promise.resolve(projectFactory());
		const sourceFile = project.createSourceFile(
			formatOptions.filePath,
			formatOptions.contents,
			{
				overwrite: true,
			}
		);

		sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
		const formatted = sourceFile.getFullText();
		sourceFile.forget();

		return formatted;
	}

	return { format };
}
