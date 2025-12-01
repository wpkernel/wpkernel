import path from 'node:path';
import type { Project, SourceFile } from 'ts-morph';
import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import type { IRBlock, IRv1, IRBlockPlan } from '../../ir/publicTypes';
import {
	deriveResourceBlocks,
	type DerivedResourceBlock,
} from '../shared.blocks.derived';
import {
	buildAutoRegisterModuleMetadata,
	generateBlockImportPath,
} from './registrar';
import { buildBlockRegistrarMetadata } from './metadata';
import { loadTsMorph } from './runtime-loader';
import { type RegistrationEntry, type StubFile } from './types';
import { validateBlockManifest } from '../shared.blocks.validation';
import { toWorkspaceRelative } from '../shared.blocks.paths';

const STUB_TRANSACTION_LABEL = 'builder.generate.ts.blocks.stubs';
const DERIVED_TRANSACTION_LABEL =
	'builder.generate.ts.blocks.derived-manifests';

function toAbsolutePath(
	workspace: PipelineContext['workspace'],
	target: string
): string {
	if (path.isAbsolute(target)) {
		return target;
	}

	return workspace.resolve(target);
}

/**
 * Creates a builder helper for generating JavaScript-only WordPress blocks.
 *
 * This helper processes block configurations from the IR, collects block manifests,
 * generates JavaScript artifacts for block registration, and stages render stubs
 * for blocks that do not have server-side rendering.
 *
 * @category AST Builders
 * @returns A `BuilderHelper` instance for generating JavaScript block code.
 */
export function createJsBlocksBuilder(): BuilderHelper {
	return createHelper({
		key: 'builder.generate.ts.blocks',
		kind: 'builder',
		dependsOn: ['ir.artifacts.plan', 'ir.blocks.core'],
		async apply(options: BuilderApplyOptions) {
			const { input, context, output, reporter } = options;
			if (input.phase !== 'generate') {
				return;
			}

			const ir = input.ir;
			if (!ir?.artifacts) {
				reporter.debug(
					'createJsBlocksBuilder: missing IR artifacts; skipping.'
				);
				return;
			}

			const registrations = await runJsBlocksGeneration({
				ir,
				workspace: context.workspace,
				output,
				reporter,
			});

			if (registrations !== null) {
				reporter.debug(
					`createJsBlocksBuilder: wrote ${registrations} registrar entries.`
				);
			}
		},
	});
}

async function runJsBlocksGeneration(options: {
	readonly ir: IRv1;
	readonly workspace: PipelineContext['workspace'];
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
}): Promise<number | null> {
	const { ir, workspace, reporter } = options;
	const prepared = await prepareJsBlocks({
		ir,
		workspace,
		output: options.output,
		reporter,
	});

	if (prepared.blocks.length === 0) {
		reporter.debug('createJsBlocksBuilder: no JS-only blocks discovered.');
		return null;
	}

	const registrarPath = ir.artifacts.js?.blocksRegistrarPath;
	if (!registrarPath) {
		reporter.debug(
			'createJsBlocksBuilder: missing registrar path in artifacts.'
		);
		return null;
	}

	const registrarMetadata = buildAutoRegisterModuleMetadata({
		outputDir: path.posix.dirname(registrarPath),
		source: ir.meta.origin,
	});
	const registrarMetadataWithPath = {
		...registrarMetadata,
		filePath: registrarPath,
	};

	const project = await buildProject();
	const sourceFile = project.createSourceFile(registrarPath, '', {
		overwrite: true,
	});

	const { registrations, stubs, processedManifest } =
		await collectJsBlockArtifacts({
			blocks: prepared.blocks,
			workspace,
			reporter,
			registrarMetadata: registrarMetadataWithPath,
			blockPlans: prepared.blockPlans,
		});

	await stageStubWrites({
		workspace: options.workspace,
		output: options.output,
		reporter: options.reporter,
		stubs,
	});

	const hasArtifacts =
		processedManifest || registrations.length > 0 || stubs.length > 0;
	if (!hasArtifacts) {
		options.reporter.debug(
			'createJsBlocksBuilder: no auto-register artifacts generated.'
		);
		return null;
	}

	await emitRegistrarModule({
		workspace: options.workspace,
		output: options.output,
		sourceFile,
		metadata: registrarMetadataWithPath,
		registrations,
	});

	return registrations.length;
}

