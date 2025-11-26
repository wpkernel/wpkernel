import { renderHook, act } from '@testing-library/react';
import type { ResourceObject } from '@wpkernel/core/resource';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';
import { useResourceAdminController } from '../admin-controller';

jest.mock('../resource-controller', () => ({
	createResourceDataViewController: jest.fn(() => ({
		config: {},
		resourceName: 'jobs',
		emitPermissionDenied: jest.fn(),
		emitBoundaryTransition: jest.fn(),
		emitRegistered: jest.fn(),
		emitUnregistered: jest.fn(),
		emitViewChange: jest.fn(),
		mapViewToQuery: jest.fn(),
		deriveViewState: jest.fn(),
		loadStoredView: jest.fn(),
		saveView: jest.fn(),
	})),
}));

jest.mock('../form-helper', () => ({
	useDataFormHelper: jest.fn(() => ({
		Form: null,
		data: {},
		setData: jest.fn(),
		submit: jest.fn(),
		reset: jest.fn(),
		state: { status: 'idle', inFlight: 0, isValid: true },
	})),
}));

function createRuntime(): WPKernelUIRuntime {
	return {
		namespace: 'tests',
		dataviews: {
			registry: new Map(),
			controllers: new Map(),
			preferences: {
				adapter: {
					get: async () => undefined,
					set: async () => undefined,
				},
				get: async () => undefined,
				set: async () => undefined,
				getScopeOrder: () => ['user'],
			},
			events: {
				registered: jest.fn(),
				unregistered: jest.fn(),
				viewChanged: jest.fn(),
				actionTriggered: jest.fn(),
				permissionDenied: jest.fn(),
				fetchFailed: jest.fn(),
				boundaryChanged: jest.fn(),
			},
			reporter: {
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				child: jest.fn(),
			} as any,
			options: { enable: true, autoRegisterResources: true },
			getResourceReporter: jest.fn(),
		},
		reporter: {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn(),
		} as any,
	} as unknown as WPKernelUIRuntime;
}

function createResource(): ResourceObject<{ id: number }, unknown> {
	return {
		name: 'job',
		key: jest.fn(() => ['job', 'list']),
	} as unknown as ResourceObject<{ id: number }, unknown>;
}

describe('useResourceAdminController', () => {
	it('initialises in list mode and toggles modes', () => {
		const runtime = createRuntime();
		const resource = createResource();

		const { result } = renderHook(() =>
			useResourceAdminController({
				resource,
				runtime: runtime as any,
				config: {
					fields: [],
					defaultView: { type: 'table', layout: {} as any },
					mapQuery: () => ({}),
				},
				form: {
					fields: [],
					formLayout: { layout: {}, fields: [] },
				},
			})
		);

		expect(result.current.mode).toBe('list');

		act(() => {
			result.current.openCreate();
		});
		expect(result.current.mode).toBe('create');
		expect(result.current.editId).toBeNull();

		act(() => {
			result.current.openEdit(5);
		});
		expect(result.current.mode).toBe('edit');
		expect(result.current.editId).toBe(5);

		act(() => {
			result.current.close();
		});
		expect(result.current.mode).toBe('list');
		expect(result.current.editId).toBeNull();
	});
});
