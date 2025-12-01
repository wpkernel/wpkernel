import path from 'node:path';
import { createUiEntryBuilder } from '../ui-entry';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';
import { makeResource } from '@cli-tests/builders/fixtures.test-support';

describe('createUiEntryBuilder', () => {
	it('emits an admin entry that wires IR dataview configs', async () => {
		const layout = loadTestLayoutSync();
		const workspace = makeWorkspaceMock({
			root: process.cwd(),
			cwd: () => process.cwd(),
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
		});

		await builder.apply(
			{
				context: {
					workspace,
					reporter,
					phase: 'generate',
					generationState: {
						files: new Map(),
						alias: new Map(),
					},
				},
				input: {
					phase: 'generate',
					options: {
						config: {
							version: 1,
							namespace: 'demo',
							schemas: {},
							resources: { jobs: resource },
						},
						namespace: 'demo',
						origin: 'wpk.config.ts',
						sourcePath: 'wpk.config.ts',
					},
					ir: {
						meta: {
							version: 1,
							namespace: 'demo',
							sanitizedNamespace: 'demo',
							sourcePath: 'wpk.config.ts',
							origin: 'typescript',
							features: [],
							ids: {
								algorithm: 'sha256',
								resourcePrefix: 'res:',
								schemaPrefix: 'sch:',
								blockPrefix: 'blk:',
								capabilityPrefix: 'cap:',
							},
							redactions: [],
							limits: {
								maxConfigKB: 256,
								maxSchemaKB: 256,
								policy: 'error',
							},
							plugin: {
								name: 'Demo',
								description: '',
								version: '0.0.0',
								requiresAtLeast: '6.7',
								requiresPhp: '8.1',
								textDomain: 'demo',
								author: 'WPKernel',
								license: 'GPL-2.0-or-later',
							},
						},
						artifacts: {
							pluginLoader: undefined,
							controllers: {},
							resources: {
								[resource.id]: {
									modulePath: path.posix.join(
										layout.resolve('ui.resources.applied'),
										`${resource.name}.ts`
									),
									typeDefPath: path.posix.join(
										layout.resolve('ui.generated'),
										'types',
										`${resource.name}.d.ts`
									),
									typeSource: 'inferred',
									schemaKey: undefined,
								},
							},
							uiResources: {
								[resource.id]: {
									appDir: path.posix.join(
										layout.resolve('ui.applied'),
										'app',
										resource.name
									),
									generatedAppDir: path.posix.join(
										layout.resolve('ui.generated'),
										'app',
										resource.name
									),
									pagePath: path.posix.join(
										layout.resolve('ui.applied'),
										'app',
										resource.name,
										'page.tsx'
									),
									formPath: path.posix.join(
										layout.resolve('ui.applied'),
										'app',
										resource.name,
										'form.tsx'
									),
									configPath: path.posix.join(
										layout.resolve('ui.applied'),
										'app',
										resource.name,
										'config.tsx'
									),
								},
							},
							blocks: {},
							schemas: {},
							js: {
								capabilities: {
									modulePath: path.posix.join(
										layout.resolve('js.generated'),
										'capabilities.ts'
									),
									declarationPath: path.posix.join(
										layout.resolve('js.generated'),
										'capabilities.d.ts'
									),
								},
								index: {
									modulePath: path.posix.join(
										layout.resolve('js.generated'),
										'index.ts'
									),
									declarationPath: path.posix.join(
										layout.resolve('js.generated'),
										'index.d.ts'
									),
								},
								uiRuntimePath: path.posix.join(
									layout.resolve('ui.generated'),
									'runtime.ts'
								),
								uiEntryPath: path.posix.join(
									layout.resolve('ui.generated'),
									'index.tsx'
								),
								blocksRegistrarPath: path.posix.join(
									layout.resolve('blocks.generated'),
									'auto-register.ts'
								),
							},
						},
						config: {
							version: 1,
							namespace: 'demo',
							schemas: {},
							resources: { jobs: resource },
						},
						schemas: [],
						resources: [
							{
								...resource,
								namespace: 'Demo',
								schemaKey: 'job',
								schemaProvenance: {
									type: 'inline',
									sourcePath: 'wpk.config.ts',
								},
								routes: [],
								identity: { type: 'auto-increment' },
								storage: { mode: 'transient' },
								queryParams: [],
								cacheKeys: {},
								ui: {
									admin: {
										view: 'dataviews',
										dataviews: {
											fields: [
												{ id: 'title', label: 'Title' },
											],
											defaultView: {
												type: 'table',
												fields: ['title'],
											},
											preferencesKey:
												'demo/dataviews/jobs',
										},
									},
								},
								hash: {
									algo: 'sha256',
									inputs: [],
									value: 'x',
								},
								warnings: [],
							},
						],
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
							namespace: 'Demo',
							autoload: 'inc/',
							outputDir: layout.resolve('php.generated'),
						},
						layout,
						ui: {
							loader: undefined,
							resources: [
								{
									resource: 'jobs',
									preferencesKey: 'demo/dataviews/jobs',
									dataviews: {
										fields: [
											{ id: 'title', label: 'Title' },
										],
										defaultView: {
											type: 'table',
											fields: ['title'],
										},
										mapQuery: (
											query: Record<string, unknown>
										) => query ?? {},
										preferencesKey: 'demo/dataviews/jobs',
									},
								},
							],
						},
					},
				},
				output,
				reporter,
			},
			undefined
		);

		const writeCall = output.queueWrite.mock.calls.find(
			([call]) =>
				typeof call.file === 'string' &&
				call.file.includes(layout.resolve('ui.generated')) &&
				String(call.file).endsWith('index.tsx')
		);
		expect(writeCall).toBeDefined();
		const contents = writeCall?.[0]?.contents as string;
		expect(contents).toContain('attachUIBindings');
		expect(contents).toContain('configureWPKernel');
		expect(contents).toContain('adminScreens');
		expect(contents).toContain('jobsadminscreenRoute');
		expect(contents).toContain('renderRoot');
	});
});
