import { defineResource } from '@geekist/wp-kernel/resource';
import {
	attachResourceHooks,
	type UseResourceItemResult,
	type UseResourceListResult,
} from '../resource-hooks';

interface MockThing {
	id: number;
	title: string;
	status: string;
}

interface MockThingQuery {
	q?: string;
	status?: string;
}

describe('resource hooks (UI integration)', () => {
	let mockWpData: {
		useSelect: jest.Mock;
		select: jest.Mock;
		dispatch: jest.Mock;
		createReduxStore?: jest.Mock;
		register?: jest.Mock;
	};
	let originalWp: Window['wp'];

	beforeEach(() => {
		const windowWithWp = global.window as Window & { wp?: any };
		originalWp = windowWithWp?.wp;
		mockWpData = {
			useSelect: jest.fn(),
			select: jest.fn(),
			dispatch: jest.fn(),
		};
		windowWithWp.wp = {
			data: mockWpData,
		};
	});

	afterEach(() => {
		const windowWithWp = global.window as Window & { wp?: any };
		windowWithWp.wp = originalWp;
		jest.restoreAllMocks();
	});

	describe('useGet hook', () => {
		it('throws when @wordpress/data is not available', () => {
			(global.window as Window & { wp?: any }).wp = undefined;

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			expect(() => resource.useGet!(1)).toThrow(
				'useGet requires @wordpress/data to be loaded'
			);
		});

		it('invokes useSelect with correct selector', () => {
			const mockItem: MockThing = {
				id: 1,
				title: 'Thing One',
				status: 'active',
			};

			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(mockItem),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getItemError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			const result = resource.useGet!(
				1
			) as UseResourceItemResult<MockThing>;

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result).toEqual({
				data: mockItem,
				isLoading: false,
				error: undefined,
			});
		});

		it('sets loading state when selector resolving', () => {
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(undefined),
					isResolving: jest.fn().mockReturnValue(true),
					hasFinishedResolution: jest.fn().mockReturnValue(false),
					getItemError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			const result = resource.useGet!(1);

			expect(result).toEqual({
				data: undefined,
				isLoading: true,
				error: undefined,
			});
		});

		it('exposes selector error message', () => {
			const mockError = { message: 'Not found' };
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getItem: jest.fn().mockReturnValue(undefined),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getItemError: jest.fn().mockReturnValue(mockError),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					get: { path: '/wpk/v1/things/:id', method: 'GET' },
				},
			});

			const result = resource.useGet!(1);

			expect(result).toEqual({
				data: undefined,
				isLoading: false,
				error: 'Not found',
			});
		});
	});

	describe('useList hook', () => {
		it('throws when @wordpress/data is not available', () => {
			(global.window as Window & { wp?: any }).wp = undefined;

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			expect(() => resource.useList!()).toThrow(
				'useList requires @wordpress/data to be loaded'
			);
		});

		it('returns list data and loading state', () => {
			const mockItems: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
				{ id: 2, title: 'Thing Two', status: 'inactive' },
			];

			const mockListResponse = {
				items: mockItems,
				total: mockItems.length,
				page: 1,
				perPage: 10,
			};

			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(mockListResponse),
					getListStatus: jest.fn().mockReturnValue('success'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(undefined),
				};

				return callback(() => mockSelect);
			});
			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = resource.useList!();

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result).toEqual({
				data: mockListResponse,
				isLoading: false,
				error: undefined,
			} as UseResourceListResult<MockThing>);
		});
		it('passes query parameter to selector', () => {
			const mockItems: MockThing[] = [
				{ id: 1, title: 'Thing One', status: 'active' },
			];
			const query: MockThingQuery = { status: 'active' };

			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(mockItems),
					getListStatus: jest.fn().mockReturnValue('success'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = resource.useList!(query);

			expect(mockWpData.useSelect).toHaveBeenCalled();
			expect(result.data).toEqual(mockItems);
		});

		it('derives loading state from status', () => {
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(undefined),
					getListStatus: jest.fn().mockReturnValue('loading'),
					isResolving: jest.fn().mockReturnValue(true),
					hasFinishedResolution: jest.fn().mockReturnValue(false),
					getListError: jest.fn().mockReturnValue(null),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = resource.useList!();

			expect(result).toEqual({
				data: undefined,
				isLoading: true,
				error: null,
			});
		});

		it('propagates selector errors', () => {
			const mockError = 'Server error';
			mockWpData.useSelect.mockImplementation((callback: any) => {
				const mockSelect = {
					getList: jest.fn().mockReturnValue(undefined),
					getListStatus: jest.fn().mockReturnValue('error'),
					isResolving: jest.fn().mockReturnValue(false),
					hasFinishedResolution: jest.fn().mockReturnValue(true),
					getListError: jest.fn().mockReturnValue(mockError),
				};

				return callback(() => mockSelect);
			});

			const resource = defineResource<MockThing, MockThingQuery>({
				name: 'thing',
				routes: {
					list: { path: '/wpk/v1/things', method: 'GET' },
				},
			});

			const result = resource.useList!();

			expect(result).toEqual({
				data: undefined,
				isLoading: false,
				error: mockError,
			});
		});
	});

	it('exposes manual attach helper for existing resources', () => {
		const resource = defineResource<MockThing, MockThingQuery>({
			name: 'thing',
			routes: {
				get: { path: '/wpk/v1/things/:id', method: 'GET' },
			},
		});

		// Remove hooks assigned during definition
		resource.useGet = undefined;
		attachResourceHooks(resource);

		expect(typeof resource.useGet).toBe('function');
	});
});
