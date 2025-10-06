# E2E Testing Guide

End-to-end testing guide for WP Kernel with `@geekist/wp-kernel-e2e-utils`.

## Overview

E2E tests validate complete user workflows in a real WordPress environment using Playwright. WP Kernel provides specialized utilities to make testing kernel-aware applications fast and reliable.

### When to Use E2E Tests

- ✓ **Full user workflows** - Login → Create → View → Delete
- ✓ **Integration points** - Resources + Store + UI interactions
- ✓ **Event flow validation** - Ensure events emit correctly
- ✓ **Cross-browser behavior** - Chrome, Firefox, Safari
- ✓ **Admin + Frontend** - Test both surfaces

### When to Use Unit Tests Instead

- ✗ Individual functions/utilities
- ✗ Business logic in isolation
- ✗ Error handling paths
- ✗ Fast feedback loops

See [Testing Guide](/contributing/testing) for unit test patterns.

---

## Quick Start

### Installation

```bash
npm install -D @geekist/wp-kernel-e2e-utils
# or
pnpm add -D @geekist/wp-kernel-e2e-utils
```

### Basic Test

```typescript
import { test, expect } from '@geekist/wp-kernel-e2e-utils';

test.describe('Jobs Admin', () => {
	test.beforeEach(async ({ kernel, page }) => {
		// Login before each test
		await kernel.auth.login(page);
	});

	test('displays seeded jobs', async ({ kernel, page }) => {
		// Seed test data
		await kernel.rest.seed('job', { title: 'Senior Engineer' });

		// Navigate to admin page
		await page.goto('/wp-admin/admin.php?page=wpk-jobs');

		// Assert UI state
		await expect(page.locator('text=Senior Engineer')).toBeVisible();
	});
});
```

---

## The Kernel Fixture

WP Kernel E2E utilities are available via the `kernel` fixture:

```typescript
test('example', async ({ kernel, page }) => {
	// kernel provides all E2E utilities
	await kernel.auth.login(page);
	await kernel.rest.seed('thing', { title: 'Test' });
	await kernel.store.wait(page, 'wpk/thing', (s) => s.getById(1));
});
```

### Why a Fixture?

- **Automatic setup/teardown** - Utilities initialize per test
- **Type safety** - Full TypeScript support
- **WordPress integration** - Access to `requestUtils` for REST
- **Consistent API** - Same patterns across all tests

---

## Import Patterns

The package supports three import styles:

### 1. Namespace Import (Recommended for Tests)

```typescript
import { test, expect } from '@geekist/wp-kernel-e2e-utils';

test('example', async ({ kernel, page }) => {
	await kernel.auth.login(page);
	await kernel.rest.seed('job', data);
	await kernel.store.wait(page, 'wpk/job', selector);
	await kernel.events.capture(page);
	await kernel.db.restore('clean');
});
```

### 2. Scoped Import (Recommended for Utilities)

```typescript
import { login } from '@geekist/wp-kernel-e2e-utils/auth';
import { seed, seedMany } from '@geekist/wp-kernel-e2e-utils/rest';
import { wait } from '@geekist/wp-kernel-e2e-utils/store';

export async function setupJobTest(page, requestUtils) {
	await seed(requestUtils, 'job', { title: 'Test Job' });
	await wait(page, 'wpk/job', (s) => s.getList());
}
```

### 3. Flat Alias Import (Convenience)

```typescript
import {
	login,
	seed,
	waitForSelector,
	restoreDb,
} from '@geekist/wp-kernel-e2e-utils';
```

---

## API Reference

### Auth Utilities

#### `kernel.auth.login(page, options?)`

Authenticate a user in WordPress.

```typescript
// Login as admin (default)
await kernel.auth.login(page);

// Login as specific user
await kernel.auth.login(page, {
	username: 'editor',
	password: 'password',
});
```

**Parameters:**

- `page` - Playwright Page instance
- `options.username` - Username (default: `'admin'`)
- `options.password` - Password (default: `'password'`)

**Returns:** `Promise<void>`

