import type { SourceFile } from 'ts-morph';
import type { IRv1 } from '../../ir';
import { loadTsMorph } from './runtime-loader';
import { type PrintedCapabilityModule } from './types';

function getRuleParameterType(scope: 'resource' | 'object'): string {
	return scope === 'resource' ? 'void' : 'unknown';
}

function addCapabilityTypeAliases({
	file,
	definitions,
}: {
	readonly file: SourceFile;
	readonly definitions: IRv1['capabilityMap']['definitions'];
}) {
	file.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/capability',
		namedImports: ['CapabilityHelpers'],
		isTypeOnly: true,
	});

	file.addTypeAlias({
		isExported: true,
		name: 'CapabilityConfig',
		type: (writer) => {
			writer.write('{');
			writer.newLine();
			writer.indent(() => {
				for (const def of definitions) {
					writer.write(
						`'${def.key}': ${getRuleParameterType(def.appliesTo)};`
					);
					writer.newLine();
				}
			});
			writer.write('}');
		},
	});

	file.addTypeAlias({
		isExported: true,
		name: 'CapabilityKey',
		type: 'keyof CapabilityConfig',
	});

	file.addTypeAlias({
		isExported: true,
		name: 'CapabilityRuntime',
		type: 'CapabilityHelpers<CapabilityConfig>',
	});
}

/**
 * Prints the capability helper module (source + declaration) from the IR.
 *
 * @param    ir
 * @category Builders
 */
export async function printCapabilityModule(
	ir: IRv1
): Promise<PrintedCapabilityModule> {
	const { Project, VariableDeclarationKind } = await loadTsMorph();
	const project = new Project({ useInMemoryFileSystem: true });
	const sourceFile = project.createSourceFile('capabilities.ts');

	const definitions = ir.capabilityMap.definitions;

	sourceFile.addImportDeclaration({
		moduleSpecifier: '@wpkernel/core/capability',
		namedImports: ['defineCapability'],
	});

	addCapabilityTypeAliases({ file: sourceFile, definitions });

	sourceFile.addVariableStatement({
		isExported: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: 'capabilities',
				initializer: (writer) => {
					writer.write('defineCapability<CapabilityConfig>({');
					writer.newLine();
					writer.indent(() => {
						writer.write('map: {');
						writer.newLine();
						writer.indent(() => {
							for (const def of definitions) {
								const isResourceLevel =
									def.appliesTo === 'resource';
								const binding = def.binding ?? 'id';

								writer.write(`'${def.key}': `);

								if (isResourceLevel) {
									writer.write('(ctx) => {');
									writer.newLine();
									writer.indent(() => {
										writer.write(
											`// PHP enforces '${def.capability}' via REST controller`
										);
										writer.newLine();
										writer.write(
											`// Frontend matches server behavior via wp.data`
										);
										writer.newLine();
										writer.write(
											'return true; // Optimistic - server will enforce'
										);
										writer.newLine();
									});
									writer.write('},');
								} else {
									writer.write(`(ctx, ${binding}) => {`);
									writer.newLine();
									writer.indent(() => {
										writer.write(
											`// PHP enforces '${def.capability}' via REST controller`
										);
										writer.newLine();
										writer.write(
											`// Frontend matches server behavior via wp.data`
										);
										writer.newLine();
										writer.write(
											'return true; // Optimistic - server will enforce'
										);
										writer.newLine();
									});
									writer.write('},');
								}
								writer.newLine();
							}
						});
						writer.write('},');
						writer.newLine();
					});
					writer.write('})');
				},
			},
		],
	});

	const declarationFile = project.createSourceFile('capabilities.d.ts');

	addCapabilityTypeAliases({ file: declarationFile, definitions });

	declarationFile.addVariableStatement({
		isExported: true,
		hasDeclareKeyword: true,
		declarationKind: VariableDeclarationKind.Const,
		declarations: [
			{
				name: 'capabilities',
				type: 'CapabilityHelpers<CapabilityConfig>',
			},
		],
	});

	return {
		source: sourceFile.getFullText(),
		declaration: declarationFile.getFullText(),
	};
}
