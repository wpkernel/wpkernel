import path from 'node:path';
import type { Reporter } from '@wpkernel/core/reporter';
import {
	collectCanonicalBasePaths,
	buildResourceControllerRouteMetadata,
	WP_POST_MUTATION_CONTRACT,
	type ResolvedIdentity,
} from '@wpkernel/wp-json-ast';
import type { IRv1 } from '../../../ir/publicTypes';
import type { Workspace } from '../../../workspace/types';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';
import {
	createBuilderInput,
	createBuilderOutput,
	createMinimalIr,
	createPipelineContext,
	seedArtifacts,
} from '../test-support/php-builder.test-support';
import { makeIr } from '@cli-tests/ir.test-support';
import * as phpPrinter from '@wpkernel/php-json-ast/php-driver';
import type {
	PhpProgram,
	PhpStmtNamespace,
	PhpStmtUse,
	PhpStmtClass,
	PhpStmtClassMethod,
	PhpStmtReturn,
	PhpExprArray,
	PhpScalarString,
} from '@wpkernel/php-json-ast';
import {
	makeWpPostResource,
	makeWpPostRoutes,
	makeWpTaxonomyResource,
	makeWpOptionResource,
	makeTransientResource,
} from '@cli-tests/builders/resources.test-support';
import {
	createPhpChannelHelper,
	createPhpTransientStorageHelper,
	createPhpWpOptionStorageHelper,
	createPhpWpTaxonomyStorageHelper,
	createPhpWpPostRoutesHelper,
	createPhpResourceControllerHelper,
	createPhpBuilderConfigHelper,
	createWpProgramWriterHelper,
	getPhpBuilderChannel,
} from '../index';
import { makeCapabilityProtectedResource } from '../test-support/capabilityProtectedResource.test-support';
import { buildCacheKeyPlan } from '../controller.storageArtifacts';

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

async function buildApplyOptionsWithArtifacts(
	ir: IRv1,
	overrides?: { workspace?: Workspace; reporter?: Reporter }
) {
	const reporter = overrides?.reporter ?? buildReporter();
	if (!ir.resources.length) {
		ir.resources = [makeWpPostResource()];
	}
	ir.resources = ir.resources.map((resource, index) => ({
		...resource,
		id: resource.id ?? resource.name ?? `res-${index}`,
	}));
	await seedArtifacts(ir, reporter);
	if (!ir.artifacts?.php) {
		throw new Error('Expected PHP artifacts to be seeded for test');
	}
	return buildApplyOptions(ir, overrides);
}

async function runResourceControllerPipeline(
	applyOptions: Parameters<
		ReturnType<typeof createPhpResourceControllerHelper>['apply']
	>[0]
): Promise<void> {
	if (applyOptions.input.ir && !applyOptions.input.ir.artifacts?.php) {
		await seedArtifacts(applyOptions.input.ir, applyOptions.reporter);
	}
	await createPhpBuilderConfigHelper().apply(applyOptions, undefined);
	await createPhpChannelHelper().apply(applyOptions, undefined);
	await createPhpTransientStorageHelper().apply(applyOptions, undefined);
	await createPhpWpOptionStorageHelper().apply(applyOptions, undefined);
	await createPhpWpTaxonomyStorageHelper().apply(applyOptions, undefined);
	await createPhpWpPostRoutesHelper().apply(applyOptions, undefined);
	await createPhpResourceControllerHelper().apply(applyOptions, undefined);
}

function findNamespace(program: PhpProgram): PhpStmtNamespace | undefined {
	return program.find(
		(statement): statement is PhpStmtNamespace =>
			statement.nodeType === 'Stmt_Namespace'
	);
}

function getRoute(
	routes: ReturnType<typeof makeWpPostRoutes>,
	matcher: (route: ReturnType<typeof makeWpPostRoutes>[number]) => boolean
) {
	const route = routes.find(matcher);
	if (!route) {
		throw new Error('Expected route to be defined.');
	}
	return route;
}

