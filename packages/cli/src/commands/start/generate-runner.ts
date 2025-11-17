import type { Reporter } from '@wpkernel/core/reporter';
import type {
	BuildGenerateCommandOptions,
	GenerateResult,
} from '../generate/types';
import { buildGenerateDependencies } from '../generate/dependencies';
import { runGenerateWorkflow } from '../generate';

export type GenerateRunner = (options: {
	readonly reporter: Reporter;
	readonly verbose: boolean;
	readonly cwd: string;
	readonly allowDirty?: boolean;
}) => Promise<GenerateResult>;

export function createGenerateRunner(
	options: BuildGenerateCommandOptions = {}
): GenerateRunner {
	const dependencies = buildGenerateDependencies(options);
	return async ({ reporter, verbose, cwd, allowDirty }) =>
		runGenerateWorkflow({
			dependencies,
			reporter,
			dryRun: false,
			verbose,
			cwd,
			allowDirty: allowDirty === true,
		});
}
