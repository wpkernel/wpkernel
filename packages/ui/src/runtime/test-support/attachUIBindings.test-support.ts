import type {
	UIIntegrationOptions,
	WPKInstance,
	WPKernelRegistry,
} from '@wpkernel/core/data';
import type { WPKernelEventBus } from '@wpkernel/core/events';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceObject } from '@wpkernel/core/resource';
import type { Field, View } from '@wordpress/dataviews';

import type { ResourceDataViewConfig } from '../../dataviews/types';

export type PreferencesRegistry = WPKernelRegistry & {
	__store: Map<string, Map<string, unknown>>;
};

export function createPreferencesRegistry(): PreferencesRegistry {
	const store = new Map<string, Map<string, unknown>>();

	const registry = {
		select(storeName: string) {
			if (storeName !== 'core/preferences') {
				return {};
			}

			return {
				get(scope: string, key: string) {
					return store.get(scope)?.get(key);
				},
			};
		},
		dispatch(storeName: string) {
			if (storeName !== 'core/preferences') {
				return {};
			}

			return {
				set(scope: string, key: string, value: unknown) {
					const scopeMap =
						store.get(scope) ?? new Map<string, unknown>();
					if (typeof value === 'undefined') {
						scopeMap.delete(key);
					} else {
						scopeMap.set(key, value);
					}
					store.set(scope, scopeMap);
				},
			};
		},
		__store: store,
	};

	return registry as unknown as PreferencesRegistry;
}

export function setPreferenceValue(
	registry: PreferencesRegistry,
	scope: string,
	key: string,
	value: unknown
): void {
	const actions = registry.dispatch('core/preferences') as {
		set: (scope: string, key: string, value: unknown) => void;
	};
	actions.set(scope, key, value);
}

export function createReporter(): Reporter {
	const child = jest.fn();
	const reporter = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child,
	} as unknown as jest.Mocked<Reporter>;
	child.mockReturnValue(reporter);
	return reporter;
}

export function createReporterWithThrowingChild(): Reporter {
	const child = jest.fn(() => {
		throw new Error('child failure');
	});
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child,
	} as unknown as jest.Mocked<Reporter>;
}

export function createReporterWithUndefinedChild(): Reporter {
	const child = jest.fn(() => undefined);
	return {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		debug: jest.fn(),
		child,
	} as unknown as jest.Mocked<Reporter>;
}

export function createResourceWithDataView(
	overrides: {
		dataviews?: Partial<
			ResourceDataViewConfig<unknown, { search?: string }>
		> &
			Record<string, unknown>;
	} = {}
): ResourceObject<unknown, { search?: string }> {
	const reporter = createReporter();
	const resource = {
		name: 'jobs',
		routes: { list: { path: '/jobs', method: 'GET' } },
		cacheKeys: {
			list: jest.fn(),
			get: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			remove: jest.fn(),
		},
		reporter,
		fetchList: jest.fn(),
		prefetchList: jest.fn(),
	} as unknown as ResourceObject<unknown, { search?: string }>;

	const baseView: View = {
		type: 'table',
		fields: ['title'],
		page: 1,
		perPage: 20,
	} as View;

	const dataviewConfig: ResourceDataViewConfig<unknown, { search?: string }> =
		{
			fields: [
				{ id: 'title', label: 'Title' } as Field<unknown>,
				{ id: 'status', label: 'Status' } as Field<unknown>,
			],
			defaultView: baseView,
			mapQuery: jest.fn(() => ({ search: undefined })),
			search: true,
			searchLabel: 'Search jobs',
			perPageSizes: [10, 20, 50],
			defaultLayouts: { table: { density: 'compact' } },
			views: [
				{
					id: 'all',
					label: 'All jobs',
					isDefault: true,
					view: { ...baseView },
				},
			],
			screen: {
				component: 'JobsAdminScreen',
				route: '/admin/jobs',
				menu: {
					slug: 'jobs-admin',
					title: 'Jobs',
					capability: 'manage_jobs',
				},
			},
		};

	const dataviewOverrides = overrides.dataviews ?? {};
	const dataviews = {
		...dataviewConfig,
		...dataviewOverrides,
	} as ResourceDataViewConfig<unknown, { search?: string }>;

	(
		resource as unknown as {
			ui?: { admin?: { view?: string; dataviews?: unknown } };
		}
	).ui = {
		admin: {
			view: 'dataview',
			dataviews,
		},
	};

	return resource;
}

export function createWPKernel(
	events: WPKernelEventBus,
	options?: UIIntegrationOptions,
	registry?: WPKernelRegistry,
	reporter?: Reporter
): WPKInstance {
	const reporterInstance = reporter ?? createReporter();

	const kernel: WPKInstance = {
		getNamespace: () => 'tests',
		getReporter: () => reporterInstance,
		invalidate: jest.fn(),
		emit: jest.fn(),
		teardown: jest.fn(),
		getRegistry: () => registry,
		hasUIRuntime: () => false,
		getUIRuntime: () => undefined,
		attachUIBindings: jest.fn(),
		ui: {
			isEnabled: () => false,
			options,
		},
		events: Object.assign(events, {
			on: jest.spyOn(events, 'on'),
			emit: jest.spyOn(events, 'emit'),
		}),
		defineResource: jest.fn(),
	};

	return kernel;
}