#### `kernel.auth.logout(page)`

Log out the current user.

```typescript
await kernel.auth.logout(page);
```

---

### REST Utilities

#### `kernel.rest.seed(requestUtils, resource, data)`

Create a single resource via REST.

```typescript
const job = await kernel.rest.seed(requestUtils, 'job', {
	title: 'Senior Engineer',
	department: 'Engineering',
	salary_min: 100000,
});

console.log(job.id); // Created resource ID
```

**Parameters:**

- `requestUtils` - WordPress RequestUtils instance
- `resource` - Resource name (matches kernel resource definition)
- `data` - Resource data object

**Returns:** `Promise<T>` - Created resource with ID

#### `kernel.rest.seedMany(requestUtils, resource, rows)`

Create multiple resources via REST.

```typescript
const jobs = await kernel.rest.seedMany(requestUtils, 'job', [
	{ title: 'Engineer' },
	{ title: 'Designer' },
	{ title: 'Manager' },
]);

console.log(jobs.length); // 3
```

**Parameters:**

- `requestUtils` - WordPress RequestUtils instance
- `resource` - Resource name
- `rows` - Array of resource data objects

**Returns:** `Promise<T[]>` - Array of created resources

#### `kernel.rest.request(requestUtils, method, path, init?)`

Make a raw REST request.

```typescript
const response = await kernel.rest.request(
	requestUtils,
	'POST',
	'/wpk/v1/things/123/action',
	{ body: { param: 'value' } }
);
```

---

### Store Utilities

#### `kernel.store.wait(page, storeName, selector, options?)`

Wait for store state to match a condition.

```typescript
// Wait for job to exist in store
const job = await kernel.store.wait(
	page,
	'wpk/job',
	(selectors) => selectors.getById(123),
	{ timeoutMs: 5000 }
);

// Wait for list to load
const jobs = await kernel.store.wait(page, 'wpk/job', (selectors) =>
	selectors.getList()
);
```

**Parameters:**

- `page` - Playwright Page instance
- `storeName` - WordPress data store key (e.g., `'wpk/job'`)
- `selector` - Function that receives store selectors and returns desired value
- `options.timeoutMs` - Timeout in milliseconds (default: `5000`)
- `options.intervalMs` - Polling interval (default: `100`)

**Returns:** `Promise<T>` - Selected store value

#### `kernel.store.invalidate(page, keys)`

Invalidate cache keys.

```typescript
await kernel.store.invalidate(page, ['job', 'list']);
await kernel.store.invalidate(page, ['job', 'get', 123]);
```

---

### Event Utilities

#### `kernel.events.capture(page, options?)`

Capture events emitted during test execution.

```typescript
const recorder = await kernel.events.capture(page, {
	pattern: /^wpk\./, // Only capture kernel events
	includePayload: true,
});

// Perform action that emits events
await kernel.rest.seed(requestUtils, 'job', data);

// Check events
const created = recorder.find('wpk.job.created');
expect(created).toBeTruthy();
expect(created?.payload).toMatchObject({ id: expect.any(Number) });

// Cleanup
await recorder.stop();
```

**Parameters:**

- `page` - Playwright Page instance
- `options.pattern` - RegExp to filter event names (default: captures all)
- `options.includePayload` - Whether to capture event payloads (default: `true`)

**Returns:** `Promise<EventRecorder>`

**EventRecorder API:**

```typescript
interface EventRecorder {
	list(): EventRecord[];
	find(name: string): EventRecord | undefined;
	clear(): void;
	stop(): Promise<void>;
}
```

---

### Database Utilities

#### `kernel.db.restore(snapshot?)`

Restore database to a clean state or named snapshot.

```typescript
// Restore to clean state
await kernel.db.restore('clean');

// Restore to named snapshot
await kernel.db.restore('after-seed');
```

**Best Practice:** Use in `beforeEach` to ensure test isolation:

```typescript
test.beforeEach(async ({ kernel }) => {
	await kernel.db.restore('clean');
});
```

#### `kernel.db.snapshot(name)`

