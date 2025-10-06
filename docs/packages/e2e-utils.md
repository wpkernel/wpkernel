# @geekist/wp-kernel-e2e-utils

End-to-end testing utilities for WP Kernel projects, built on `@wordpress/e2e-test-utils-playwright` with kernel-specific helpers and fixtures.

## Overview

This package provides a comprehensive testing toolkit for WP Kernel applications. It extends WordPress E2E utilities with kernel-aware helpers for testing resources, actions, events, and the complete user workflow.

## Architecture

```mermaid
graph TD
    A[wp-kernel-e2e-utils] --> B[@wordpress/e2e-test-utils-playwright]
    A --> C[Kernel Test Fixtures]
    B --> D[Playwright Framework]
    C --> E[Resource Testing]
    C --> F[Action Testing]
    C --> G[Event Testing]
    C --> H[Store Testing]
```

## Design Philosophy

- **WordPress-Native**: Builds on official WordPress E2E testing tools
- **Kernel-Aware**: Provides utilities specific to WP Kernel patterns
- **Real Environment**: Tests against actual WordPress with wp-env
- **Domain-Focused**: Validates complete user workflows, not just unit functionality

## Installation

```bash
npm install -D @geekist/wp-kernel-e2e-utils
# or
pnpm add -D @geekist/wp-kernel-e2e-utils
```

### Peer Dependencies

- `@playwright/test` - Playwright testing framework
- `@wordpress/e2e-test-utils-playwright` - WordPress E2E utilities
- `@geekist/wp-kernel` - Core framework for fixtures

## Key Features

### Playwright Fixture

**Kernel-aware test environment:**

```typescript
import { test as base } from '@playwright/test';
import { kernel } from '@geekist/wp-kernel-e2e-utils';

const test = base.extend({
	kernel,
});

export { test, expect } from '@playwright/test';
```

### Namespaced API

Import utilities using three flexible patterns:

**Scoped Imports:**

```typescript
import { login } from '@geekist/wp-kernel-e2e-utils/auth';
import { seedPosts } from '@geekist/wp-kernel-e2e-utils/db';
import { waitForResource } from '@geekist/wp-kernel-e2e-utils/store';
```

**Namespace Imports:**

```typescript
import { auth, db, store } from '@geekist/wp-kernel-e2e-utils';

await auth.login(page, 'admin', 'password');
await db.seedPosts(requestUtils, posts);
await store.waitForResource(page, 'post', { id: 123 });
```

**Flat Imports:**

```typescript
import {
	login,
	seedPosts,
	waitForResource,
} from '@geekist/wp-kernel-e2e-utils';
```

## Core Utilities

### Authentication (`auth`)

**Login/logout with role management:**

```typescript
import { test } from './test-utils';

test('admin can create posts', async ({ page, kernel }) => {
	await kernel.auth.loginAsAdmin(page);
	// Test admin functionality
});

test('editor can edit posts', async ({ page, kernel }) => {
	await kernel.auth.loginAsRole(page, 'editor');
	// Test editor capabilities
});
```

### Database Seeding (`db`)

**Set up test data:**

```typescript
test('post list displays correctly', async ({ page, kernel }) => {
	// Seed test data
	const posts = await kernel.db.seedPosts(requestUtils, [
		{ title: 'Test Post 1', status: 'publish' },
		{ title: 'Test Post 2', status: 'draft' },
	]);

	await page.goto('/wp-admin/edit.php');
	// Verify posts appear in list
});
```

**Clean up between tests:**

```typescript
test.afterEach(async ({ kernel }) => {
	await kernel.db.cleanup(['posts', 'users']);
});
```

### REST API Testing (`rest`)

**Validate API responses:**

```typescript
test('post API returns correct data', async ({ kernel }) => {
	const post = await kernel.rest.createPost({
		title: 'API Test Post',
		content: 'Test content',
	});

	expect(post.id).toBeDefined();
	expect(post.title.rendered).toBe('API Test Post');
});
```

**Test resource definitions:**

```typescript
test('post resource matches API contract', async ({ kernel }) => {
	await kernel.rest.validateResource('post', {
		routes: ['list', 'get', 'create', 'update'],
		fields: ['id', 'title', 'content', 'status'],
	});
});
```

### Store Testing (`store`)

**Wait for resource data:**

```typescript
test('resource data loads correctly', async ({ page, kernel }) => {
	await page.goto('/admin.php?page=my-plugin');

	// Wait for specific resource to load
	await kernel.store.waitForResource(page, 'post', {
		query: { status: 'publish' },
		timeout: 5000,
	});

	// Verify UI reflects loaded data
});
```

**Validate cache invalidation:**

```typescript
test('cache invalidates after action', async ({ page, kernel }) => {
	await kernel.store.captureState(page, 'post');

	// Trigger action that should invalidate cache
	await page.click('[data-action="create-post"]');

	await kernel.store.waitForInvalidation(page, 'post');
});
```

