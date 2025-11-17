import path from 'node:path';
import type { Project, SourceFile } from 'ts-morph';
import { createHelper } from '../../runtime';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	BuilderNext,
	BuilderOutput,
	PipelineContext,
} from '../../runtime/types';
import type { IRBlock, IRv1 } from '../../ir/publicTypes';
import {
	collectBlockManifests,
	type ProcessedBlockManifest,
} from '../shared.blocks.manifest';
import {
	deriveResourceBlocks,
	type DerivedResourceBlock,
} from '../shared.blocks.derived';
import {
	buildAutoRegisterModuleMetadata,
	generateBlockImportPath,
} from './shared.registrar';
import { buildBlockRegistrarMetadata } from './shared.metadata';
import { loadTsMorph } from './runtime.loader';
import { type RegistrationEntry, type StubFile } from './types';
import { resolveTsLayout } from './ts.paths';
import { resolveBlockRoots } from '../shared.blocks.paths';

const STUB_TRANSACTION_LABEL = 'builder.generate.ts.blocks.stubs';
const DERIVED_TRANSACTION_LABEL =
	'builder.generate.ts.blocks.derived-manifests';

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
		async apply(options: BuilderApplyOptions, next?: BuilderNext) {
			const { input, context, output, reporter } = options;
			if (input.phase !== 'generate') {
				await next?.();
				return;
			}

			if (!input.ir) {
				await next?.();
				return;
			}

			const registrations = await runJsBlocksGeneration({
				ir: input.ir,
				workspace: context.workspace,
				output,
				reporter,
				roots: resolveBlockRoots(input.ir),
			});

			if (registrations !== null) {
				reporter.debug(
					`createJsBlocksBuilder: wrote ${registrations} registrar entries.`
				);
			}

			await next?.();
		},
	});
}

async function runJsBlocksGeneration(options: {
	readonly ir: IRv1;
	readonly workspace: PipelineContext['workspace'];
	readonly output: BuilderOutput;
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly roots: ReturnType<typeof resolveBlockRoots>;
}): Promise<number | null> {
	const existingBlocks = new Map<string, IRBlock>(
		options.ir.blocks.map((block): [string, IRBlock] => [block.key, block])
	);
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

	const allBlocks = mergeBlocks(
		options.ir.blocks,
		derivedBlocks.map((entry) => entry.block)
	);

	const manifestMap = await collectBlockManifests({
		workspace: options.workspace,
		blocks: allBlocks,
		roots: options.roots,
	});

	const jsOnlyBlocks = allBlocks
		.filter((block: IRBlock) => !block.hasRender)
		.map((block: IRBlock) => manifestMap.get(block.key))
		.filter((entry): entry is ProcessedBlockManifest => Boolean(entry))
		.sort((a, b) => a.block.key.localeCompare(b.block.key));

	if (jsOnlyBlocks.length === 0) {
		options.reporter.debug(
			'createJsBlocksBuilder: no JS-only blocks discovered.'
		);
		return null;
	}

	const { blocksGenerated } = resolveTsLayout(options.ir);
	const blocksOutputDir = blocksGenerated;
	const registrarMetadata = buildAutoRegisterModuleMetadata({
		outputDir: blocksOutputDir,
		source: options.ir.meta.origin,
	});
	const registrarPath = options.workspace.resolve(registrarMetadata.filePath);

	const project = await buildProject();
	const sourceFile = project.createSourceFile(registrarPath, '', {
		overwrite: true,
	});

	const { registrations, stubs, processedManifest } =
		await collectJsBlockArtifacts({
			blocks: jsOnlyBlocks,
			workspace: options.workspace,
			reporter: options.reporter,
			registrarMetadata,
			roots: options.roots,
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
		metadata: registrarMetadata,
		registrations,
	});

	return registrations.length;
}

async function collectJsBlockArtifacts(options: {
	readonly blocks: readonly ProcessedBlockManifest[];
	readonly workspace: PipelineContext['workspace'];
	readonly reporter: BuilderApplyOptions['reporter'];
	readonly registrarMetadata: ReturnType<
		typeof buildAutoRegisterModuleMetadata
	>;
	readonly roots: ReturnType<typeof resolveBlockRoots>;
}): Promise<{
	readonly registrations: RegistrationEntry[];
	readonly stubs: StubFile[];
	readonly processedManifest: boolean;
}> {
	const registrationEntries: RegistrationEntry[] = [];
	const stubFiles: StubFile[] = [];
	let processedManifest = false;

	for (const processed of options.blocks) {
		for (const warning of processed.warnings) {
			options.reporter.warn(warning);
		}

		if (!processed.manifestAbsolutePath || !processed.manifestObject) {
			continue;
		}

		processedManifest = true;
		const blockDirAbsolute = options.workspace.resolve(
			processed.block.directory
		);
		const stubs = await collectModuleStubs({
			workspace: options.workspace,
			manifest: processed.manifestObject,
			blockDirectory: blockDirAbsolute,
		});
		stubFiles.push(...stubs);

		if (blockRegistersViaFileModule(processed.manifestObject)) {
			continue;
		}

		const importPath = generateBlockImportPath(
			processed.manifestAbsolutePath,
			options.registrarMetadata.filePath
		);
		const metadata = buildBlockRegistrarMetadata(processed.block.key);
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
	const { sourceFile, metadata, registrations } = options;
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
	await options.workspace.write(metadata.filePath, contents);
	options.output.queueWrite({ file: metadata.filePath, contents });
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

			output.queueWrite({ file, contents });
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
		const viewPath = path.resolve(options.blockDirectory, viewModule);
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