Create a named database snapshot.

```typescript
// Create baseline
await kernel.rest.seedMany(requestUtils, 'job', fixtures);
await kernel.db.snapshot('jobs-seeded');

// Later tests can restore to this point
await kernel.db.restore('jobs-seeded');
```

---

### Project Utilities

#### `kernel.project.setup(options?)`

Setup WordPress environment for testing.

```typescript
const env = await kernel.project.setup({
	wpVersion: '6.8',
	site: 'tests',
	headless: true,
});

console.log(env.baseUrl); // http://localhost:8889
console.log(env.adminUrl); // http://localhost:8889/wp-admin
console.log(env.apiRoot); // http://localhost:8889/wp-json
```

**Parameters:**

- `options.wpVersion` - WordPress version (default: latest)
- `options.site` - `'dev'` (port 8888) or `'tests'` (port 8889)
- `options.headless` - Run headless (default: `true` in CI)

**Returns:** `Promise<{ baseUrl, adminUrl, apiRoot }>`

---

## Common Patterns

### Seeding Test Data

```typescript
test.describe('Job Applications', () => {
	let job;

	test.beforeEach(async ({ kernel }) => {
		// Seed job before each test
		job = await kernel.rest.seed(requestUtils, 'job', {
			title: 'Test Job',
			status: 'publish',
		});
	});

	test('should submit application', async ({ page, kernel }) => {
		await page.goto(`/jobs/${job.id}`);
		// ... test application flow
	});
});
```

### Waiting for Store Updates

```typescript
test('should update job list after create', async ({ page, kernel }) => {
	// Initial state
	await page.goto('/wp-admin/admin.php?page=wpk-jobs');

	// Trigger create
	await page.click('[data-testid="new-job-button"]');
	// ... fill form ...
	await page.click('[data-testid="save-button"]');

	// Wait for store to update
	const jobs = await kernel.store.wait(page, 'wpk/job', (s) => s.getList(), {
		timeoutMs: 3000,
	});

	expect(jobs.length).toBeGreaterThan(0);
});
```

### Event Flow Validation

```typescript
test('should emit events on job creation', async ({ page, kernel }) => {
	const recorder = await kernel.events.capture(page, {
		pattern: /^wpk\.job\./,
	});

	// Trigger action
	await kernel.rest.seed(requestUtils, 'job', { title: 'Test' });

	// Validate events
	const events = recorder.list();
	expect(events.map((e) => e.name)).toEqual([
		'wpk.resource.request',
		'wpk.resource.response',
		'wpk.job.created', // Emitted by Action in Sprint 4
		'wpk.cache.invalidated',
	]);

	await recorder.stop();
});
```

### Database Isolation

```typescript
test.describe('Stateful Tests', () => {
	test.beforeAll(async ({ kernel }) => {
		// Setup baseline once
		await kernel.db.restore('clean');
		await kernel.rest.seedMany(requestUtils, 'job', baselineJobs);
		await kernel.db.snapshot('baseline');
	});

	test.beforeEach(async ({ kernel }) => {
		// Restore to baseline before each test
		await kernel.db.restore('baseline');
	});

	test('test 1', async ({ page }) => {
		// Modify data...
	});

	test('test 2', async ({ page }) => {
		// Starts from baseline, not test 1's state
	});
});
```

---

## Test Organization

### Directory Structure

```
app/showcase/
  tests/
    e2e/              # Domain E2E tests
      jobs/
        list.spec.ts
        detail.spec.ts
        apply.spec.ts
      applications/
        pipeline.spec.ts
      fixtures/
        jobs.ts
        users.ts

packages/e2e-utils/
  tests/              # Utility unit tests
    auth/
      login.spec.ts
    rest/
      seed.spec.ts
```

### Utility Tests vs Domain Tests

**Utility Tests** (`packages/e2e-utils/tests/*`)

- Test the utility functions themselves
- Validate kernel integration
- No domain logic

**Domain Tests** (`app/showcase/tests/e2e/*`)