function getClassMethods(program: PhpProgram): PhpStmtClassMethod[] {
	const namespaceNode = findNamespace(program);
	const classNode = namespaceNode?.stmts.find(
		(stmt): stmt is PhpStmtClass => stmt.nodeType === 'Stmt_Class'
	);
	if (!classNode) {
		return [];
	}
	return (
		classNode.stmts?.filter(
			(stmt): stmt is PhpStmtClassMethod =>
				stmt.nodeType === 'Stmt_ClassMethod'
		) ?? []
	);
}

function findReturnScalar(
	methods: PhpStmtClassMethod[],
	name: string
): string | undefined {
	const method = methods.find((candidate) => candidate.name?.name === name);
	if (!method) {
		return undefined;
	}
	const returnStmt = (method.stmts ?? []).find(
		(stmt): stmt is PhpStmtReturn => stmt.nodeType === 'Stmt_Return'
	);
	const expr = returnStmt?.expr;
	if (expr && expr.nodeType === 'Scalar_String') {
		const scalar = expr as PhpScalarString;
		return typeof scalar.value === 'string' ? scalar.value : undefined;
	}
	return undefined;
}

function findReturnArray(
	methods: PhpStmtClassMethod[],
	name: string
): string[] {
	function extractScalarString(
		value: PhpExprArray['items'][number]['value']
	): string | undefined {
		if (
			value &&
			value.nodeType === 'Scalar_String' &&
			'value' in value &&
			typeof (value as PhpScalarString).value === 'string'
		) {
			return (value as PhpScalarString).value;
		}
		return undefined;
	}

	const method = methods.find((candidate) => candidate.name?.name === name);
	if (!method) {
		return [];
	}
	const returnStmt = (method.stmts ?? []).find(
		(stmt): stmt is PhpStmtReturn => stmt.nodeType === 'Stmt_Return'
	);
	const expr = returnStmt?.expr;
	if (!expr || expr.nodeType !== 'Expr_Array') {
		return [];
	}
	return ((expr as PhpExprArray).items ?? [])
		.map((item) => (item ? extractScalarString(item.value) : undefined))
		.filter((value): value is string => typeof value === 'string');
}

