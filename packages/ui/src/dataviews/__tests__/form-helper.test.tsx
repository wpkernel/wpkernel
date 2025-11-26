import { render, renderHook, act } from '@testing-library/react';
import type { ResourceObject } from '@wpkernel/core/resource';
import type { WPKernelUIRuntime } from '@wpkernel/core/data';
import { useDataFormHelper } from '../form-helper';

const submitMock = jest.fn();
const resetMock = jest.fn();
const controllerFactoryMock = jest.fn(() => () => ({
	submit: submitMock,
	reset: resetMock,
	cancel: jest.fn(),
	state: { status: 'idle', error: undefined, inFlight: 0 },
}));

jest.mock('../data-form-controller', () => ({
	createDataFormController: () => controllerFactoryMock(),
}));

function createRuntime(): WPKernelUIRuntime {
	return {
		namespace: 'tests',
		reporter: {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			child: jest.fn(() => ({
				debug: jest.fn(),
				error: jest.fn(),
				info: jest.fn(),
				warn: jest.fn(),
				child: jest.fn(),
			})),
		} as any,
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
				child: jest.fn(() => ({
					debug: jest.fn(),
					error: jest.fn(),
					info: jest.fn(),
					warn: jest.fn(),
					child: jest.fn(),
				})),
			} as any,
			options: { enable: true, autoRegisterResources: true },
			getResourceReporter: jest.fn(),
		},
	} as unknown as WPKernelUIRuntime;
}

function createResource(): ResourceObject<{ id: number }, unknown> {
	return {
		name: 'job',
		key: jest.fn(() => ['job', 'list']),
		cache: {} as any,
		store: {} as any,
		storeApi: {} as any,
		descriptor: {} as any,
		reporter: {} as any,
		mutate: {} as any,
	} as unknown as ResourceObject<{ id: number }, unknown>;
}

describe('useDataFormHelper', () => {
	beforeEach(() => {
		submitMock.mockReset();
		resetMock.mockReset();
		controllerFactoryMock.mockClear();
	});

	it('returns a DataForm element and wires submit with buildInput', async () => {
		const runtime = createRuntime();
		const resource = createResource();
		const buildInput = jest.fn(() => ({ title: 'built' }));

		const { result } = renderHook(() =>
			useDataFormHelper({
				resource,
				runtime: runtime as any,
				resourceName: 'job',
				fields: [],
				form: { layout: { type: 'regular' }, fields: [] } as any,
				buildInput,
			})
		);

		render(result.current.Form);
		expect(controllerFactoryMock).toHaveBeenCalled();

		await act(async () => {
			await result.current.submit();
		});

		expect(buildInput).toHaveBeenCalled();
		expect(submitMock).toHaveBeenCalledWith({ title: 'built' });
	});

	it('honors validate and blocks submit when invalid', async () => {
		const runtime = createRuntime();
		const resource = createResource();
		const validate = jest.fn(() => 'invalid');

		const { result } = renderHook(() =>
			useDataFormHelper({
				resource,
				runtime: runtime as any,
				resourceName: 'job',
				fields: [],
				form: { layout: { type: 'regular' }, fields: [] } as any,
				validate,
			})
		);

		await expect(
			act(async () => {
				await result.current.submit();
			})
		).rejects.toThrow('invalid');
		expect(submitMock).not.toHaveBeenCalled();
	});

	it('exposes reset passthrough', () => {
		const runtime = createRuntime();
		const resource = createResource();

		const { result } = renderHook(() =>
			useDataFormHelper({
				resource,
				runtime: runtime as any,
				resourceName: 'job',
				fields: [],
				form: { layout: { type: 'regular' }, fields: [] } as any,
			})
		);

		act(() => {
			result.current.reset();
		});

		expect(resetMock).toHaveBeenCalled();
	});
});
