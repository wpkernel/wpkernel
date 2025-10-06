# @geekist/wp-kernel-e2e-utils

> End-to-end testing utilities for WordPress + WP Kernel applications (Optional)

## Overview

Playwright-based testing utilities designed for WordPress environments:

- **WordPress fixtures** - Auth, database seeding, role management
- **Kernel integration** - Resource state, cache validation, event capture
- **Flexible imports** - Scoped, namespaced, or flat import patterns
- **Real environment testing** - Validated via showcase app E2E tests

**Note**: This package is **optional** - only needed if you want to write E2E tests for your WP Kernel project.

## Quick Start

```bash
npm install -D @geekist/wp-kernel-e2e-utils playwright
```

```typescript
import { test } from '@playwright/test';
import { auth, db, store } from '@geekist/wp-kernel-e2e-utils';

test('admin can create posts', async ({ page }) => {
	// WordPress auth
	await auth.login(page, 'admin');

	// Database setup
	await db.seedUsers({ role: 'editor', count: 3 });

	// Test admin functionality
	await page.goto('/wp-admin/post-new.php');
	// ... test interactions

	// Validate kernel state
	await store.waitForResource(page, 'post', { status: 'published' });
});
```

## Key Features

### Import Patterns

```typescript
// Scoped imports (recommended)
import { login } from '@geekist/wp-kernel-e2e-utils/auth';
import { seedPosts } from '@geekist/wp-kernel-e2e-utils/db';

// Namespace imports
import { auth, db, store } from '@geekist/wp-kernel-e2e-utils';

// Flat imports
import {
	login,
	seedPosts,
	waitForResource,
} from '@geekist/wp-kernel-e2e-utils';
```

### WordPress Integration

```typescript
// User management and auth
await auth.login(page, 'admin');
await auth.switchUser(page, 'editor');

// Database operations
await db.seedPosts({ count: 10, status: 'published' });
await db.cleanup(['posts', 'users']);

// REST API testing
await rest.validateEndpoint(page, '/wp/v2/posts');
```

### Kernel Testing

```typescript
// Resource state validation
await store.waitForResource(page, 'user');
await store.expectCacheKey(page, ['user', 'list']);

// Event capture
await events.captureEmitted(page, 'wpk.resource.user.created');
```

## Validation Strategy

**Real-world validation** - This package is tested through actual usage in the showcase app's E2E tests rather than isolated unit tests, ensuring utilities work correctly in live WordPress environments.

## Documentation

