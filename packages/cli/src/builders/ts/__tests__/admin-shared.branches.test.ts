import {
	resolveAdminScreenComponentMetadata,
	resolveAdminScreenRoute,
	resolveMenuSlug,
	resolveInteractivityFeature,
	resolveListRoutePath,
	type AdminScreenResourceDescriptor,
} from '../admin-shared';

const descriptorMock = (
	overrides: Partial<AdminScreenResourceDescriptor> = {}
): AdminScreenResourceDescriptor => ({
	key: 'test-key',
	name: 'test-name',
	namespace: 'test-namespace',
	resource: { routes: [] } as any,
	dataviews: {},
	...overrides,
});

describe('admin-shared', () => {
	describe('resolveMenuSlug', () => {
		it('returns undefined when no slug is configured', () => {
			expect(resolveMenuSlug(descriptorMock())).toBeUndefined();
		});

		it('returns slug from screen config if present', () => {
			const descriptor = descriptorMock({
				dataviews: { screen: { menu: { slug: 'screen-slug' } } },
			});
			expect(resolveMenuSlug(descriptor)).toBe('screen-slug');
		});

		it('returns slug from menu config if screen slug is missing', () => {
			const descriptor = descriptorMock({
				menu: { slug: 'menu-slug', parent: 'tools', title: 'Test' },
			});
			expect(resolveMenuSlug(descriptor)).toBe('menu-slug');
		});

		it('prefers screen slug over menu slug', () => {
			const descriptor = descriptorMock({
				dataviews: { screen: { menu: { slug: 'screen-slug' } } },
				menu: { slug: 'menu-slug', parent: 'tools', title: 'Test' },
			});
			expect(resolveMenuSlug(descriptor)).toBe('screen-slug');
		});
	});

	describe('resolveAdminScreenRoute', () => {
		it('returns configured route if present', () => {
			const descriptor = descriptorMock({
				dataviews: { screen: { route: 'custom-route' } },
			});
			expect(resolveAdminScreenRoute(descriptor)).toBe('custom-route');
		});

		it('returns menu slug if route is missing', () => {
			const descriptor = descriptorMock({
				menu: { slug: 'menu-slug', parent: 'tools', title: 'Test' },
			});
			expect(resolveAdminScreenRoute(descriptor)).toBe('menu-slug');
		});

		it('falls back to namespace-name if neither route nor slug is present', () => {
			expect(resolveAdminScreenRoute(descriptorMock())).toBe(
				'test-namespace-test-name'
			);
		});

		it('sanitizes fallback route', () => {
			const descriptor = descriptorMock({
				name: 'bad name!',
				namespace: 'bad namespace!',
			});
			expect(resolveAdminScreenRoute(descriptor)).toBe(
				'bad-namespace-bad-name'
			);
		});

		it('uses fallback when sanitized result is empty', () => {
			const descriptor = descriptorMock({
				name: 'test-name',
				namespace: 'test-namespace',
				dataviews: { screen: { route: '   ' } }, // Empty route
			});
			// Should use fallback logic
			expect(resolveAdminScreenRoute(descriptor)).toBe(
				'test-namespace-test-name'
			);
		});

		it('falls back to "admin-screen" if slugification results in empty string', () => {
			// This is a bit theoretical since we provide a fallback string to slugifyRouteSegment
			// But testing the slugifyRouteSegment logic indirectly via its consumer
			const descriptor = descriptorMock({
				name: '!!!', // Only special chars
				namespace: '!!!',
			});
			// slugifyRouteSegment('!!!-!!!', '!!!')
			// inner fallback logic:
			// cleaned ('') length 0 -> fallbackSlug ('') length 0 -> 'admin-screen'
			expect(resolveAdminScreenRoute(descriptor)).toBe('admin-screen');
		});
	});

	describe('resolveAdminScreenComponentMetadata', () => {
		it('returns defaults when no component path is configured', () => {
			const meta = resolveAdminScreenComponentMetadata(descriptorMock());
			expect(meta).toEqual({
				identifier: 'TestNameAdminScreen',
				fileName: 'page',
				directories: [],
			});
		});

		it('parses configured component path', () => {
			const descriptor = descriptorMock({
				dataviews: {
					screen: { component: 'custom/path/MyComponent.tsx' },
				},
			});
			const meta = resolveAdminScreenComponentMetadata(descriptor);
			expect(meta).toEqual({
				identifier: 'MyComponent',
				fileName: 'MyComponent',
				directories: ['custom', 'path'],
			});
		});

		it('handles "page" filename by using default identifier', () => {
			const descriptor = descriptorMock({
				dataviews: { screen: { component: 'custom/page.tsx' } },
			});
			const meta = resolveAdminScreenComponentMetadata(descriptor);
			expect(meta).toEqual({
				identifier: 'TestNameAdminScreen',
				fileName: 'page',
				directories: ['custom'],
			});
		});

		it('prepends underscore to identifier starting with number', () => {
			const descriptor = descriptorMock({
				dataviews: { screen: { component: '123Component.tsx' } },
			});
			const meta = resolveAdminScreenComponentMetadata(descriptor);
			expect(meta).toEqual({
				identifier: '_123Component',
				fileName: '123Component',
				directories: [],
			});
		});
	});

	describe('resolveInteractivityFeature', () => {
		it('returns configured feature', () => {
			const descriptor = descriptorMock({
				dataviews: { interactivity: { feature: 'my-feature' } },
			});
			expect(resolveInteractivityFeature(descriptor)).toBe('my-feature');
		});

		it('returns default when feature is missing or empty', () => {
			expect(resolveInteractivityFeature(descriptorMock())).toBe(
				'admin-screen'
			);
			const descriptor = descriptorMock({
				dataviews: { interactivity: { feature: '   ' } } as any,
			});
			expect(resolveInteractivityFeature(descriptor)).toBe(
				'admin-screen'
			);
		});
	});

	describe('resolveListRoutePath', () => {
		it('returns null when no suitable GET route is found', () => {
			const descriptor = descriptorMock({
				resource: {
					routes: [
						{ method: 'POST', path: '/test' },
						{ method: 'GET', path: '/test/:id' },
					],
				} as any,
			});
			expect(resolveListRoutePath(descriptor)).toBeNull();
		});

		it('returns path of first suitable GET route', () => {
			const descriptor = descriptorMock({
				resource: {
					routes: [
						{ method: 'POST', path: '/test' },
						{ method: 'GET', path: '/test' },
					],
				} as any,
			});
			expect(resolveListRoutePath(descriptor)).toBe('/test');
		});

		it('ignores routes with {id}', () => {
			const descriptor = descriptorMock({
				resource: {
					routes: [{ method: 'GET', path: '/test/{id}' }],
				} as any,
			});
			expect(resolveListRoutePath(descriptor)).toBeNull();
		});

		it('ignores routes with (?P<', () => {
			const descriptor = descriptorMock({
				resource: {
					routes: [{ method: 'GET', path: '/test/(?P<id>)' }],
				} as any,
			});
			expect(resolveListRoutePath(descriptor)).toBeNull();
		});
	});
});
