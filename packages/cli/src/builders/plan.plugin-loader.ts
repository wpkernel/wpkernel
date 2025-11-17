import { type buildPhpPrettyPrinter } from '@wpkernel/php-json-ast';
import type { BuilderApplyOptions } from '../runtime/types';
import type { PlanInstruction } from './types';
import {
	AUTO_GUARD_BEGIN,
	buildPluginLoaderProgram,
} from '@wpkernel/wp-json-ast';
import path from 'path';
import { buildUiConfig } from './php/pluginLoader.ui';
import { toPascalCase } from './ts';
import { resolvePlanPaths } from './plan.paths';

export async function addPluginLoaderInstruction({
	options,
	prettyPrinter,
	instructions,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
	readonly instructions: PlanInstruction[];
}): Promise<void> {
	const loaderInstruction = await emitPluginLoader({
		options,
		prettyPrinter,
	});
	if (loaderInstruction) {
		instructions.push(loaderInstruction);
	}
}

export async function emitPluginLoader({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<PlanInstruction | null> {
	const { input, context, output, reporter } = options;
	const { ir } = input;
	const paths = resolvePlanPaths(options);

	if (!ir) {
		reporter.warn(
			'createApplyPlanBuilder: IR artifact missing, skipping plugin loader emission.'
		);
		return null;
	}

	let existingPlugin: string | null = null;
	try {
		existingPlugin = await context.workspace.readText('plugin.php');
	} catch {
		existingPlugin = null;
	}

	if (
		existingPlugin &&
		!new RegExp(AUTO_GUARD_BEGIN, 'u').test(existingPlugin)
	) {
		reporter.info(
			'createApplyPlanBuilder: skipping plugin loader instruction because plugin.php appears user-owned.'
		);
		return null;
	}

	const resourceClassNames = ir.resources.map((resource) => {
		const pascal = toPascalCase(resource.name);
		return `${ir.php.namespace}\\Generated\\Rest\\${pascal}Controller`;
	});

	const uiResources = ir.ui?.resources ?? [];
	const uiConfig = buildUiConfig(ir, uiResources);

	const program = buildPluginLoaderProgram({
		origin: ir.meta.origin,
		namespace: ir.php.namespace,
		sanitizedNamespace: ir.meta.sanitizedNamespace,
		resourceClassNames,
		...(uiConfig ? { ui: uiConfig } : {}),
	});

	const incomingPath = path.posix.join(
		paths.planIncoming,
		paths.pluginLoader
	);
	const basePath = path.posix.join(paths.planBase, paths.pluginLoader);

	const { code } = await prettyPrinter.prettyPrint({
		filePath: context.workspace.resolve(incomingPath),
		program,
	});

	await context.workspace.write(incomingPath, code, { ensureDir: true });
	output.queueWrite({ file: incomingPath, contents: code });

	const existingBase = await context.workspace.readText(basePath);
	if (existingBase === null) {
		const baseSnapshot = existingPlugin ?? code;
		await context.workspace.write(basePath, baseSnapshot, {
			ensureDir: true,
		});
		output.queueWrite({ file: basePath, contents: baseSnapshot });
	}

	reporter.debug('createApplyPlanBuilder: queued plugin loader instruction.');

	return {
		action: 'write',
		file: 'plugin.php',
		base: basePath,
		incoming: incomingPath,
		description: 'Update plugin loader',
	} satisfies PlanInstruction;
}