describe('createPhpResourceControllerHelper', () => {
	it('queues resource controllers with resolved identity and route kinds', async () => {
		const ir = makeIr();
		const applyOptions = await buildApplyOptionsWithArtifacts(ir);
		const { reporter } = applyOptions;

		await runResourceControllerPipeline(applyOptions);

		const channel = getPhpBuilderChannel(applyOptions.context);
		const entry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata?.kind === 'resource-controller'
			);

		expect(entry).toBeDefined();
		expect(entry?.metadata).toMatchObject({
			kind: 'resource-controller',
			identity: { type: 'string', param: 'slug' },
		});
		if (entry?.metadata.kind === 'resource-controller') {
			expect(entry.metadata.routes).toEqual([
				{
					method: 'GET',
					path: '/wpk/v1/books',
					kind: 'list',
					cacheSegments: ['books', 'list'],
				},
				{
					method: 'GET',
					path: '/wpk/v1/books/:slug',
					kind: 'get',
					cacheSegments: ['books', 'get'],
				},
				{
					method: 'POST',
					path: '/wpk/v1/books',
					kind: 'create',
					cacheSegments: ['books', 'create'],
					tags: { 'resource.wpPost.mutation': 'create' },
				},
				{
					method: 'PUT',
					path: '/wpk/v1/books/:slug',
					kind: 'update',
					cacheSegments: ['books', 'update'],
					tags: { 'resource.wpPost.mutation': 'update' },
				},
				{
					method: 'DELETE',
					path: '/wpk/v1/books/:slug',
					kind: 'remove',
					cacheSegments: ['books', 'remove'],
					tags: { 'resource.wpPost.mutation': 'delete' },
				},
			]);
		}
		expect(entry?.docblock).toMatchSnapshot('resource-controller-docblock');
		expect(entry?.statements).toEqual([]);
		expect(entry?.program).toMatchSnapshot('resource-controller-ast');
		const warnings = (reporter.warn as jest.Mock).mock.calls;
		expect(warnings.length).toBeGreaterThanOrEqual(3);
		expect(warnings).toEqual(
			expect.arrayContaining([
				[
					'Write route missing capability.',
					{
						resource: 'books',
						method: 'POST',
						path: '/wpk/v1/books',
					},
				],
				[
					'Write route missing capability.',
					{
						resource: 'books',
						method: 'PUT',
						path: '/wpk/v1/books/:slug',
					},
				],
				[
					'Write route missing capability.',
					{
						resource: 'books',
						method: 'DELETE',
						path: '/wpk/v1/books/:slug',
					},
				],
			])
		);
	});

	it('emits wp-post helpers derived from storage config', async () => {
		const ir = makeIr();
		const applyOptions = await buildApplyOptionsWithArtifacts(ir);
		await runResourceControllerPipeline(applyOptions);

		const channel = getPhpBuilderChannel(applyOptions.context);
		const entry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata?.kind === 'resource-controller' &&
					candidate.metadata.name === 'books'
			);

		expect(entry).toBeDefined();
		if (!entry || entry.metadata.kind !== 'resource-controller') {
			throw new Error('Expected resource controller entry.');
		}

		const methods = getClassMethods(entry.program);
		const methodNames = methods.map((method) => method.name?.name);

		expect(methodNames).toEqual(
			expect.arrayContaining([
				'getBooksPostType',
				'getBooksStatuses',
				'normaliseBooksStatus',
				'resolveBooksPost',
				'syncBooksMeta',
				'syncBooksTaxonomies',
				'prepareBooksResponse',
			])
		);

		expect(findReturnScalar(methods, 'getBooksPostType')).toBe('book');
		expect(findReturnArray(methods, 'getBooksStatuses')).toEqual([
			'draft',
			'publish',
		]);
	});

	it('imports the generated capability namespace for protected routes', async () => {
		const ir = createMinimalIr({
			namespace: 'Demo\\Plugin',
			resources: [makeCapabilityProtectedResource()],
			php: { namespace: 'Demo\\Plugin' },
		});
		const applyOptions = await buildApplyOptionsWithArtifacts(ir);
		const { context } = applyOptions;

		await runResourceControllerPipeline(applyOptions);

		const channel = getPhpBuilderChannel(context);
		const entry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata.kind === 'resource-controller' &&
					candidate.metadata.name === 'books'
			);

		expect(entry).toBeDefined();
		if (!entry || entry.metadata.kind !== 'resource-controller') {
			throw new Error('Expected resource controller entry.');
		}

		// Type assertion for resource controller routes
		type ResourceControllerRoute = {
			method: string;
			path: string;
			kind: string;
			cacheSegments?: string[];
			tags?: Record<string, string>;
		};

		const createRoute = (
			entry.metadata.routes as ResourceControllerRoute[]
		).find(
			(route) => route.method === 'POST' && route.path === '/wpk/v1/books'
		);

		expect(createRoute).toMatchObject({
			method: 'POST',
			path: '/wpk/v1/books',
			kind: 'create',
			cacheSegments: ['books', 'create'],
			tags: { 'resource.wpPost.mutation': 'create' },
		});

		const namespaceNode = findNamespace(entry.program);
		const imports =
			namespaceNode?.stmts
				.filter(
					(stmt): stmt is PhpStmtUse => stmt.nodeType === 'Stmt_Use'
				)
				.flatMap((useStmt) =>
					useStmt.uses.map((useItem) => useItem.name.parts.join('\\'))
				) ?? [];

		expect(imports).toContain(
			'Demo\\Plugin\\Generated\\Capability\\Capability'
		);
	});

	it('enforces capabilities inside handlers while permission_callback stays open', async () => {
		const ir = createMinimalIr({
			namespace: 'Demo\\Plugin',
			resources: [makeCapabilityProtectedResource()],
			php: { namespace: 'Demo\\Plugin' },
		});
		const applyOptions = await buildApplyOptionsWithArtifacts(ir);
		const { context } = applyOptions;

		await runResourceControllerPipeline(applyOptions);

		const channel = getPhpBuilderChannel(context);
		const entry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata.kind === 'resource-controller' &&
					candidate.metadata.name === 'books'
			);

		expect(entry).toBeDefined();
		if (!entry || entry.metadata.kind !== 'resource-controller') {
			throw new Error('Expected resource controller entry.');
		}

		const printer = phpPrinter.buildPhpPrettyPrinter({
			workspace: context.workspace,
		});
		const { code } = await printer.prettyPrint({
			filePath: context.workspace.resolve('Rest/BooksController.php'),
			program: entry.program,
		});

		expect(code).toContain("'permission_callback' => '__return_true'");
		expect(code).toContain('Capability::enforce');
	});

	it('queues taxonomy controllers with pagination helpers and term shaping', async () => {
		const reporter = buildReporter();
		const workspace = buildWorkspace();

		const ir = makeIr({
			resources: [makeWpTaxonomyResource()],
		});

		const applyOptions = await buildApplyOptionsWithArtifacts(ir, {
			workspace,
			reporter,
		});
		const { context } = applyOptions;

		await runResourceControllerPipeline(applyOptions);

		const channel = getPhpBuilderChannel(context);
		const taxonomyEntry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata?.kind === 'resource-controller' &&
					candidate.metadata.name === 'jobCategories'
			);

		expect(taxonomyEntry).toBeDefined();
		expect(taxonomyEntry?.metadata).toMatchObject({
			name: 'jobCategories',
			routes: [
				{
					method: 'GET',
					path: '/wpk/v1/job-categories',
					kind: 'list',
				},
				{
					method: 'GET',
					path: '/wpk/v1/job-categories/:slug',
					kind: 'get',
				},
			],
		});

		expect(taxonomyEntry?.docblock).toMatchSnapshot(
			'taxonomy-controller-docblock'
		);
		expect(taxonomyEntry?.statements).toEqual([]);
		expect(taxonomyEntry?.program).toMatchSnapshot(
			'taxonomy-controller-ast'
		);
	});

	it('queues wp-option controllers with autoload helpers', async () => {
		const ir = createMinimalIr({ resources: [makeWpOptionResource()] });
		const applyOptions = await buildApplyOptionsWithArtifacts(ir);
		const { context, output } = applyOptions;

		await runResourceControllerPipeline(applyOptions);

		const channel = getPhpBuilderChannel(context);
		const optionEntry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata.kind === 'resource-controller' &&
					candidate.metadata.name === 'demoOption'
			);

		expect(optionEntry).toBeDefined();
		expect(optionEntry?.metadata).toMatchObject({
			name: 'demoOption',
			routes: [
				{
					method: 'GET',
					path: '/wpk/v1/demo-option',
					kind: 'custom',
				},
				{
					method: 'PUT',
					path: '/wpk/v1/demo-option',
					kind: 'custom',
				},
			],
		});

		expect(optionEntry?.docblock).toMatchSnapshot(
			'wp-option-controller-docblock'
		);
		expect(optionEntry?.statements).toEqual([]);
		expect(optionEntry?.program).toMatchSnapshot(
			'wp-option-controller-ast'
		);

		if (!optionEntry) {
			throw new Error('Expected wp-option controller entry.');
		}

		const prettyPrinter = {
			prettyPrint: jest.fn(async ({ program }) => ({
				code: '<?php\n// demo-option controller\n',
				ast: program,
			})),
		};
		const prettyPrinterSpy = jest
			.spyOn(phpPrinter, 'buildPhpPrettyPrinter')
			.mockReturnValue(prettyPrinter as never);

		try {
			const writerHelper = createWpProgramWriterHelper();
			await writerHelper.apply(applyOptions, undefined);

			expect(prettyPrinter.prettyPrint).toHaveBeenCalledWith({
				filePath: optionEntry.file,
				program: optionEntry.program,
			});
			expect(output.queueWrite).toHaveBeenCalledWith({
				file: optionEntry.file,
				contents: expect.stringContaining('// demo-option controller'),
			});
		} finally {
			prettyPrinterSpy.mockRestore();
		}
	});

	it('queues transient controllers with TTL helpers and cache metadata', async () => {
		const ir = createMinimalIr({ resources: [makeTransientResource()] });
		const applyOptions = await buildApplyOptionsWithArtifacts(ir);
		const { context, output } = applyOptions;

		await runResourceControllerPipeline(applyOptions);

		const channel = getPhpBuilderChannel(context);
		const transientEntry = channel
			.pending()
			.find(
				(candidate) =>
					candidate.metadata.kind === 'resource-controller' &&
					candidate.metadata.name === 'jobCache'
			);

		expect(transientEntry).toBeDefined();
		expect(transientEntry?.metadata).toMatchObject({
			name: 'jobCache',
			routes: [
				{ method: 'GET', path: '/wpk/v1/job-cache', kind: 'custom' },
				{ method: 'PUT', path: '/wpk/v1/job-cache', kind: 'custom' },
				{
					method: 'DELETE',
					path: '/wpk/v1/job-cache',
					kind: 'custom',
				},
			],
		});
		expect(transientEntry?.docblock).toMatchSnapshot(
			'transient-controller-docblock'
		);
		expect(transientEntry?.statements).toEqual([]);
		expect(transientEntry?.program).toMatchSnapshot(
			'transient-controller-ast'
		);

		if (!transientEntry) {
			throw new Error('Expected transient controller entry.');
		}

		const prettyPrinter = {
			prettyPrint: jest.fn(async ({ program }) => ({
				code: '<?php\n// job-cache controller\n',
				ast: program,
			})),
		};
		const prettyPrinterSpy = jest
			.spyOn(phpPrinter, 'buildPhpPrettyPrinter')
			.mockReturnValue(prettyPrinter as never);

		try {
			const writerHelper = createWpProgramWriterHelper();
			await writerHelper.apply(applyOptions, undefined);

			expect(prettyPrinter.prettyPrint).toHaveBeenCalledWith({
				filePath: transientEntry.file,
				program: transientEntry.program,
			});
			expect(output.queueWrite).toHaveBeenCalledWith({
				file: transientEntry.file,
				contents: expect.stringContaining('// job-cache controller'),
			});
		} finally {
			prettyPrinterSpy.mockRestore();
		}
	});
});

