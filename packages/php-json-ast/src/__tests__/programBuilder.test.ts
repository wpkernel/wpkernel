import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';

// Simplified types - just what the tests need
type BuilderInput = any;
type BuilderOutput = any;
import {
	createPhpFileBuilder,
	resetPhpProgramBuilderContext,
} from '../programBuilder';
import {
	buildClass,
	buildClassMethod,
	buildIdentifier,
	buildReturn,
	buildScalarString,
	buildStmtNop,
} from '../nodes';
import {
	PHP_CLASS_MODIFIER_ABSTRACT,
	PHP_METHOD_MODIFIER_PUBLIC,
} from '../modifiers';
import {
	resetTestChannels,
	getTestBuilderQueue,
} from './testUtils.test-support';
import type { PhpFileMetadata } from '../types';
import { loadDefaultLayout } from '@wpkernel/test-utils/layout.test-support';

const layout = loadDefaultLayout();
const resolvePhpPath = (
	workspace: ReturnType<typeof createPipelineContext>['workspace'],
	file: string
) => workspace.resolve(layout.resolve('php.generated'), file);

function createReporter(): Reporter {
	const reporter = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn(),
	};
	(reporter.child as jest.Mock).mockReturnValue(reporter);
	return reporter as Reporter;
}

function createPipelineContext() {
	return {
		workspace: {
			root: '/workspace',
			resolve: (...parts: string[]) => path.join('/workspace', ...parts),
			cwd: () => '/workspace',
			read: async () => null,
			readText: async () => null,
			write: async () => undefined,
			writeJson: async () => undefined,
			exists: async () => false,
			rm: async () => undefined,
			glob: async () => [],
			threeWayMerge: async () => 'clean',
			begin: () => undefined,
			commit: async () => ({ writes: [], deletes: [] }),
			rollback: async () => ({ writes: [], deletes: [] }),
			dryRun: async (fn: () => Promise<any>) => ({
				result: await fn(),
				manifest: { writes: [], deletes: [] },
			}),
			tmpDir: async (_prefix?: string) => '.tmp',
		},
		reporter: createReporter(),
		phase: 'generate' as const,
	};
}

function createBuilderInput(): BuilderInput {
	return {
		phase: 'generate',
		options: {
			config: {} as never,
			namespace: 'demo-plugin',
			origin: 'wpk.config.ts',
			sourcePath: 'wpk.config.ts',
		},
		ir: {
			meta: {
				version: 1,
				namespace: 'demo-plugin',
				sanitizedNamespace: 'DemoPlugin',
				origin: 'wpk.config.ts',
				sourcePath: 'wpk.config.ts',
			},
			config: {} as never,
			schemas: [],
			resources: [],
			capabilities: [],
			capabilityMap: {
				sourcePath: undefined,
				definitions: [],
				fallback: {
					capability: 'manage_options',
					appliesTo: 'resource',
				},
				missing: [],
				unused: [],
				warnings: [],
			},
			blocks: [],
			php: {
				namespace: 'Demo\\Plugin',
				autoload: 'inc/',
				outputDir: layout.resolve('php.generated'),
			},
		} as unknown as BuilderInput['ir'],
	};
}

