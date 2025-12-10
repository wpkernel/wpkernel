import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import {
	buildWpPostRouteBundle,
	type WpPostRouteBundle,
} from '@wpkernel/wp-json-ast';
import type { IRResource } from '../../../ir/publicTypes';
import type { BuilderOutput } from '../../../runtime/types';
import type { Workspace } from '../../../workspace/types';
import { makePhpIrFixture } from '@cli-tests/builders/resources.test-support';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import { buildEmptyGenerationState } from '../../../apply/manifest';
import { makeHash } from '@cli-tests/builders/fixtures.test-support';
import {
	createPhpWpPostRoutesHelper,
	getWpPostRouteHelperState,
	readWpPostRouteBundle,
} from '../controller.wpPostRoutes';

describe('createPhpWpPostRoutesHelper', () => {
	function buildReporter(): Reporter {
		return {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			child: jest.fn().mockReturnThis(),
		};
	}

	function buildWorkspace(): Workspace {
		const root = process.cwd();
		return makeWorkspaceMock({
			root,
			cwd: () => root,
			resolve: (...parts: string[]) => path.join(root, ...parts),
		});
	}

	function buildResource(storage?: IRResource['storage']): IRResource {
		return {
			id: 'book',
			controllerClass: 'Demo\\BookController',
			name: 'book',
			schemaKey: 'book',
			schemaProvenance: 'manual',
			routes: [],
			cacheKeys: {
				list: { segments: [], source: 'default' },
				get: { segments: [], source: 'default' },
				create: { segments: [], source: 'default' },
				update: { segments: [], source: 'default' },
				remove: { segments: [], source: 'default' },
			},
			identity: { type: 'number', param: 'id' },
			storage,
			queryParams: undefined,
			ui: undefined,
			hash: makeHash('resource-hash'),

			warnings: [],
		};
	}

	async function applyHelper(
		resource: IRResource
	): Promise<WpPostRouteBundle | undefined> {
		const reporter = buildReporter();
		const workspace = buildWorkspace();
		const context = {
			workspace,
			reporter,
			phase: 'generate' as const,
			generationState: buildEmptyGenerationState(),
		};
		const output: BuilderOutput = {
			actions: [],
			queueWrite: jest.fn(),
		};
		const ir = makePhpIrFixture({ resources: [resource] });

		await createPhpWpPostRoutesHelper().apply(
			{
				context,

				input: {
					phase: 'generate' as const,
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

		const state = getWpPostRouteHelperState(context);
		return readWpPostRouteBundle(state, resource.name);
	}

	it('does not record a bundle when storage mode is not wp-post', async () => {
		const resource = buildResource({
			mode: 'wp-option',
			option: 'demo_option',
		});

		const bundle = await applyHelper(resource);

		expect(bundle).toBeUndefined();
	});

	it('records the wp-post route bundle when storage mode is wp-post', async () => {
		const resource = buildResource({
			mode: 'wp-post',
			postType: 'book',
			statuses: [],
			supports: [],
			meta: {},
			taxonomies: {},
		} as IRResource['storage']);

		const bundle = await applyHelper(resource);
		const expected = buildWpPostRouteBundle({
			resource,
			pascalName: 'Book',
			identity: { type: 'number', param: 'id' },
			errorCodeFactory: (suffix: string) => `book_${suffix}`,
		});

		expect(bundle).toBeDefined();
		expect(bundle?.helperMethods).toEqual(expected.helperMethods);
		expect(bundle?.mutationMetadata).toEqual(expected.mutationMetadata);
		expect(Object.keys(bundle?.routeHandlers ?? {})).toEqual(
			Object.keys(expected.routeHandlers)
		);
	});
});