describe('buildResourceControllerRouteMetadata', () => {
	it('annotates mutation routes with cache segments and contract tags', () => {
		const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
		const resource = makeWpPostResource();

		const allRoutes = makeWpPostRoutes();
		const routes = [
			getRoute(allRoutes, (route) => route.method === 'POST'),
			getRoute(allRoutes, (route) => route.method === 'PUT'),
			getRoute(allRoutes, (route) => route.method === 'DELETE'),
		];

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = buildResourceControllerRouteMetadata({
			routes: routes.map((route) => ({
				method: route.method,
				path: route.path,
			})),
			identity: { param: identity.param },
			canonicalBasePaths,
			cacheKeys: buildCacheKeyPlan(resource),
			mutationMetadata: {
				channelTag: WP_POST_MUTATION_CONTRACT.metadataKeys.channelTag,
			},
		});

		expect(metadata).toEqual([
			{
				method: 'POST',
				path: '/wpk/v1/books',
				kind: 'create',
				cacheSegments: ['books', 'create'],
				tags: { 'resource.wpPost.mutation': 'create' },
			},
			{
				method: 'PUT',
				path: '/wpk/v1/books/:slug',
				kind: 'update',
				cacheSegments: ['books', 'update'],
				tags: { 'resource.wpPost.mutation': 'update' },
			},
			{
				method: 'DELETE',
				path: '/wpk/v1/books/:slug',
				kind: 'remove',
				cacheSegments: ['books', 'remove'],
				tags: { 'resource.wpPost.mutation': 'delete' },
			},
		]);
	});

	it('omits mutation metadata when storage is not wp-post', () => {
		const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
		const resource = makeWpTaxonomyResource({
			name: 'books',
			schemaKey: 'book',
			cacheKeys: {
				list: { segments: ['list'], source: 'default' },
				get: { segments: ['get'], source: 'default' },
				create: { segments: ['create'], source: 'default' },
				update: { segments: ['update'], source: 'default' },
				remove: { segments: ['remove'], source: 'default' },
			},
		});

		const allRoutes = makeWpPostRoutes();
		const routes = [
			getRoute(allRoutes, (route) => route.method === 'POST'),
			getRoute(
				allRoutes,
				(route) =>
					route.method === 'GET' &&
					!route.path.includes(`:${identity.param}`)
			),
		];

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = buildResourceControllerRouteMetadata({
			routes: routes.map((route) => ({
				method: route.method,
				path: route.path,
			})),
			identity: { param: identity.param },
			canonicalBasePaths,
			cacheKeys: buildCacheKeyPlan(resource),
			mutationMetadata: undefined,
		});

		expect(metadata).toEqual([
			{
				method: 'POST',
				path: '/wpk/v1/books',
				kind: 'custom',
			},
			{
				method: 'GET',
				path: '/wpk/v1/books',
				kind: 'custom',
			},
		]);
	});

	it('falls back to empty segments when mutation cache keys are undefined', () => {
		const identity: ResolvedIdentity = { type: 'string', param: 'slug' };
		const resource = makeWpPostResource({
			cacheKeys: {
				list: { segments: ['list'], source: 'default' },
				get: { segments: ['get'], source: 'default' },
				create: undefined,
				update: undefined,
				remove: undefined,
			},
		});

		const allRoutes = makeWpPostRoutes();
		const routes = [
			getRoute(allRoutes, (route) => route.method === 'POST'),
			getRoute(allRoutes, (route) => route.method === 'PUT'),
			getRoute(allRoutes, (route) => route.method === 'DELETE'),
		];

		const canonicalBasePaths = collectCanonicalBasePaths(
			routes,
			identity.param
		);
		const metadata = buildResourceControllerRouteMetadata({
			routes: routes.map((route) => ({
				method: route.method,
				path: route.path,
			})),
			identity: { param: identity.param },
			canonicalBasePaths,
			cacheKeys: buildCacheKeyPlan(resource),
			mutationMetadata: {
				channelTag: WP_POST_MUTATION_CONTRACT.metadataKeys.channelTag,
			},
		});

		expect(metadata).toEqual([
			{
				method: 'POST',
				path: '/wpk/v1/books',
				kind: 'create',
				cacheSegments: [],
				tags: { 'resource.wpPost.mutation': 'create' },
			},
			{
				method: 'PUT',
				path: '/wpk/v1/books/:slug',
				kind: 'update',
				cacheSegments: [],
				tags: { 'resource.wpPost.mutation': 'update' },
			},
			{
				method: 'DELETE',
				path: '/wpk/v1/books/:slug',
				kind: 'remove',
				cacheSegments: [],
				tags: { 'resource.wpPost.mutation': 'delete' },
			},
		]);
	});
});

function buildApplyOptions(
	ir: IRv1,
	overrides?: { workspace?: Workspace; reporter?: Reporter }
) {
	const reporter = overrides?.reporter ?? buildReporter();
	const workspace = overrides?.workspace ?? buildWorkspace();
	const context = createPipelineContext({ workspace, reporter });
	const output = createBuilderOutput();

	return {
		context,
		input: createBuilderInput({
			ir,
			options: {
				namespace: ir.meta.namespace,
				origin: ir.meta.origin,
				sourcePath: ir.meta.sourcePath,
			},
		}),
		output,
		reporter,
	};
}
