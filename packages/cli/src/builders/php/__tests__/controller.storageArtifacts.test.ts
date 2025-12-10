import {
	buildStorageArtifacts,
	resolveRouteMutationMetadata,
	buildCacheKeyPlan,
} from '../controller.storageArtifacts';
import type { ResourceStorageHelperState } from '../types';
import type { IRResource } from '../../../ir';
import type { PhpStmtClassMethod } from '@wpkernel/php-json-ast/nodes/stmt/types';

jest.mock('@wpkernel/wp-json-ast', () => ({
	buildResourceCacheKeysPlan: jest.fn().mockReturnValue('cache-plan'),
}));

const { buildResourceCacheKeysPlan } = jest.requireMock(
	'@wpkernel/wp-json-ast'
);

function createState(): ResourceStorageHelperState {
	return {
		transient: new Map(),
		wpOption: new Map(),
		wpTaxonomy: new Map(),
	};
}

function createResource(overrides: Partial<IRResource> = {}): IRResource {
	const storage =
		overrides.storage?.mode === 'wp-taxonomy'
			? {
					mode: 'wp-taxonomy' as const,
					taxonomy:
						(overrides.storage as { taxonomy?: string } | undefined)
							?.taxonomy ?? 'jobs',
					hierarchical: overrides.storage?.hierarchical,
				}
			: overrides.storage;
	return {
		id: 'res:jobs',
		name: 'jobs',
		cacheKeys: {
			list: { segments: ['jobs'], source: 'default' },
			get: { segments: ['jobs', ':id'], source: 'default' },
			create: { segments: ['jobs', 'create'], source: 'default' },
			update: { segments: ['jobs', 'update'], source: 'default' },
			remove: { segments: ['jobs', 'remove'], source: 'default' },
		},
		controllerClass: 'Demo\\JobsController',
		storage,
		...overrides,
	} as unknown as IRResource;
}

describe('controller storage artifacts', () => {
	it('returns taxonomy artifacts when state contains entries', () => {
		const state = createState();
		state.wpTaxonomy.set('jobs', {
			helperMethods: ['taxonomyMethod' as unknown as PhpStmtClassMethod],
			helperSignatures: ['taxonomySignature'],
			routeHandlers: {
				get: () => ['taxonomyHandler' as unknown as PhpStmtClassMethod],
			},
		});

		const artifacts = buildStorageArtifacts({
			resource: createResource({
				storage: { mode: 'wp-taxonomy', taxonomy: 'jobs' },
			}),
			storageState: state,
		});

		const mockRouteContext = {
			metadata: {} as any,
			metadataHost: {} as any,
		};

		expect(artifacts.helperMethods).toEqual(['taxonomyMethod']);
		expect(artifacts.helperSignatures).toEqual(['taxonomySignature']);
		expect(typeof artifacts.routeHandlers?.get).toBe('function');
		expect(artifacts.routeHandlers?.get?.(mockRouteContext)).toEqual([
			'taxonomyHandler',
		]);
	});

	it('returns transient artifacts and empty signatures when missing state', () => {
		const state = createState();
		state.transient.set('jobs', {
			helperMethods: ['transientMethod' as unknown as PhpStmtClassMethod],
			routeHandlers: {
				get: () => [
					'transientHandler' as unknown as PhpStmtClassMethod,
				],
			},
		});

		const artifacts = buildStorageArtifacts({
			resource: createResource({ storage: { mode: 'transient' } }),
			storageState: state,
		});

		const mockRouteContext = {
			metadata: {} as any,
			metadataHost: {} as any,
		};

		expect(artifacts.helperMethods).toEqual(['transientMethod']);
		expect(artifacts.helperSignatures).toEqual([]);
		expect(typeof artifacts.transientHandlers?.get).toBe('function');
		expect(artifacts.transientHandlers?.get?.(mockRouteContext)).toEqual([
			'transientHandler',
		]);
	});

	it('returns default artifacts when resource has no storage mode', () => {
		const state = createState();
		const artifacts = buildStorageArtifacts({
			resource: createResource({ storage: undefined }),
			storageState: state,
		});

		expect(artifacts).toEqual({
			helperMethods: [],
			helperSignatures: [],
		});
	});

	it('resolves route mutation metadata for wp-post storage', () => {
		expect(
			resolveRouteMutationMetadata(
				createResource({ storage: { mode: 'wp-post' } })
			)
		).toEqual({ channelTag: 'resource.wpPost.mutation' });
		expect(
			resolveRouteMutationMetadata(
				createResource({ storage: { mode: 'transient' } })
			)
		).toBeUndefined();
	});

	it('builds cache key plan with optional segments removed when undefined', () => {
		const resource = createResource({
			cacheKeys: {
				list: { segments: ['jobs'], source: 'default' },
				get: { segments: ['jobs', ':id'], source: 'default' },
				create: undefined,
				update: undefined,
				remove: undefined,
			},
		});

		const result = buildCacheKeyPlan(resource);

		expect(result).toBe('cache-plan');
		expect(buildResourceCacheKeysPlan).toHaveBeenCalledWith({
			list: { segments: ['jobs'] },
			get: { segments: ['jobs', ':id'] },
		});
	});
});