async function collectJsBlockArtifacts(options: {
	readonly blocks: readonly IRBlock[];
	readonly workspace: PipelineContext['workspace'];
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly registrarMetadata: ReturnType<
		typeof buildAutoRegisterModuleMetadata
	>;
	readonly blockPlans: Map<string, IRBlockPlan>;
}): Promise<{
	readonly registrations: RegistrationEntry[];
	readonly stubs: StubFile[];
	readonly processedManifest: boolean;
}> {
	const registrationEntries: RegistrationEntry[] = [];
	const stubFiles: StubFile[] = [];
	let processedManifest = false;

	const sortedBlocks = [...options.blocks].sort((a, b) =>
		a.key.localeCompare(b.key)
	);

	for (const block of sortedBlocks) {
		const plan = options.blockPlans.get(block.id);
		if (!plan) {
			options.reporter.debug(
				'createJsBlocksBuilder: missing plan for block.',
				{
					block: block.key,
				}
			);
			continue;
		}

		const manifest = await readBlockManifest(
			options.workspace,
			plan.jsonPath
		);
		if (!manifest) {
			continue;
		}

		processedManifest = true;

		for (const warning of validateBlockManifest(manifest, block)) {
			options.reporter.warn(warning);
		}

		const blockDirAbsolute = toAbsolutePath(
			options.workspace,
			plan.appliedDir
		);
		const blockDirRelative = toWorkspaceRelative(
			options.workspace,
			blockDirAbsolute
		);
		const stubs = await collectModuleStubs({
			workspace: options.workspace,
			manifest,
			blockDirectory: blockDirRelative,
		});
		stubFiles.push(...stubs);

		if (blockRegistersViaFileModule(manifest)) {
			continue;
		}

		const importPath = generateBlockImportPath(
			toAbsolutePath(options.workspace, plan.jsonPath),
			options.registrarMetadata.filePath
		);
		const metadata = buildBlockRegistrarMetadata(block.key);
		registrationEntries.push({
			importPath,
			variableName: metadata.variableName,
		});
	}

	return {
		registrations: registrationEntries,
		stubs: stubFiles,
		processedManifest,
	};
}

async function buildProject(): Promise<Project> {
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

async function emitRegistrarModule(options: {
	readonly workspace: PipelineContext['workspace'];
	readonly output: BuilderOutput;
	readonly sourceFile: SourceFile;
	readonly metadata: ReturnType<typeof buildAutoRegisterModuleMetadata>;
	readonly registrations: readonly RegistrationEntry[];
}): Promise<void> {
	const { sourceFile, metadata, registrations, workspace } = options;
	sourceFile.addStatements(metadata.banner.join('\n'));
	if (metadata.banner.length > 0) {
		sourceFile.addStatements('\n');
	}

	if (registrations.length > 0) {
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wordpress/blocks',
			namedImports: ['registerBlockType'],
		});
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wordpress/blocks',
			namedImports: ['BlockConfiguration'],
			isTypeOnly: true,
		});
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@wordpress/element',
			namedImports: ['createElement'],
		});

		for (const entry of registrations) {
			sourceFile.addImportDeclaration({
				moduleSpecifier: entry.importPath,
				defaultImport: entry.variableName,
			});
		}

		sourceFile.addStatements('\n');
		addSettingsHelper(sourceFile, metadata.settingsHelper);
		sourceFile.addStatements('\n');
		addRegistrarFunction(
			sourceFile,
			metadata.registrationFunction,
			metadata.settingsHelper,
			registrations
		);
	} else {
		addEmptyRegistrar(sourceFile, metadata.registrationFunction);
	}

	sourceFile.formatText({ ensureNewLineAtEndOfFile: true });

	const contents = sourceFile.getFullText();
	const absolutePath = toAbsolutePath(workspace, metadata.filePath);
	const filePath = toWorkspaceRelative(workspace, absolutePath);
	await workspace.write(filePath, contents);
	options.output.queueWrite({ file: filePath, contents });
	sourceFile.forget();
}

