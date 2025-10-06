# Testing Guide

Comprehensive guide to writing and running tests in WP Kernel.

## Testing Philosophy

- **Test behavior, not implementation** - Focus on what the code does, not how
- **AAA pattern** - Arrange, Act, Assert
- **Test in isolation** - Mock external dependencies
- **Fast feedback** - Unit tests should be fast, E2E tests comprehensive

## Unit Tests

### Setup

Unit tests use Jest with `@wordpress/jest-preset-default`:

```json
{
	"preset": "@wordpress/jest-preset-default"
}
```

### Writing Unit Tests

#### File Naming

- Test files go in `__tests__/` directories
- Naming: `<module>.test.ts` or `<module>.test.tsx`

#### Basic Structure

```typescript
import { thing } from '../resources/Thing';

describe('Thing Resource', () => {
	beforeEach(() => {
		// Setup before each test
	});

	afterEach(() => {
		// Cleanup after each test
	});

	it('should create a thing', async () => {
		// Arrange
		const data = { title: 'Test Thing' };

		// Act
		const result = await thing.create(data);

		// Assert
		expect(result).toHaveProperty('id');
		expect(result.title).toBe('Test Thing');
	});

	it('should throw ValidationError for invalid data', async () => {
		// Arrange
		const data = { title: '' }; // Invalid: empty title

		// Act & Assert
		await expect(thing.create(data)).rejects.toThrow('ValidationError');
	});
});
```

### Mocking

#### Mock Transport Layer

```typescript
import * as http from '@geekist/wp-kernel/http';

jest.mock('@geekist/wp-kernel/http', () => ({
	fetch: jest.fn(),
}));

describe('CreateThing', () => {
	it('should call REST endpoint', async () => {
		// Mock the POST request
		(http.fetch as jest.Mock).mockResolvedValue({
			data: {
				id: 1,
				title: 'Test',
			},
			status: 200,
			headers: {},
			requestId: 'req_test',
		});

		// Act
		const result = await CreateThing({ data: { title: 'Test' } });

		// Assert
		expect(http.fetch).toHaveBeenCalledWith({
			path: '/wpk/v1/things',
			method: 'POST',
			data: { title: 'Test' },
		});
		expect(result.id).toBe(1);
	});
});
```

#### Mock WordPress Hooks

```typescript
import { addAction, doAction } from '@wordpress/hooks';

jest.mock('@wordpress/hooks');

describe('Event Emission', () => {
	it('should emit event after creation', async () => {
		// Arrange
		const listener = jest.fn();
		(addAction as jest.Mock).mockImplementation(
			(hook, namespace, callback) => {
				if (hook === 'wpk.thing.created') {
					listener.mockImplementation(callback);
				}
			}
		);

		// Act
		await CreateThing({ data: { title: 'Test' } });

		// Assert
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ id: expect.any(Number) })
		);
	});
});
```

### Running Unit Tests

```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm test --watch

# With coverage
pnpm test:coverage

# Specific file
pnpm test packages/kernel/src/__tests__/index.test.ts

# Specific test
pnpm test --testNamePattern="should create a thing"
```

### Coverage Thresholds

Target coverage thresholds:

```json
{
	"coverageThreshold": {
		"global": {
			"branches": 80,
			"functions": 80,
			"lines": 80,
			"statements": 80
		}
	}
}
```

Currently set to 0% during Sprint 0. Will increase as implementation grows.

## E2E Tests

### Setup

E2E tests use Playwright with `@wordpress/e2e-test-utils-playwright`:

```typescript
import { test, expect } from '@wordpress/e2e-test-utils-playwright';
```

### WordPress must be running!

```bash
pnpm wp:start
```

### Writing E2E Tests

#### File Naming

- Test files: `<feature>.spec.ts`
- Location: `packages/e2e-utils/tests/`

#### Basic Structure

```typescript
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

test.describe('Thing Management', () => {
	test.beforeEach(async ({ admin }) => {
		await admin.visitAdminPage('admin.php', 'page=things');
	});

	test('should create a new thing', async ({ page, admin }) => {
		// Arrange
		await page.click('button:has-text("Add New")');
		await page.fill('input[name="title"]', 'Test Thing');

		// Act
		await page.click('button:has-text("Create")');

		// Assert
		await expect(page.locator('.notice-success')).toBeVisible();
		await expect(page.locator('text=Test Thing')).toBeVisible();
	});

	test('should show validation error for empty title', async ({ page }) => {
		// Arrange
		await page.click('button:has-text("Add New")');

		// Act
		await page.click('button:has-text("Create")');

		// Assert
		await expect(page.locator('.notice-error')).toBeVisible();
		await expect(page.locator('text=Title is required')).toBeVisible();
	});
});
```

