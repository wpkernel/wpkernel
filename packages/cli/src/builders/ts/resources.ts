import path from 'node:path';
import { createHelper } from '../../runtime';
import type { BuilderApplyOptions } from '../../runtime/types';
import { toPascalCase, toCamelCase } from './metadata';

/**
 * Creates a builder helper for generating resource definition files.
 *
 * @category Builders
 */
export function createTsResourcesBuilder() {
	return createHelper({
		key: 'builder.generate.ts.resources',
		kind: 'builder',
		dependsOn: ['builder.generate.ts.types'],
		async apply(options: BuilderApplyOptions) {
			const { input, context, output, reporter } = options;
			if (input.phase !== 'generate' || !input.ir) {
				return;
			}

			const resources = input.ir.resources;
			if (resources.length === 0) {
				reporter.debug(
					'createTsResourcesBuilder: no resources to process.'
				);
				return;
			}

			const resourcesRoot = input.ir.artifacts.resources;
			const generatedResourcesDir = path.posix.join(
				input.ir.layout.resolve('ui.generated'),
				'resources'
			);

			for (const resource of resources) {
				const plan = resourcesRoot[resource.id];
				if (!plan) {
					reporter.debug(
						'createTsResourcesBuilder: missing artifact plan for resource.',
						{ resource: resource.name }
					);
					continue;
				}

				const fileName = `${resource.name}.ts`;
				const generatedFilePath = path.join(
					generatedResourcesDir,
					fileName
				);

				// Path to type definition
				// Assuming types are in '@/types/[resource.name]'
				const pascalName = toPascalCase(resource.name);
				const camelName = toCamelCase(resource.name);

				const lines: string[] = [];
				lines.push(
					"import { defineResource } from '@wpkernel/core/resource';"
				);
				lines.push(
					`import type { ${pascalName} } from '@/types/${resource.name}';`
				);
				lines.push('');
				lines.push(
					`export const ${camelName} = defineResource<${pascalName}>(${JSON.stringify(resource, null, 2)});`
				);
				lines.push('');

				const content = lines.join('\n');

				await context.workspace.write(generatedFilePath, content, {
					ensureDir: true,
				});

				output.queueWrite({
					file: generatedFilePath,
					contents: content,
				});

				reporter.debug(
					`createTsResourcesBuilder: generated definition for ${resource.name}`,
					{
						path: generatedFilePath,
					}
				);
			}
		},
	});
}