function addSettingsHelper(sourceFile: SourceFile, helperName: string): void {
	const helper = sourceFile.addFunction({
		name: helperName,
		statements: (writer) => {
			writer.writeLine('const title = metadata?.title ?? "Block";');
			writer.writeLine('return {');
			writer.indent(() => {
				writer.writeLine('...metadata,');
				writer.writeLine(
					"edit: () => createElement('div', null, `${title} (edit)`),"
				);
				writer.writeLine(
					"save: () => createElement('div', null, `${title} (save)`),"
				);
			});
			writer.writeLine('};');
		},
		returnType: 'BlockConfiguration',
	});
	helper.addParameter({ name: 'metadata', type: 'BlockConfiguration' });
}

function addRegistrarFunction(
	sourceFile: SourceFile,
	functionName: string,
	helperName: string,
	registrations: readonly RegistrationEntry[]
): void {
	sourceFile.addFunction({
		name: functionName,
		isExported: true,
		statements: (writer) => {
			for (const entry of registrations) {
				writer.writeLine(
					`registerBlockType(${entry.variableName} as BlockConfiguration, ${helperName}(${entry.variableName}));`
				);
			}
		},
	});
}

function addEmptyRegistrar(sourceFile: SourceFile, functionName: string): void {
	sourceFile.addFunction({
		name: functionName,
		isExported: true,
		statements: (writer) => {
			writer.writeLine('// No JS-only blocks require auto-registration.');
		},
	});
}

async function stageStubWrites(options: {
	readonly workspace: PipelineContext['workspace'];
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly stubs: readonly StubFile[];
}): Promise<void> {
	if (options.stubs.length === 0) {
		return;
	}

	const { workspace, output, reporter, stubs } = options;
	const stubContents = new Map<string, string>();
	for (const stub of stubs) {
		const absolute = workspace.resolve(stub.path);
		const relative = path
			.relative(workspace.root, absolute)
			.split(path.sep)
			.join('/');
		stubContents.set(stub.path, stub.contents);
		stubContents.set(absolute, stub.contents);
		stubContents.set(relative, stub.contents);
	}
	workspace.begin(STUB_TRANSACTION_LABEL);
	try {
		for (const stub of stubs) {
			await workspace.write(stub.path, stub.contents, {
				ensureDir: true,
			});
		}
		const manifest = await workspace.commit(STUB_TRANSACTION_LABEL);
		for (const file of manifest.writes) {
			const data = await workspace.read(file);
			const contents = data
				? data.toString('utf8')
				: stubContents.get(file);
			if (!contents) {
				continue;
			}

			output.queueWrite({ file, contents });
		}
		reporter.debug('createJsBlocksBuilder: emitted block stubs.', {
			files: manifest.writes,
		});
	} catch (error) {
		await workspace.rollback(STUB_TRANSACTION_LABEL);
		throw error;
	}
}

