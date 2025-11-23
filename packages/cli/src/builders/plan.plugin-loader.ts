import { type buildPhpPrettyPrinter } from '@wpkernel/php-json-ast';
import type { BuilderApplyOptions } from '../runtime/types';
import type { PlanInstruction } from './types';
import { buildPluginLoaderProgram } from '@wpkernel/wp-json-ast';
import path from 'path';
import { buildUiConfig } from './php/pluginLoader.ui';
import { resolvePlanPaths } from './plan.paths';
import { toPascalCase } from './ts';

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

type PluginIr = NonNullable<BuilderApplyOptions['input']['ir']>;

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
	const pluginLoaderPath = paths.pluginLoader;

	if (!ir) {
		reporter.warn(
			'createApplyPlanBuilder: IR artifact missing, skipping plugin loader emission.'
		);
		return null;
	}

	const existingPlugin = await readExistingPlugin({
		context,
		pluginLoaderPath,
	});

	const resourceClassNames = buildResourceClassNames(ir);
	const uiConfig = buildUiConfig(ir);
	const phpGeneratedPath = resolvePhpGeneratedPath(ir);
	const generatedLoaderPath = path.posix.join(phpGeneratedPath, 'plugin.php');

	const generatedContents = await readGeneratedLoader({
		context,
		generatedLoaderPath,
	});

	const code = await resolvePluginLoaderCode({
		ir,
		uiConfig,
		phpGeneratedPath,
		resourceClassNames,
		context,
		prettyPrinter,
		generatedLoaderPath,
		generatedContents,
	});

	if (!code) {
		reporter.warn(
			'createApplyPlanBuilder: unable to resolve generated plugin loader; skipping.'
		);
		return null;
	}

	const incomingPath = path.posix.join(
		paths.planIncoming,
		paths.pluginLoader
	);
	const basePath = path.posix.join(paths.planBase, paths.pluginLoader);

	await writeIncomingAndBase({
		context,
		output,
		incomingPath,
		basePath,
		code,
		existingPlugin,
	});

	reporter.debug('createApplyPlanBuilder: queued plugin loader instruction.');

	return {
		action: 'write',
		file: pluginLoaderPath,
		base: basePath,
		incoming: incomingPath,
		description: 'Update plugin loader',
	} satisfies PlanInstruction;
}

function buildResourceClassNames(ir: PluginIr): string[] {
	return ir.resources.map((resource) => {
		if (resource.controllerClass) {
			return resource.controllerClass;
		}
		const pascal = toPascalCase(resource.name);
		return `${ir.php.namespace}\\Generated\\Rest\\${pascal}Controller`;
	});
}

function resolvePhpGeneratedPath(ir: PluginIr): string {
	return ir.layout?.resolve('php.generated') ?? ir.php.outputDir;
}

async function readExistingPlugin({
	context,
	pluginLoaderPath,
}: {
	context: BuilderApplyOptions['context'];
	pluginLoaderPath: string;
}): Promise<string | null> {
	const existingPlugin =
		(await context.workspace.readText(pluginLoaderPath)) ?? null;
	return existingPlugin;
}

async function readGeneratedLoader({
	context,
	generatedLoaderPath,
}: {
	context: BuilderApplyOptions['context'];
	generatedLoaderPath: string;
}): Promise<string | undefined> {
	const contents =
		(await context.workspace.readText(generatedLoaderPath)) ?? undefined;
	return contents;
}

async function resolvePluginLoaderCode({
	ir,
	uiConfig,
	phpGeneratedPath,
	resourceClassNames,
	context,
	prettyPrinter,
	generatedLoaderPath,
	generatedContents,
}: {
	ir: PluginIr;
	uiConfig: ReturnType<typeof buildUiConfig>;
	phpGeneratedPath: string;
	resourceClassNames: string[];
	context: BuilderApplyOptions['context'];
	prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
	generatedLoaderPath: string;
	generatedContents: string | undefined;
}): Promise<string | null> {
	if (generatedContents) {
		return generatedContents;
	}

	const baseConfig = {
		origin: ir.meta.origin,
		namespace: ir.php.namespace,
		sanitizedNamespace: ir.meta.sanitizedNamespace,
		plugin: ir.meta.plugin,
		resourceClassNames,
		phpGeneratedPath,
	};

	const program = buildPluginLoaderProgram(
		uiConfig ? { ...baseConfig, ui: uiConfig } : baseConfig
	);

	const printed = await prettyPrinter.prettyPrint({
		filePath: context.workspace.resolve(generatedLoaderPath),
		program,
	});

	return printed.code ?? null;
}

async function writeIncomingAndBase({
	context,
	output,
	incomingPath,
	basePath,
	code,
	existingPlugin,
}: {
	context: BuilderApplyOptions['context'];
	output: BuilderApplyOptions['output'];
	incomingPath: string;
	basePath: string;
	code: string;
	existingPlugin: string | null;
}): Promise<void> {
	await context.workspace.write(incomingPath, code, { ensureDir: true });
	output.queueWrite({ file: incomingPath, contents: code });

	const existingBase = await context.workspace.readText(basePath);
	if (existingBase !== null) {
		return;
	}

	const baseSnapshot = existingPlugin ?? code;
	await context.workspace.write(basePath, baseSnapshot, {
		ensureDir: true,
	});
	output.queueWrite({ file: basePath, contents: baseSnapshot });
}