- Test product features
- Use utilities as helpers
- Domain-specific assertions

---

## Debugging

### Enable Headed Mode

```bash
# Run with browser UI
pnpm e2e:headed

# Run with Playwright UI
pnpm e2e:ui
```

### Slow Down Execution

```typescript
test.use({ slowMo: 1000 }); // 1 second between actions
```

### Screenshot on Failure

```typescript
test.afterEach(async ({ page }, testInfo) => {
	if (testInfo.status !== 'passed') {
		await page.screenshot({
			path: `test-results/${testInfo.title}.png`,
		});
	}
});
```

### Console Logs

```typescript
test('debug', async ({ page }) => {
	page.on('console', (msg) => console.log('Browser:', msg.text()));
	// ... test code
});
```

### Pause Execution

```typescript
await page.pause(); // Opens Playwright Inspector
```

---

## Configuration

### Playwright Config

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	use: {
		baseURL: 'http://localhost:8889',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { channel: 'chromium' } },
		{ name: 'firefox', use: { browserName: 'firefox' } },
		{ name: 'webkit', use: { browserName: 'webkit' } },
	],
});
```

### WordPress Environment

Tests run against wp-env (configured in `.wp-env.json`):

```json
{
	"core": "WordPress/WordPress#6.8",
	"plugins": ["./app/showcase"],
	"port": 8888,
	"testsPort": 8889
}
```

**Dev site:** http://localhost:8888 (manual testing)  
**Tests site:** http://localhost:8889 (automated tests)

---

## CI Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
    e2e:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: pnpm/action-setup@v2
            - uses: actions/setup-node@v4
              with:
                  node-version: '22'
                  cache: 'pnpm'

            - run: pnpm install
            - run: pnpm build

            # Start WordPress
            - run: pnpm wp:start
            - run: pnpm wp:seed

            # Install Playwright browsers
            - run: npx playwright install --with-deps chromium

            # Run E2E tests
            - run: pnpm e2e

            # Upload reports on failure
            - uses: actions/upload-artifact@v4
              if: failure()
              with:
                  name: playwright-report
                  path: playwright-report/
```

---

## Best Practices

### ✓ DO

- **Use fixtures** - Leverage the `kernel` fixture for all utilities
- **Seed data** - Create test data via REST, not database manipulation
- **Wait for state** - Use `kernel.store.wait()` instead of arbitrary delays
- **Test user flows** - Focus on complete workflows, not implementation
- **Restore database** - Use `kernel.db.restore()` for test isolation
- **Capture events** - Validate event emission for critical actions

### ✗ DON'T

- **Direct database access** - Use REST utilities instead
- **Hardcoded waits** - Use `waitForSelector` or store waiting
- **Test internals** - Focus on observable behavior
- **Share state** - Each test should be independent
- **Skip CI** - All E2E tests must pass for merge

---

## Troubleshooting

### Test Timeouts

```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page, kernel }) => {
	test.setTimeout(30000); // 30 seconds

	await kernel.rest.seedMany(requestUtils, 'job', largeDataset);
});
```

### Store Not Ready

```typescript
// Wait for store to initialize before accessing
await kernel.store.wait(page, 'wpk/job', (s) => s.getList() !== undefined, {
	timeoutMs: 1000,
});
```

### REST Seeding Fails

```typescript
// Ensure WordPress is running
await kernel.project.setup({ site: 'tests' });

// Check authentication
await kernel.auth.login(page);

// Verify REST endpoint exists
const response = await kernel.rest.request(
	requestUtils,
	'OPTIONS',
	'/wpk/v1/jobs'
);
console.log(response.headers);
```

---

## See Also

- [Testing Guide](/contributing/testing) - Unit testing patterns
- [Showcase Tests](https://github.com/theGeekist/wp-kernel/tree/main/app/showcase/tests/e2e) - Real-world examples
- [Playwright Docs](https://playwright.dev/) - Official Playwright documentation
- [@wordpress/e2e-test-utils-playwright](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-e2e-test-utils-playwright/) - WordPress E2E utilities
