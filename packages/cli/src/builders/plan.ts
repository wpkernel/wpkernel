import fs from 'node:fs/promises';
import path from 'node:path';
import {
	buildArg,
	buildBinaryOperation,
	buildBooleanNot,
	buildClass,
	buildDeclare,
	buildDeclareItem,
	buildDocComment,
	buildFuncCall,
	buildIdentifier,
	buildName,
	buildNamespace,
	buildScalarInt,
	buildScalarString,
	buildStmtNop,
	type PhpAttributes,
	type PhpExpr,
	type PhpName,
	type PhpStmt,
} from '@wpkernel/php-json-ast';
import { buildPhpPrettyPrinter } from '@wpkernel/php-json-ast/php-driver';
import { buildNode } from '@wpkernel/php-json-ast/nodes/base';
import {
	AUTO_GUARD_BEGIN,
	buildPluginLoaderProgram,
} from '@wpkernel/wp-json-ast';
import { createHelper } from '../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
} from '../runtime/types';
import type { IRResource, IRv1 } from '../ir/publicTypes';
import { toPascalCase } from './php/utils';
import {
	resolveBundledPhpDriverPrettyPrintPath,
	resolveBundledComposerAutoloadPath,
} from '../utils/phpAssets';
import {
	buildGenerationManifestFromIr,
	type GenerationManifestDiff,
	diffGenerationState,
} from '../apply/manifest';
import {
	type PlanFile,
	type PlanInstruction,
	type PlanDeletionSkip,
	type BuildShimOptions,
} from './types';
import { buildUiConfig } from './php/pluginLoader.ui';
import { toWorkspaceRelative } from '../workspace';

const PLAN_PATH = path.posix.join('.wpk', 'apply', 'plan.json');
const PLAN_BASE_ROOT = path.posix.join('.wpk', 'apply', 'base');
const PLAN_INCOMING_ROOT = path.posix.join('.wpk', 'apply', 'incoming');
const GENERATED_BLOCKS_ROOT = path.posix.join('.generated', 'blocks');
const SURFACED_BLOCKS_ROOT = path.posix.join('src', 'blocks');

const PLAN_PRETTY_PRINT_SCRIPT_PATH = resolveBundledPhpDriverPrettyPrintPath();
const PLAN_PRETTY_PRINT_AUTOLOAD_PATH = resolveBundledComposerAutoloadPath();

/**
 * Creates a builder helper for generating an apply plan.
 *
 * This helper analyzes the differences between the current generation state
 * and the desired state (based on the IR) and creates a plan of actions
 * (writes, deletions) to bring the workspace up to date. This plan is then
 * used by the `createPatcher` helper.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating the apply plan.
 */
export function createApplyPlanBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.apply.plan',
		kind: 'builder',
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, reporter } = options;
			if (input.phase !== 'generate') {
				await next?.();
				return;
			}

			const prettyPrinter = buildPhpPrettyPrinter({
				workspace: options.context.workspace,
				scriptPath: PLAN_PRETTY_PRINT_SCRIPT_PATH,
				autoloadPaths: [PLAN_PRETTY_PRINT_AUTOLOAD_PATH],
			});

			const plan = await collectPlanInstructions({
				options,
				prettyPrinter,
			});

			await writePlan(options, plan);
			if (
				plan.instructions.length === 0 &&
				plan.skippedDeletions.length === 0
			) {
				reporter.info(
					'createApplyPlanBuilder: no apply plan instructions emitted.'
				);
			} else {
				reporter.info(
					'createApplyPlanBuilder: emitted apply plan instructions.',
					{
						files: plan.instructions.map(
							(instruction) => instruction.file
						),
					}
				);
			}

			if (plan.skippedDeletions.length > 0) {
				reporter.info(
					'createApplyPlanBuilder: guarded shim deletions due to local changes.',
					{
						files: plan.skippedDeletions.map((entry) => entry.file),
					}
				);
			}

			await next?.();
		},
	});
}

