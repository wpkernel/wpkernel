import { WPKernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import type { BuilderOutput, PipelinePhase } from '../../runtime/types';
import {
	type AdminDataViews,
	type ResourceDescriptor,
	type TsBuilderEmitOptions,
	type TsBuilderEmitResult,
} from '../types';
import type { IRResource, IRv1 } from '../../ir';
import type { Workspace } from '../../workspace';
import type { Project } from 'ts-morph';
import { loadTsMorph } from './runtime-loader';

/**
 * Extracts resource descriptors from the IR DataViews surface.
 *
 * @param    ir
 * @category Builders
 */
export function collectResourceDescriptors(ir: IRv1): ResourceDescriptor[] {
	const uiResources = ir.ui?.resources ?? [];
	if (uiResources.length === 0) {
		return [];
	}

	// Index IR resources by name for quick lookup
	const resourcesByName = new Map<string, IRResource>(
		ir.resources.map((resource) => [resource.name, resource])
	);

	return uiResources.reduce<ResourceDescriptor[]>((acc, uiResource) => {
		const irResource = resourcesByName.get(uiResource.resource);
		if (!irResource || !uiResource.dataviews) {
			return acc;
		}

		const adminUi = irResource.ui?.admin as { view?: string } | undefined;
		const adminView = adminUi?.view ?? 'dataviews';

		acc.push({
			key: uiResource.resource,
			name: irResource.name ?? uiResource.resource,
			resource: irResource, // instead of raw config
			adminView,
			dataviews: uiResource.dataviews as AdminDataViews,
		});

		return acc;
	}, []);
}

/**
 * Builds a helper that formats, writes, and tracks generated TS files.
 *
 * @param    workspace
 * @param    output
 * @param    emittedFiles
 * @category Builders
 */
export function buildEmitter(
	workspace: Workspace,
	output: BuilderOutput,
	emittedFiles: string[]
): (options: TsBuilderEmitOptions) => Promise<TsBuilderEmitResult> {
	return async ({ filePath, sourceFile }: TsBuilderEmitOptions) => {
		sourceFile.formatText({ ensureNewLineAtEndOfFile: true });
		const contents = sourceFile.getFullText();

		await workspace.write(filePath, contents);
		output.queueWrite({ file: filePath, contents });
		emittedFiles.push(filePath);

		sourceFile.forget();

		return { filePath, contents };
	};
}

/**
 * Guards the builder so it only runs during the `generate` pipeline phase.
 *
 * @param    phase
 * @param    reporter
 * @category Builders
 */
export function isGeneratePhase(
	phase: PipelinePhase,
	reporter: Reporter
): boolean {
	if (phase === 'generate') {
		return true;
	}

	reporter.debug('ts builder utils: skipping phase.', { phase });
	return false;
}

/**
 * Ensures the builder receives an IR instance before generating artifacts.
 *
 * @param    ir
 * @category Builders
 */
export function requireIr(ir: IRv1 | null): IRv1 {
	if (ir) {
		return ir;
	}

	throw new WPKernelError('ValidationError', {
		message:
			'ts builder utilities require an IR instance during execution.',
	});
}

export async function buildProject(): Promise<Project> {
	const { Project, IndentationText, QuoteKind, NewLineKind } =
		await loadTsMorph();

	return new Project({
		useInMemoryFileSystem: true,
		manipulationSettings: {
			indentationText: IndentationText.TwoSpaces,
			quoteKind: QuoteKind.Single,
			newLineKind: NewLineKind.LineFeed,
		},
	});
}
