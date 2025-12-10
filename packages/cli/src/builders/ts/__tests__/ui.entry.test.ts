import path from 'node:path';
import { createUiEntryBuilder } from '../ui-entry';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';
import { makeIr } from '@cli-tests/ir.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';

describe('createUiEntryBuilder', () => {
	it('emits an admin entry that wires IR dataview configs', async () => {
		const workspace = makeWorkspaceMock({
			write: jest.fn(async () => undefined),
			resolve: (...parts: string[]) => path.join(process.cwd(), ...parts),
		});
		const output = {
			actions: [],
			queueWrite: jest.fn(),
		};
		const reporter = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			child: jest.fn().mockReturnThis(),
		};

		const builder = createUiEntryBuilder();
		const resource = makeResource({
			name: 'jobs',
			ui: { admin: { view: 'dataviews' } },
			cacheKeys: undefined,
			routes: [],
			identity: { type: 'string', param: 'id' },
			storage: { mode: 'transient' },
		});
		const ir = makeIr({
			resources: [resource],
			ui: {
				resources: [{ resource: resource.name }],
			},
		});
		ir.artifacts.resources[resource.id] = {
			modulePath: `/generated/app/${resource.name}/resource.ts`,
			typeDefPath: `/generated/types/${resource.name}.d.ts`,
			typeSource: 'inferred',
		};
		ir.artifacts.surfaces[resource.id] = {
			resource: resource.name,
			appDir: `/app/${resource.name}`,
			generatedAppDir: `/generated/app/${resource.name}`,
			pagePath: `/app/${resource.name}/page.tsx`,
			formPath: `/app/${resource.name}/form.tsx`,
			configPath: `/app/${resource.name}/config.tsx`,
		};

		await builder.apply(
			{
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: buildEmptyGenerationState(),
				},
				input: {
					phase: 'generate',
					options: {
						namespace: ir.meta.namespace,
						origin: ir.meta.origin,
						sourcePath: ir.meta.sourcePath,
					},
					ir,
				},
				output,
				reporter,
			},
			undefined
		);

		const writeCall = output.queueWrite.mock.calls[0];
		expect(writeCall).toBeDefined();
		const contents = writeCall?.[0]?.contents as string;
		expect(contents).toContain('attachUIBindings');
		expect(contents).toContain('configureWPKernel');
		expect(contents).toContain('adminScreens');
		expect(contents).toContain('jobsAdminScreenRoute');
		expect(contents).toContain('renderRoot');
	});
});