async function stageDerivedManifestWrites(options: {
	readonly workspace: PipelineContext['workspace'];
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly manifests: readonly DerivedResourceBlock[];
}): Promise<void> {
	if (options.manifests.length === 0) {
		return;
	}

	const { workspace, output, reporter } = options;
	workspace.begin(DERIVED_TRANSACTION_LABEL);
	try {
		for (const entry of options.manifests) {
			const absolutePath = workspace.resolve(entry.block.manifestSource);
			const contents = `${JSON.stringify(entry.manifest, null, 2)}\n`;
			await workspace.write(absolutePath, contents, {
				ensureDir: true,
			});
		}

		const manifest = await workspace.commit(DERIVED_TRANSACTION_LABEL);
		for (const file of manifest.writes) {
			const contents = await workspace.readText(file);
			if (!contents) {
				continue;
			}

			output.queueWrite({
				file: toWorkspaceRelative(workspace, file),
				contents,
			});
		}

		reporter.debug(
			'createJsBlocksBuilder: emitted derived block manifests.',
			{ files: manifest.writes }
		);
	} catch (error) {
		await workspace.rollback(DERIVED_TRANSACTION_LABEL);
		throw error;
	}
}

async function readBlockManifest(
	workspace: PipelineContext['workspace'],
	manifestPath: string
): Promise<Record<string, unknown> | null> {
	const absolute = toAbsolutePath(workspace, manifestPath);
	const raw = await workspace.readText(absolute);
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === 'object') {
			return parsed as Record<string, unknown>;
		}
	} catch (error) {
		throw error;
	}

	return null;
}

async function prepareJsBlocks(options: {
	readonly ir: IRv1;
	readonly workspace: PipelineContext['workspace'];
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
}): Promise<{
	readonly blocks: IRBlock[];
	readonly blockPlans: Map<string, IRBlockPlan>;
}> {
	const blockPlans = buildBlockPlans(options.ir);
	const blocks = options.ir.blocks ?? [];
	if (blocks.length === 0 || blockPlans.size === 0) {
		return { blocks: [], blockPlans };
	}

	const existingBlocks = new Map<string, IRBlock>(
		blocks.map((block): [string, IRBlock] => [block.key, block])
	);
	for (const block of blocks) {
		if (!blockPlans.has(block.id)) {
			blockPlans.set(
				block.id,
				buildInlineBlockPlan(block, options.workspace, options.ir)
			);
		}
	}
	const derivedBlocks = deriveResourceBlocks({
		ir: options.ir,
		existingBlocks,
	});

	await stageDerivedManifestWrites({
		workspace: options.workspace,
		output: options.output,
		reporter: options.reporter,
		manifests: derivedBlocks,
	});

	for (const entry of derivedBlocks) {
		if (!blockPlans.has(entry.block.id)) {
			blockPlans.set(
				entry.block.id,
				buildInlineBlockPlan(entry.block, options.workspace, options.ir)
			);
		}
	}

	const jsOnlyBlocks = mergeBlocks(
		blocks,
		derivedBlocks.map((entry) => entry.block)
	).filter((block) => !block.hasRender);

	return { blocks: jsOnlyBlocks, blockPlans };
}

function buildBlockPlans(ir: IRv1): Map<string, IRBlockPlan> {
	const plans = new Map<string, IRBlockPlan>();
	for (const [blockId, plan] of Object.entries(ir.artifacts.blocks)) {
		plans.set(blockId, plan);
	}
	return plans;
}

function buildInlineBlockPlan(
	block: IRBlock,
	workspace: PipelineContext['workspace'],
	ir: IRv1
): IRBlockPlan {
	const appliedDir = toAbsolutePath(workspace, block.directory);
	const manifestPath = toAbsolutePath(workspace, block.manifestSource);
	const dirName = path.posix.basename(appliedDir);
	const generatedRoot = ir.layout.resolve('blocks.generated');
	const generatedDir = path.posix.join(generatedRoot, dirName);
	return {
		key: block.key,
		appliedDir,
		generatedDir,
		jsonPath: manifestPath,
		tsEntry: path.posix.join(appliedDir, 'index.tsx'),
		tsView: path.posix.join(appliedDir, 'view.tsx'),
		tsHelper: path.posix.join(appliedDir, 'view.ts'),
		phpRenderPath: block.hasRender
			? path.posix.join(appliedDir, 'render.php')
			: undefined,
		mode: block.hasRender ? 'ssr' : 'js',
	};
}