### E2E Fixtures

Use seed data for consistent tests:

```bash
# Seed test data
pnpm wp:seed

# Reset and re-seed
pnpm wp:seed:reset
```

Seed data includes:

- **Users**: admin, editor, author, contributor, subscriber
- **Applications**: pending, approved, rejected samples
- **Jobs**: completed, in-progress, failed samples

### Page Object Pattern

For complex pages, use the page object pattern:

```typescript
// pages/ThingPage.ts
export class ThingPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/wp-admin/admin.php?page=things');
	}

	async createThing(title: string, description: string) {
		await this.page.click('button:has-text("Add New")');
		await this.page.fill('input[name="title"]', title);
		await this.page.fill('textarea[name="description"]', description);
		await this.page.click('button:has-text("Create")');
	}

	async expectThingVisible(title: string) {
		await expect(this.page.locator(`text=${title}`)).toBeVisible();
	}
}

// In test
test('should create thing', async ({ page, admin }) => {
	const thingPage = new ThingPage(page);
	await thingPage.goto();
	await thingPage.createThing('Test', 'Description');
	await thingPage.expectThingVisible('Test');
});
```

### Running E2E Tests

```bash
# Run all E2E tests (all browsers)
pnpm e2e

# Chromium only (faster)
pnpm e2e --project=chromium

# Firefox only
pnpm e2e --project=firefox

# WebKit only
pnpm e2e --project=webkit

# Headed mode (see browser)
pnpm e2e --headed

# Debug mode (step through)
pnpm e2e --debug

# Specific test
pnpm e2e packages/e2e-utils/tests/thing.spec.ts

# Specific test pattern
pnpm e2e --grep "should create"
```

### E2E Best Practices

#### 1. Use Semantic Selectors

```typescript
// ✓ GOOD - semantic, stable
await page.click('button[aria-label="Add new thing"]');
await page.click('text=Submit');

// ✗ BAD - brittle, implementation-dependent
await page.click('.wp-button-1234');
await page.click('#submit-btn');
```

#### 2. Wait for Network

```typescript
// Wait for API call to complete
await Promise.all([
	page.waitForResponse((res) => res.url().includes('/wpk/v1/things')),
	page.click('button:has-text("Create")'),
]);
```

#### 3. Check for JS Errors

```typescript
test('should not have console errors', async ({ page }) => {
	const errors: string[] = [];

	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			errors.push(msg.text());
		}
	});

	await page.goto('/');

	expect(errors).toHaveLength(0);
});
```

#### 4. Clean Up Test Data

```typescript
test.afterEach(async ({ page }) => {
	// Delete created test data
	await page.evaluate(() => {
		// Call cleanup function
	});
});
```

## Testing Actions

Actions are the core orchestration layer. Test them thoroughly:

```typescript
import { CreateThing } from '@/app/actions/Thing/Create';
import { thing } from '@/app/resources/Thing';
import { events } from '@geekist/wp-kernel/events';

jest.mock('@/app/resources/Thing');
jest.mock('@wordpress/hooks');

describe('CreateThing Action', () => {
	it('should create thing via resource', async () => {
		// Mock
		(thing.create as jest.Mock).mockResolvedValue({
			id: 1,
			title: 'Test',
		});

		// Act
		const result = await CreateThing({ data: { title: 'Test' } });

		// Assert
		expect(thing.create).toHaveBeenCalledWith({ title: 'Test' });
		expect(result).toEqual({ id: 1, title: 'Test' });
	});

	it('should emit event after creation', async () => {
		// Mock
		const emitSpy = jest.spyOn(CreateThing, 'emit');
		(thing.create as jest.Mock).mockResolvedValue({ id: 1 });

		// Act
		await CreateThing({ data: { title: 'Test' } });

		// Assert
		expect(emitSpy).toHaveBeenCalledWith(
			events.thing.created,
			expect.objectContaining({ id: 1 })
		);
	});

	it('should invalidate cache after creation', async () => {
		// Mock
		const invalidateSpy = jest.spyOn(global, 'invalidate');
		(thing.create as jest.Mock).mockResolvedValue({ id: 1 });

		// Act
		await CreateThing({ data: { title: 'Test' } });

		// Assert
		expect(invalidateSpy).toHaveBeenCalledWith(['thing', 'list']);
	});
});
```