### Event Testing (`events`)

**Capture and validate events:**

```typescript
test('action emits correct events', async ({ page, kernel }) => {
	// Start capturing events
	const eventCapture = await kernel.events.startCapture(page, [
		'wpk.resource.post.created',
		'wpk.cache.invalidated',
	]);

	// Trigger action
	await page.click('[data-action="create-post"]');

	// Validate events were emitted
	const events = await eventCapture.getEvents();
	expect(events).toContainEqual({
		type: 'wpk.resource.post.created',
		payload: expect.objectContaining({
			data: expect.objectContaining({ title: 'New Post' }),
		}),
	});
});
```

### Project Utilities (`project`)

**Manage test environments:**

```typescript
test.beforeAll(async ({ kernel }) => {
	await kernel.project.setupEnvironment({
		plugins: ['wp-kernel-showcase'],
		theme: 'twentytwentyfour',
		users: [{ username: 'testuser', role: 'editor' }],
	});
});
```

## Test Patterns

### Complete User Workflow

```typescript
test('user can create and publish post', async ({ page, kernel }) => {
	// Setup
	await kernel.auth.loginAsRole(page, 'author');
	await page.goto('/wp-admin/post-new.php');

	// Create post
	await page.fill('#title', 'E2E Test Post');
	await page.fill('#content', 'This is test content');

	// Publish
	await page.click('#publish');

	// Verify in database
	const post = await kernel.db.getPostByTitle('E2E Test Post');
	expect(post.status).toBe('publish');

	// Verify events
	const events = await kernel.events.getEvents();
	expect(events).toContainEventType('wpk.resource.post.created');
});
```

### Resource CRUD Operations

```typescript
test.describe('Post resource', () => {
	test('full CRUD lifecycle', async ({ kernel }) => {
		// Create
		const post = await kernel.rest.createPost({ title: 'CRUD Test' });

		// Read
		const retrieved = await kernel.rest.getPost(post.id);
		expect(retrieved.title.rendered).toBe('CRUD Test');

		// Update
		const updated = await kernel.rest.updatePost(post.id, {
			title: 'Updated CRUD Test',
		});
		expect(updated.title.rendered).toBe('Updated CRUD Test');

		// Delete
		await kernel.rest.deletePost(post.id);
		await expect(kernel.rest.getPost(post.id)).rejects.toThrow();
	});
});
```

## Configuration

### Playwright Integration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
import { kernel } from '@geekist/wp-kernel-e2e-utils';

export default defineConfig({
	testDir: './tests/e2e',
	use: {
		baseURL: 'http://localhost:8889',
	},
	projects: [
		{
			name: 'kernel-tests',
			use: {
				...devices['Desktop Chrome'],
				kernel: {
					wordpressVersion: '6.8',
					phpVersion: '8.3',
					plugins: ['wp-kernel-showcase'],
				},
			},
		},
	],
});
```

### Test Environment Setup

```typescript
// test-utils.ts
import { test as base, expect } from '@playwright/test';
import { kernel } from '@geekist/wp-kernel-e2e-utils';

export const test = base.extend({
	kernel: kernel({
		cleanup: {
			strategy: 'perTest', // or 'perSuite'
			resources: ['posts', 'users', 'media'],
		},
		timeouts: {
			navigation: 10000,
			resource: 5000,
			event: 3000,
		},
	}),
});

export { expect };
```

## Development Status

This package validates WP Kernel functionality through real browser testing:

- ✓ Core utilities implemented (auth, db, rest, store, events)
- ✓ Playwright fixture system
- ✓ Namespaced API with three import patterns
- ✓ Integration with showcase app E2E tests
- 🚧 Advanced event capture utilities
- 🚧 Performance testing helpers

## Validation Strategy

Unlike traditional unit testing, `@geekist/wp-kernel-e2e-utils` is **validated through usage** in the showcase app's E2E tests. This ensures the utilities work in real WordPress environments.

## TypeScript Support

Full TypeScript support with fixture typing:

```typescript
interface KernelFixture {
	auth: AuthUtils;
	db: DatabaseUtils;
	rest: RestUtils;
	store: StoreUtils;
	events: EventUtils;
	project: ProjectUtils;
}

// Typed event payloads
type PostCreatedEvent = {
	type: 'wpk.resource.post.created';
	payload: { data: Post; meta: EventMeta };
};
```

## Integration Guides

- [E2E Testing Setup](/contributing/e2e-testing) - Getting started with E2E tests
- [Contributing Guide](/contributing/) - Development workflow and testing

## Related Documentation

- [Resources Guide](/guide/resources) - Understanding resource patterns
- [Actions Guide](/guide/actions) - Action orchestration
- [Events Guide](/guide/events) - Event system overview