async function collectPlanInstructions({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<PlanFile> {
	const { input, reporter } = options;
	const instructions: PlanInstruction[] = [];

	await addPluginLoaderInstruction({ options, prettyPrinter, instructions });

	if ((input.ir?.resources?.length ?? 0) === 0) {
		reporter.debug(
			'createApplyPlanBuilder: no resources to generate shims for.'
		);
	}

	const resourceInstructions = await collectResourceInstructions({
		options,
		prettyPrinter,
	});
	instructions.push(...resourceInstructions);

	const blockSurfaceResult = await collectBlockSurfaceInstructions({
		options,
	});
	instructions.push(...blockSurfaceResult.instructions);

	const blockDeletionResult = await collectBlockDeletionInstructions({
		options,
		generatedSuffixes: blockSurfaceResult.generatedSuffixes,
	});
	instructions.push(...blockDeletionResult.instructions);

	const nextManifest = buildGenerationManifestFromIr(input.ir ?? null);
	const diff = diffGenerationState(
		options.context.generationState,
		nextManifest
	);

	const { instructions: deletionInstructions, skippedDeletions } =
		await collectDeletionInstructions({
			diff,
			workspace: options.context.workspace,
			reporter,
		});
	instructions.push(...deletionInstructions);

	const allSkipped = [
		...blockDeletionResult.skippedDeletions,
		...skippedDeletions,
	];

	return { instructions, skippedDeletions: allSkipped } satisfies PlanFile;
}

async function addPluginLoaderInstruction({
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

async function collectResourceInstructions({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<PlanInstruction[]> {
	const resourceInstructions: PlanInstruction[] = [];

	for (const resource of options.input.ir?.resources ?? []) {
		const instruction = await emitShim({
			options,
			prettyPrinter,
			resource,
		});
		if (instruction) {
			resourceInstructions.push(instruction);
		}
	}

	return resourceInstructions;
}

async function collectBlockSurfaceInstructions({
	options,
}: {
	readonly options: BuilderApplyOptions;
}): Promise<{
	instructions: PlanInstruction[];
	generatedSuffixes: Set<string>;
}> {
	const instructions: PlanInstruction[] = [];
	const generatedSuffixes = new Set<string>();
	const { context, output, reporter } = options;
	const candidates = await context.workspace.glob([
		path.posix.join(GENERATED_BLOCKS_ROOT, '*'),
		path.posix.join(GENERATED_BLOCKS_ROOT, '**/*'),
	]);
	if (candidates.length === 0) {
		return { instructions, generatedSuffixes };
	}

	for (const absolute of candidates) {
		const stats = await statIfFile(absolute);
		if (!stats) {
			continue;
		}

		const workspaceRelative = toWorkspaceRelative(
			context.workspace,
			absolute
		);
		const suffix = path.posix.relative(
			GENERATED_BLOCKS_ROOT,
			workspaceRelative
		);
		if (suffix.startsWith('..') || suffix.length === 0) {
			continue;
		}

		const sourceContents = await context.workspace.read(workspaceRelative);
		if (!sourceContents) {
			continue;
		}

		const targetFile = path.posix.join(SURFACED_BLOCKS_ROOT, suffix);
		const incomingPath = path.posix.join(PLAN_INCOMING_ROOT, targetFile);
		const basePath = path.posix.join(PLAN_BASE_ROOT, targetFile);

		await context.workspace.write(incomingPath, sourceContents, {
			ensureDir: true,
		});
		output.queueWrite({ file: incomingPath, contents: sourceContents });

		const existingBase = await context.workspace.read(basePath);
		if (existingBase === null) {
			const targetSnapshot = await context.workspace.read(targetFile);
			const baseSnapshot = targetSnapshot ?? sourceContents;
			await context.workspace.write(basePath, baseSnapshot, {
				ensureDir: true,
			});
			output.queueWrite({ file: basePath, contents: baseSnapshot });
		}

		generatedSuffixes.add(suffix);

		instructions.push({
			action: 'write',
			file: targetFile,
			base: basePath,
			incoming: incomingPath,
			description: `Update block asset ${suffix}`,
		});
	}

	if (instructions.length > 0) {
		reporter.debug(
			'createApplyPlanBuilder: queued block asset surfacing instructions.',
			{
				files: instructions.map((instruction) => instruction.file),
			}
		);
	}

	return { instructions, generatedSuffixes };
}

async function collectBlockDeletionInstructions({
	options,
	generatedSuffixes,
}: {
	readonly options: BuilderApplyOptions;
	readonly generatedSuffixes: ReadonlySet<string>;
}): Promise<{
	instructions: PlanInstruction[];
	skippedDeletions: PlanDeletionSkip[];
}> {
	const instructions: PlanInstruction[] = [];
	const skippedDeletions: PlanDeletionSkip[] = [];
	const { context, reporter } = options;
	const targets = await context.workspace.glob([
		path.posix.join(SURFACED_BLOCKS_ROOT, '*'),
		path.posix.join(SURFACED_BLOCKS_ROOT, '**/*'),
	]);

	for (const target of targets) {
		const stats = await statIfFile(target);
		if (!stats) {
			continue;
		}

		const workspaceRelative = toWorkspaceRelative(
			context.workspace,
			target
		);
		const suffix = path.posix.relative(
			SURFACED_BLOCKS_ROOT,
			workspaceRelative
		);
		if (suffix.startsWith('..') || suffix.length === 0) {
			continue;
		}

		if (generatedSuffixes.has(suffix)) {
			continue;
		}

		const currentContents =
			await context.workspace.readText(workspaceRelative);
		if (currentContents === null) {
			continue;
		}

		const basePath = path.posix.join(PLAN_BASE_ROOT, workspaceRelative);
		const baseContents = await context.workspace.readText(basePath);
		if (baseContents === null) {
			skippedDeletions.push({
				file: workspaceRelative,
				description: `Remove block asset ${suffix}`,
				reason: 'missing-base',
			});
			reporter.debug(
				'createApplyPlanBuilder: skipping block deletion due to missing base snapshot.',
				{ file: workspaceRelative }
			);
			continue;
		}

		if (baseContents !== currentContents) {
			skippedDeletions.push({
				file: workspaceRelative,
				description: `Remove block asset ${suffix}`,
				reason: 'modified-target',
			});
			reporter.debug(
				'createApplyPlanBuilder: skipping block deletion for modified target.',
				{ file: workspaceRelative }
			);
			continue;
		}

		instructions.push({
			action: 'delete',
			file: workspaceRelative,
			description: `Remove block asset ${suffix}`,
		});
	}

	return { instructions, skippedDeletions };
}

async function collectDeletionInstructions({
	diff,
	workspace,
	reporter,
}: {
	readonly diff: GenerationManifestDiff;
	readonly workspace: BuilderApplyOptions['context']['workspace'];
	readonly reporter: BuilderApplyOptions['reporter'];
}): Promise<{
	instructions: PlanInstruction[];
	skippedDeletions: PlanDeletionSkip[];
}> {
	const instructions: PlanInstruction[] = [];
	const skippedDeletions: PlanDeletionSkip[] = [];

	for (const removed of diff.removed) {
		const uniqueShims = new Set(
			removed.shims.filter((shim): shim is string => Boolean(shim))
		);

		for (const shim of uniqueShims) {
			const basePath = path.posix.join(PLAN_BASE_ROOT, shim);
			const [baseContents, currentContents] = await Promise.all([
				workspace.readText(basePath),
				workspace.readText(shim),
			]);

			if (!baseContents) {
				skippedDeletions.push({
					file: shim,
					description: `Remove ${removed.resource} controller shim`,
					reason: 'missing-base',
				});
				reporter.debug(
					'createApplyPlanBuilder: skipping deletion without base snapshot.',
					{
						file: shim,
						basePath,
					}
				);
				continue;
			}

			if (currentContents === null) {
				skippedDeletions.push({
					file: shim,
					description: `Remove ${removed.resource} controller shim`,
					reason: 'missing-target',
				});
				reporter.debug(
					'createApplyPlanBuilder: skipping deletion for missing target.',
					{
						file: shim,
					}
				);
				continue;
			}

			if (currentContents !== baseContents) {
				skippedDeletions.push({
					file: shim,
					description: `Remove ${removed.resource} controller shim`,
					reason: 'modified-target',
				});
				reporter.debug(
					'createApplyPlanBuilder: skipping deletion for modified target.',
					{
						file: shim,
					}
				);
				continue;
			}

			instructions.push({
				action: 'delete',
				file: shim,
				description: `Remove ${removed.resource} controller shim`,
			});
		}
	}

	return { instructions, skippedDeletions };
}

async function emitPluginLoader({
	options,
	prettyPrinter,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
}): Promise<PlanInstruction | null> {
	const { input, context, output, reporter } = options;
	const { ir } = input;

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

	const incomingPath = path.posix.join(PLAN_INCOMING_ROOT, 'plugin.php');
	const basePath = path.posix.join(PLAN_BASE_ROOT, 'plugin.php');

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

async function emitShim({
	options,
	prettyPrinter,
	resource,
}: {
	readonly options: BuilderApplyOptions;
	readonly prettyPrinter: ReturnType<typeof buildPhpPrettyPrinter>;
	readonly resource: IRResource;
}): Promise<PlanInstruction | null> {
	const { input, context, output, reporter } = options;
	const { ir } = input;

	if (!ir) {
		reporter.warn(
			'createApplyPlanBuilder: IR artifact missing, skipping shim emission.',
			{ resource: resource.name }
		);
		return null;
	}

	const className = `${toPascalCase(resource.name)}Controller`;
	const generatedNamespaceRoot = `${ir.php.namespace}\\Generated`;
	const generatedClassFqn = `${generatedNamespaceRoot}\\Rest\\${className}`;

	const autoloadRoot = normaliseAutoloadPath(ir.php.autoload);
	const targetFile = path.posix.join(
		autoloadRoot,
		'Rest',
		`${className}.php`
	);
	const incomingPath = path.posix.join(PLAN_INCOMING_ROOT, targetFile);
	const basePath = path.posix.join(PLAN_BASE_ROOT, targetFile);

	const requireRelative = path.posix.relative(
		path.posix.dirname(targetFile),
		path.posix.join('.generated', 'php', 'Rest', `${className}.php`)
	);

	const program = buildShimProgram({
		ir,
		resource,
		className,
		generatedClassFqn,
		requirePath: formatRequirePath(requireRelative),
	});

	const { code } = await prettyPrinter.prettyPrint({
		filePath: context.workspace.resolve(incomingPath),
		program,
	});

	await context.workspace.write(incomingPath, code, { ensureDir: true });
	output.queueWrite({ file: incomingPath, contents: code });

	const existingBase = await context.workspace.readText(basePath);
	if (existingBase === null) {
		await context.workspace.write(basePath, code, { ensureDir: true });
		output.queueWrite({ file: basePath, contents: code });
	}

	reporter.debug('createApplyPlanBuilder: queued shim instruction.', {
		resource: resource.name,
		file: targetFile,
	});

	return {
		action: 'write',
		file: targetFile,
		base: basePath,
		incoming: incomingPath,
		description: `Update ${resource.name} controller shim`,
	} satisfies PlanInstruction;
}

async function writePlan(
	options: BuilderApplyOptions,
	plan: PlanFile
): Promise<void> {
	const planContent = `${JSON.stringify(plan, null, 2)}\n`;
	await options.context.workspace.write(PLAN_PATH, planContent, {
		ensureDir: true,
	});
	options.output.queueWrite({ file: PLAN_PATH, contents: planContent });
}

function normaliseAutoloadPath(value: string): string {
	if (!value) {
		return '';
	}

	const trimmed = value.replace(/\\/g, '/');
	const normalised = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
	return normalised.startsWith('./') ? normalised.slice(2) : normalised;
}

function formatRequirePath(relative: string): string {
	if (!relative) {
		return '/.generated/php';
	}

	const prefixed = relative.startsWith('.') ? relative : `./${relative}`;
	return prefixed.startsWith('/') ? prefixed : `/${prefixed}`;
}

async function statIfFile(
	absolute: string
): Promise<{ isFile: boolean } | null> {
	try {
		const stats = await fs.lstat(absolute);
		return stats.isFile() ? { isFile: true } : null;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

function buildShimProgram(options: BuildShimOptions) {
	const { ir, resource, className, generatedClassFqn, requirePath } = options;

	const statements: PhpStmt[] = [];
	statements.push(
		buildDeclare([buildDeclareItem('strict_types', buildScalarInt(1))])
	);

	const namespaceStatements: PhpStmt[] = [];
	namespaceStatements.push(buildAutoGuardComment());
	namespaceStatements.push(
		buildIfStatement(
			buildBooleanNot(buildClassExistsCall(generatedClassFqn)),
			[
				buildExpressionStatement(
					buildFuncCall(buildName(['require_once']), [
						buildArg(buildRequireExpression(requirePath)),
					])
				),
			]
		)
	);

	namespaceStatements.push(
		buildClass(
			buildIdentifier(className),
			{
				extends: buildName(
					generatedClassFqn
						.split('\\')
						.filter((segment) => segment.length > 0)
				) as PhpName,
				stmts: [],
			},
			buildClassAttributes(ir, resource)
		)
	);

	const namespaceNode = buildNamespace(
		buildName(
			[ir.php.namespace, 'Rest'].join('\\').split('\\').filter(Boolean)
		) as PhpName,
		namespaceStatements
	);
	statements.push(namespaceNode);

	return statements;
}

function buildAutoGuardComment(): PhpStmt {
	return buildStmtNop({
		comments: [
			buildDocComment([
				'WPKernel extension shim.',
				'Edits to this file will be preserved during apply operations.',
			]),
		],
	});
}

function buildClassExistsCall(fqn: string): PhpExpr {
	return buildFuncCall(buildName(['class_exists']), [
		buildArg(
			buildNode('Expr_ClassConstFetch', {
				class: buildName(
					fqn.split('\\').filter((segment) => segment.length > 0)
				),
				name: buildIdentifier('class'),
			})
		),
	]);
}

function buildRequireExpression(relative: string): PhpExpr {
	const dirConst = buildNode('Scalar_MagicConst_Dir', {}) as PhpExpr;
	const suffix = buildScalarString(
		relative.startsWith('/') ? relative : `/${relative}`
	);
	return buildBinaryOperation('Concat', dirConst, suffix);
}

function buildClassAttributes(ir: IRv1, resource: IRResource): PhpAttributes {
	return {
		comments: [
			buildDocComment([
				'AUTO-GENERATED by WPKernel CLI.',
				`Source: ${ir.meta.origin} → resources.${resource.name}`,
				`Schema: ${resource.schemaKey} (${resource.schemaProvenance})`,
			]),
		],
	} satisfies PhpAttributes;
}

function buildIfStatement(cond: PhpExpr, stmts: PhpStmt[]): PhpStmt {
	return buildNode('Stmt_If', { cond, stmts, elseifs: [], else: null });
}

function buildExpressionStatement(expr: PhpExpr): PhpStmt {
	return buildNode('Stmt_Expression', { expr });
}