- **[E2E Testing Guide](https://thegeekist.github.io/wp-kernel/guide/testing)** - Testing patterns and best practices
- **[API Reference](https://thegeekist.github.io/wp-kernel/api/e2e-utils)** - Complete utility documentation

## Requirements

- **WordPress**: 6.8+
- **Playwright**: 1.45+
- **@geekist/wp-kernel**: For kernel-aware fixtures

## Contributing

See the [main repository](https://github.com/theGeekist/wp-kernel) for contribution guidelines.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)

### Sprint 2 Goals

Sprint 2 will transform this setup by:

1. **Creating kernel fixtures** via a single factory pattern
2. **Extending WordPress test fixture** to include `kernel` helper
3. **Migrating showcase tests** to use new utilities (confirmed in Task 3 acceptance criteria)
4. **Eliminating manual helpers** in favor of WordPress + kernel fixtures

---

## Installation

```bash
pnpm add -D @geekist/wp-kernel-e2e-utils
```

## Peer Dependencies

- `@geekist/wp-kernel` (core framework)
- `@playwright/test` (Playwright test runner)
- `@wordpress/e2e-test-utils-playwright` (WordPress E2E helpers)

---

## Usage (Post-Sprint 2)

After Sprint 2 implementation, tests will use the single factory pattern:

### Basic Test with Kernel Fixtures

```typescript
import { test, expect } from '@geekist/wp-kernel-e2e-utils';

test('should load jobs', async ({ page, admin, kernel }) => {
	// ✓ Use WordPress fixture for login
	await admin.visitAdminPage('admin.php', 'page=wpk-jobs');

	// ✓ Use kernel resource helper for seeding
	const job = kernel.resource({
		name: 'job',
		routes: {
			create: { path: '/wpk/v1/jobs', method: 'POST' },
			remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
		},
	});
	await job.seed({ title: 'Software Engineer', salary: 100000 });

	// ✓ Use kernel store helper to wait for data
	const jobStore = kernel.store('wpk/job');
	await jobStore.wait((state) => state.getList());

	// ✓ Use kernel events helper to capture emissions
	const recorder = await kernel.events({ pattern: /^wpk\.job\./ });

	// Assertions
	await expect(page.getByText('Software Engineer')).toBeVisible();

	const events = recorder.list();
	expect(events).toContainEqual(
		expect.objectContaining({ type: 'acme-plugin.job.created' })
	);
});
```

---

## Single Factory Pattern

The `kernel` fixture is created by a single factory that extends WordPress fixtures:

```typescript
import { test as base } from '@wordpress/e2e-test-utils-playwright';
import { createKernelUtils } from '@geekist/wp-kernel-e2e-utils';

export const test = base.extend({
	kernel: async ({ page, requestUtils, admin, editor, pageUtils }, use) => {
		const kernel = createKernelUtils({
			page,
			requestUtils,
			admin,
			editor,
			pageUtils,
		});
		await use(kernel);
	},
});

export { expect } from '@playwright/test';
```

All WordPress fixtures are always available alongside the kernel fixture.

---

## Available Helpers

### Resource Utilities

Create typed resource helpers for seeding and cleanup:

```typescript
const job = kernel.resource({
	name: 'job',
	routes: {
		create: { path: '/wpk/v1/jobs', method: 'POST' },
		remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
	},
});

// Methods
await job.seed({ title: 'Engineer' }); // Create via REST
await job.seedMany([{ title: 'Dev' }, { title: 'Designer' }]); // Bulk create
await job.remove(id); // Delete one
await job.deleteAll(); // Cleanup all test data
```

### Store Utilities

Wait for store resolvers and inspect state:

```typescript
const jobStore = kernel.store('wpk/job');

// Methods
await jobStore.wait((state) => state.getList()); // Wait for resolver to finish
await jobStore.invalidate(); // Trigger refetch
const data = await jobStore.getState(); // Get current state
```

### Event Utilities

Capture and assert on kernel events:

```typescript
const recorder = await kernel.events({
	pattern: /^wpk\.job\./, // Optional filter
});

// Methods
recorder.list(); // All captured events
recorder.find('acme-plugin.job.created'); // First matching event
recorder.findAll('acme-plugin.job.updated'); // All matching events
recorder.clear(); // Reset recorded events
recorder.stop(); // Stop recording
```

---

## WordPress Fixtures (Always Available)

All `@wordpress/e2e-test-utils-playwright` fixtures are exposed:

```typescript
test('example', async ({
	page,
	admin,
	editor,
	requestUtils,
	pageUtils,
	kernel,
}) => {
	// WordPress fixtures
	await admin.visitAdminPage('index.php');
	await admin.createNewPost();
	await editor.insertBlock({ name: 'core/paragraph' });

	// REST API
	const posts = await requestUtils.rest({ path: '/wp/v2/posts' });

	// Kernel fixtures
	const job = kernel.resource(jobConfig);
	await job.seed({ title: 'Test Job' });

	const jobStore = kernel.store('wpk/job');
	await jobStore.wait((s) => s.getList());
});
```

---

## Migration Path

### Before (Current - vanilla Playwright)

```typescript
import { test, expect } from '@playwright/test';

// Manual helper (duplicated)
async function loginToWordPress(page: Page) {
	await page.goto('/wp-login.php');
	await page.fill('input[name="log"]', 'admin');
	await page.fill('input[name="pwd"]', 'password');
	await page.click('input[name="wp-submit"]');
	await page.waitForURL('**/wp-admin/**');
}

test.beforeEach(async ({ page }) => {
	await loginToWordPress(page);
});

test('jobs page works', async ({ page }) => {
	await page.goto('/wp-admin/admin.php?page=wpk-jobs');
	await page.waitForSelector('.wpk-jobs-list');
	const jobCards = page.locator('.wpk-job-card');
	await expect(jobCards).toHaveCount(5);
});
```

### After (Post-Sprint 2 - WordPress + kernel fixtures)

```typescript
import { test, expect } from '@geekist/wp-kernel-e2e-utils';

test('jobs page works', async ({ admin, page, kernel }) => {
	// ✓ Use WordPress fixture (no manual login)
	await admin.visitAdminPage('admin.php', 'page=wpk-jobs');

	// ✓ Use kernel store helper to wait for data (instead of DOM selector)
	const jobStore = kernel.store('wpk/job');
	await jobStore.wait((state) => state.getList());

	// ✓ Assert on store state instead of DOM count
	const data = await jobStore.getState();
	expect(data.list).toHaveLength(5);

	// Can still assert on DOM if needed
	await expect(page.locator('.wpk-jobs-list')).toBeVisible();
});
```

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)

## License

EUPL-1.2