function mergeBlocks(
	original: readonly IRBlock[],
	derived: readonly IRBlock[]
): IRBlock[] {
	const map = new Map(original.map((block) => [block.key, block]));

	for (const block of derived) {
		if (!map.has(block.key)) {
			map.set(block.key, block);
		}
	}

	return Array.from(map.values());
}

async function collectModuleStubs(options: {
	readonly workspace: PipelineContext['workspace'];
	readonly manifest: Record<string, unknown>;
	readonly blockDirectory: string;
}): Promise<StubFile[]> {
	const files: StubFile[] = [];
	const editorModule =
		extractFileModulePath(options.manifest.editorScriptModule) ??
		extractFileModulePath(options.manifest.editorScript);
	if (editorModule && shouldEmitEditorStub(editorModule)) {
		const editorPath = path.resolve(options.blockDirectory, editorModule);
		if (!(await options.workspace.exists(editorPath))) {
			files.push({ path: editorPath, contents: createEditorStub() });
		}
	}

	const viewModule =
		extractFileModulePath(options.manifest.viewScriptModule) ??
		extractFileModulePath(options.manifest.viewScript);
	if (viewModule && shouldEmitViewStub(viewModule)) {
		const viewPath = path.posix.join(options.blockDirectory, viewModule);
		if (!(await options.workspace.exists(viewPath))) {
			files.push({ path: viewPath, contents: createViewStub() });
		}
	}

	return files;
}

function extractFileModulePath(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value.startsWith('file:')) {
		return undefined;
	}

	const relative = value.slice('file:'.length).trim();
	if (!relative) {
		return undefined;
	}

	return relative.startsWith('./') ? relative.slice(2) : relative;
}

function shouldEmitEditorStub(relativePath: string): boolean {
	return normalizeRelative(relativePath) === 'index.tsx';
}

function shouldEmitViewStub(relativePath: string): boolean {
	return normalizeRelative(relativePath) === 'view.ts';
}

function normalizeRelative(candidate: string): string {
	const normalised = candidate.replace(/^\.\//u, '');
	return normalised.replace(/\\/gu, '/');
}

function blockRegistersViaFileModule(
	manifest: Record<string, unknown>
): boolean {
	return (
		usesFileModule(manifest.editorScriptModule) ||
		usesFileModule(manifest.editorScript)
	);
}

function usesFileModule(candidate: unknown): boolean {
	return (
		typeof candidate === 'string' &&
		candidate.trim().toLowerCase().startsWith('file:')
	);
}

function createEditorStub(): string {
	return [
		'/* AUTO-GENERATED WPK STUB: safe to edit. */',
		"import { registerBlockType, type BlockConfiguration } from '@wordpress/blocks';",
		'// Vite/tsconfig should allow JSON imports (.d.ts for JSON can be global)',
		"import metadata from './block.json';",
		'',
		'function Edit() {',
		"  return <div>{ metadata.title || 'Block' } (edit)</div>;",
		'}',
		'',
		'// Saved HTML is final for JS-only blocks:',
		'const save = () => (',
		"  <div>{ metadata.title || 'Block' } (save)</div>",
		');',
		'',
		'const blockSettings: BlockConfiguration = {',
		'  ...metadata,',
		'  edit: Edit,',
		'  save,',
		'};',
		'',
		'registerBlockType(metadata as BlockConfiguration, blockSettings);',
		'',
	].join('\n');
}

function createViewStub(): string {
	return [
		'/* AUTO-GENERATED WPK STUB: safe to edit.',
		' * Runs on the front-end when the block appears.',
		' */',
		'export function initBlockView(_root: HTMLElement) {',
		'  // Optional: hydrate interactivity',
		"  // console.log('Init view for', _root);",
		'}',
		'',
	].join('\n');
}