describe('programBuilder helpers', () => {
	it('collects namespace metadata and emits a PhpProgram', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};
		const phpFile = resolvePhpPath(context.workspace, 'Example.php');

		resetTestChannels(context);

		const helper = createPhpFileBuilder({
			key: 'test-program',
			filePath: phpFile,
			namespace: 'Demo\\Example',
			metadata: { kind: 'capability-helper' },
			build: (builder) => {
				builder.appendDocblock('Example file');
				builder.addUse('Demo\\Contracts');
				builder.addUse('function Demo\\Helpers\\Foo');
				builder.addUse('Demo\\Contracts');
				builder.appendStatement('// class declaration');

				const method = buildClassMethod(buildIdentifier('label'), {
					flags: PHP_METHOD_MODIFIER_PUBLIC,
					returnType: buildIdentifier('string'),
					stmts: [buildReturn(buildScalarString('demo'))],
				});

				const classNode = buildClass(buildIdentifier('Example'), {
					flags: PHP_CLASS_MODIFIER_ABSTRACT,
					stmts: [method],
				});

				builder.appendProgramStatement(classNode);
				builder.appendProgramStatement(buildStmtNop());
			},
		});

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const actions = getTestBuilderQueue(context);
		expect(actions).toHaveLength(1);
		const [action] = actions;
		expect(action!.file).toBe(phpFile);
		expect(action!.metadata.kind).toBe('capability-helper');
		expect(action!.docblock).toContain('Example file');
		expect(action!.uses).toEqual([
			'Demo\\Contracts',
			'function Demo\\Helpers\\Foo',
		]);
		expect(action!.statements).toContain('// class declaration');

		const [declareNode, namespaceNode] = action!.program;
		expect(declareNode!.nodeType).toBe('Stmt_Declare');
		expect(namespaceNode!.nodeType).toBe('Stmt_Namespace');
		expect((namespaceNode as any)?.stmts?.[0]?.nodeType).toBe('Stmt_Use');
		const classNode = (namespaceNode as any)?.stmts?.find(
			(stmt: any) => stmt.nodeType === 'Stmt_Class'
		);
		expect(classNode?.nodeType).toBe('Stmt_Class');
		expect(classNode?.stmts?.[0]?.nodeType).toBe('Stmt_ClassMethod');
		expect((namespaceNode as any)?.stmts?.at(-1)?.nodeType).toBe(
			'Stmt_Nop'
		);
	});

	it('appends class methods directly to the program AST', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};
		const phpFile = resolvePhpPath(context.workspace, 'Blank.php');

		const helper = createPhpFileBuilder({
			key: 'multi-methods',
			filePath: phpFile,
			namespace: 'Demo\\Blank',
			metadata: { kind: 'capability-helper' },
			build: (builder) => {
				const first = buildClassMethod(buildIdentifier('first'), {
					flags: PHP_METHOD_MODIFIER_PUBLIC,
					stmts: [buildReturn(buildScalarString('first'))],
				});

				const second = buildClassMethod(buildIdentifier('second'), {
					flags: PHP_METHOD_MODIFIER_PUBLIC,
					stmts: [buildReturn(buildScalarString('second'))],
				});

				const classNode = buildClass(buildIdentifier('Example'), {
					stmts: [first, second],
				});

				builder.appendProgramStatement(classNode);
			},
		});

		resetTestChannels(context);

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const pending = getTestBuilderQueue(context);
		expect(pending).toHaveLength(1);
		expect(pending[0]?.file).toBe(phpFile);
		const namespaceNode = pending[0]!.program.find(
			(stmt: any) => stmt.nodeType === 'Stmt_Namespace'
		) as any;
		expect(namespaceNode).toBeDefined();

		const classNode = namespaceNode.stmts.find(
			(stmt: any) => stmt.nodeType === 'Stmt_Class'
		) as any;
		expect(classNode).toBeDefined();

		const methodNames = classNode.stmts
			.filter((stmt: any) => stmt.nodeType === 'Stmt_ClassMethod')
			.map((method: any) => method.name.name);

		expect(methodNames).toEqual(['first', 'second']);
	});

	it('normalises use statements, namespace overrides, and metadata updates', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};
		const phpFile = resolvePhpPath(context.workspace, 'Normalised.php');

		const helper = createPhpFileBuilder({
			key: 'normalised-uses',
			filePath: phpFile,
			namespace: 'Demo\\Original',
			metadata: { kind: 'capability-helper' },
			build: (builder) => {
				builder.addUse('   ');
				builder.addUse('\\');
				builder.addUse('Demo\\Contracts as ContractAlias');
				builder.addUse('Demo\\Provided as ManualAlias');
				builder.addUse('function Demo\\Helpers\\foo');
				builder.addUse('const Demo\\Constants\\BAR');
				builder.addUse('\\Vendor\\Package\\Thing');
				builder.addUse('Demo\\Special\\Name as CustomAlias');
				builder.addUse('function Demo\\Helpers\\bar');
				builder.addUse('Demo\\Special\\Helper');
				builder.addUse('const Demo\\Constants\\BAZ');
				builder.addUse('Demo\\Group\\SingleOnly');

				builder.appendDocblock('Example docblock');
				builder.appendStatement('return 1;');
				builder.appendProgramStatement(buildStmtNop());

				const overrideMetadata: PhpFileMetadata = {
					kind: 'base-controller',
				};
				builder.setMetadata(overrideMetadata);
				builder.setNamespace('Demo\\Override');

				expect(builder.getNamespace()).toBe('Demo\\Override');
				expect(builder.getStatements()).toContain('return 1;');
				expect(builder.getMetadata()).toBe(overrideMetadata);
				expect(builder.getProgramAst()[1]?.nodeType).toBe(
					'Stmt_Namespace'
				);
			},
		});

		resetTestChannels(context);

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const actions = getTestBuilderQueue(context);
		expect(actions).toHaveLength(1);
		const [action] = actions;
		expect(action!.file).toBe(phpFile);
		expect(action!.docblock).toContain('Example docblock');
		expect(action!.statements).toContain('return 1;');
		expect(action!.metadata.kind).toBe('base-controller');
		expect(action!.uses).toEqual([
			'Demo\\{Contracts as ContractAlias, Provided as ManualAlias}',
			'Demo\\Group\\SingleOnly',
			'Demo\\Special\\{Helper, Name as CustomAlias}',
			'\\Vendor\\Package\\Thing',
			'function Demo\\Helpers\\{bar, foo}',
			'const Demo\\Constants\\{BAR, BAZ}',
		]);
		const namespaceNode = action!.program.find(
			(stmt: any) => stmt.nodeType === 'Stmt_Namespace'
		);
		const namespaceUses =
			namespaceNode?.nodeType === 'Stmt_Namespace'
				? (namespaceNode as any).stmts.filter(
						(stmt: any) => stmt.nodeType === 'Stmt_GroupUse'
					)
				: [];
		expect(namespaceUses).toHaveLength(4);
	});

	it('builds programs in the global namespace with explicit use overrides', async () => {
		const context = createPipelineContext();
		const input = createBuilderInput();
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};

		const helper = createPhpFileBuilder({
			key: 'global-namespace',
			filePath: resolvePhpPath(context.workspace, 'Global.php'),
			namespace: '',
			metadata: { kind: 'index-file' },
			build: (builder) => {
				builder.addUse('Single');
				builder.addUse('\\Vendor\\Package');
				builder.addUse('Group\\Shared\\First');
				builder.addUse('Group\\Shared\\Second');
				builder.addUse('Demo\\Provided as ProvidedAlias');
				builder.addUse('function Helpers\\Utility');
				builder.addUse('const Constants\\Value');

				builder.appendStatement('echo 1;');
				builder.appendProgramStatement(buildStmtNop());
			},
		});

		resetTestChannels(context);

		await helper.apply(
			{
				context,
				input,
				output,
				reporter: context.reporter,
			},
			undefined
		);

		const [action] = getTestBuilderQueue(context);
		expect(action).toBeDefined();
		expect(action!.docblock).toEqual([]);
		expect(action!.uses).toEqual([
			'Demo\\Provided as ProvidedAlias',
			'Group\\Shared\\{First, Second}',
			'Single',
			'\\Vendor\\Package',
			'function Helpers\\Utility',
			'const Constants\\Value',
		]);

		const namespaceNode = action!.program.find(
			(stmt: any) => stmt.nodeType === 'Stmt_Namespace'
		);
		expect((namespaceNode as any)?.name).toBeNull();

		resetPhpProgramBuilderContext(context);
	});
});