## Testing Resources

Resources integrate with REST and store. Mock the HTTP layer:

```typescript
import { thing } from '@/app/resources/Thing';
import * as http from '@geekist/wp-kernel/http';

jest.mock('@geekist/wp-kernel/http', () => ({
	fetch: jest.fn(),
}));

describe('Thing Resource', () => {
	it('should call list endpoint', async () => {
		// Mock
		(http.fetch as jest.Mock).mockResolvedValue({
			data: {
				items: [
					{ id: 1, title: 'Thing 1' },
					{ id: 2, title: 'Thing 2' },
				],
			},
			status: 200,
			headers: {},
			requestId: 'req_list',
		});

		// Act
		const result = await thing.fetchList();

		// Assert
		expect(http.fetch).toHaveBeenCalledWith({
			path: '/wpk/v1/things',
			method: 'GET',
			query: undefined,
		});
		expect(result.items).toHaveLength(2);
	});

	it('should call create endpoint', async () => {
		// Mock
		(http.fetch as jest.Mock).mockResolvedValue({
			data: { id: 1, title: 'New Thing' },
			status: 201,
			headers: {},
			requestId: 'req_create',
		});

		// Act
		const result = await thing.create({ title: 'New Thing' });

		// Assert
		expect(http.fetch).toHaveBeenCalledWith({
			path: '/wpk/v1/things',
			method: 'POST',
			data: { title: 'New Thing' },
		});
		expect(result.id).toBe(1);
	});
});
```

## Testing Error Handling

Test error scenarios:

```typescript
import * as http from '@geekist/wp-kernel/http';
import { KernelError } from '@geekist/wp-kernel/error';

describe('Error Handling', () => {
	it('should throw ValidationError for invalid data', async () => {
		// Arrange
		(http.fetch as jest.Mock).mockRejectedValue(
			new KernelError('ValidationError', {
				field: 'title',
				message: 'Title is required',
			})
		);

		// Act & Assert
		await expect(CreateThing({ data: { title: '' } })).rejects.toThrow(
			'ValidationError'
		);
	});

	it('should throw PolicyDenied for unauthorized', async () => {
		// Arrange
		(http.fetch as jest.Mock).mockRejectedValue(
			new KernelError('PolicyDenied', {
				policyKey: 'things.create',
			})
		);

		// Act & Assert
		await expect(CreateThing({ data: { title: 'Test' } })).rejects.toThrow(
			'PolicyDenied'
		);
	});
});
```

## Debugging Tests

### Debug Unit Tests

```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Or use VS Code debugger (add breakpoint, press F5)
```

### Debug E2E Tests

```bash
# Headed mode (see browser)
pnpm e2e --headed

# Debug mode (step through with Playwright Inspector)
pnpm e2e --debug

# Trace mode (record trace for debugging)
pnpm e2e --trace on

# View trace
pnpm exec playwright show-trace trace.zip
```

### Console Logs

```typescript
// In unit tests
console.log('Debug:', value);

// In E2E tests
test('debug test', async ({ page }) => {
	page.on('console', (msg) => console.log('Browser:', msg.text()));
	// ...
});
```

## CI Testing

Tests run automatically in GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Run Unit Tests
  run: pnpm test:coverage

- name: Run E2E Tests
  run: pnpm e2e
```

### Run CI Locally

```bash
export CI=true
pnpm lint && pnpm build && pnpm test && pnpm e2e
```

## Test Fixtures

### Seed Data

```bash
# Seed all fixtures
pnpm wp:seed

# Reset and re-seed
pnpm wp:seed:reset
```

### Custom Fixtures

Create custom fixtures for tests:

```typescript
// fixtures/thing.ts
export const mockThing = {
	id: 1,
	title: 'Test Thing',
	description: 'Test description',
	created_at: '2025-01-01T00:00:00Z',
};

export const mockThingList = [mockThing, { ...mockThing, id: 2 }];

// In test
import { mockThing } from '../fixtures/thing';

test('should display thing', async ({ page }) => {
	// Mock API response
	await page.route('/wpk/v1/things/1', (route) =>
		route.fulfill({ json: mockThing })
	);

	// Test...
});
```

## Next Steps

- [Pull Requests](/contributing/pull-requests) - Submit your changes
- [Coding Standards](/contributing/standards) - Code style guide
- [Runbook](/contributing/runbook) - Common development tasks
