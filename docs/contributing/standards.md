# Coding Standards

Guidelines for writing consistent, maintainable code in WP Kernel.

## TypeScript

### Strict Mode

Always use TypeScript strict mode:

```json
{
	"compilerOptions": {
		"strict": true,
		"noImplicitAny": true,
		"strictNullChecks": true,
		"strictFunctionTypes": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true
	}
}
```

### Type Everything

Never use `any`. Use proper types or `unknown`:

```typescript
// ✗ WRONG
function process(data: any) {}

// ✓ CORRECT
function process(data: Thing) {}
function processUnknown(data: unknown) {
	if (isThing(data)) {
		// Now TypeScript knows data is Thing
	}
}
```

### Interfaces vs Types

Use `interface` for objects, `type` for unions/intersections:

```typescript
// ✓ Objects: use interface
interface Thing {
	id: number;
	title: string;
}

// ✓ Unions: use type
type Status = 'pending' | 'approved' | 'rejected';

// ✓ Intersections: use type
type ThingWithMeta = Thing & { meta: Record<string, unknown> };
```

### Generics

Use descriptive generic names:

```typescript
// ✗ WRONG
function map<T, U>(items: T[], fn: (item: T) => U): U[] {}

// ✓ CORRECT
function mapThings<Thing, Result>(
	things: Thing[],
	transformer: (thing: Thing) => Result
): Result[] {}
```

## Naming Conventions

### Files

- **PascalCase** for components: `ThingForm.tsx`
- **kebab-case** for utilities: `format-date.ts`
- **lowercase** for config: `tsconfig.json`

### Variables & Functions

- **camelCase** for variables and functions: `createThing()`, `thingList`
- **PascalCase** for classes and types: `class ThingService`, `interface Thing`
- **UPPER_CASE** for constants: `const API_BASE_URL = '...'`

### Resources, Actions, Events

```typescript
// Resources: singular, camelCase
export const thing = defineResource({ ... });

// Actions: PascalCase, {Domain}.{Verb}
export const CreateThing = defineAction('Thing.Create', ...);
export const UpdateThing = defineAction('Thing.Update', ...);

// Events: use canonical registry
import { events } from '@geekist/wp-kernel/events';
action.emit(events.thing.created, payload);
```

## File Structure

### Package Structure

```
packages/my-package/
├── src/
│   ├── index.ts              # Public API
│   ├── resource/
│   │   ├── index.ts
│   │   ├── defineResource.ts
│   │   └── types.ts
│   ├── __tests__/
│   │   └── index.test.ts
│   └── types.ts              # Shared types
├── package.json
├── tsconfig.json
└── README.md
```

### Plugin Structure

```
packages/showcase-plugin/
├── app/                      # TypeScript/JavaScript
│   ├── resources/
│   │   └── Thing.ts
│   ├── actions/
│   │   └── Thing/
│   │       ├── Create.ts
│   │       └── Update.ts
│   ├── views/
│   │   ├── blocks/
│   │   └── bindings.ts
│   ├── jobs/
│   │   └── IndexThing.ts
│   ├── __tests__/
│   └── index.ts
├── includes/                 # PHP
│   ├── rest/
│   │   └── class-thing-controller.php
│   └── bootstrap.php
├── contracts/
│   └── thing.schema.json
└── plugin.php
```

## Imports & Exports

### Import Order

1. External packages
2. WordPress packages
3. Internal packages (path aliases)
4. Relative imports

```typescript
// 1. External
import { z } from 'zod';

// 2. WordPress
import { addAction } from '@wordpress/hooks';
import { select } from '@wordpress/data';

// 3. Internal (path aliases)
import { thing } from '@/app/resources/Thing';
import { CreateThing } from '@/app/actions/Thing/Create';

// 4. Relative
import { formatDate } from './utils';
import type { Thing } from './types';
```

### Path Aliases

Use configured path aliases:

```typescript
// ✗ WRONG
import { thing } from '../../../resources/Thing';

// ✓ CORRECT
import { thing } from '@/app/resources/Thing';
```

### Export Patterns

```typescript
// Named exports (preferred)
export const thing = defineResource({ ... });
export function createThing() {}
export type Thing = { ... };

// Default export (only for components)
export default function ThingForm() {}
```

### Barrel Exports

Use `index.ts` for public API:

```typescript
// src/resource/index.ts
export { defineResource } from './defineResource';
export type { Resource, ResourceConfig } from './types';
```

## Code Style

### ESLint

Extends `@wordpress/eslint-plugin`:

```json
{
	"extends": ["plugin:@wordpress/eslint-plugin/recommended"]
}
```

Kernel packages ship custom rules. Notably, `@kernel/no-console-in-kernel` forbids `console.*` calls inside
`packages/kernel/src`-use the reporter module instead.

### Prettier

```json
{
	"semi": true,
	"singleQuote": true,
	"trailingComma": "es5",
	"useTabs": true,
	"tabWidth": 2
}
```

### Line Length

- **Soft limit**: 80 characters
- **Hard limit**: 120 characters

### Indentation

- **Tabs**, not spaces
- **Tab width**: 2 (configured in editor)

### Semicolons

Always use semicolons:

```typescript
// ✓ CORRECT
const thing = getThing();
```

### Quotes

Use single quotes for strings:

```typescript
// ✓ CORRECT
const message = 'Hello world';

// Template literals for interpolation
const greeting = `Hello, ${name}`;
```

### Trailing Commas

Use trailing commas in multi-line:

```typescript
// ✓ CORRECT
const config = {
	name: 'thing',
	routes: {
		list: { path: '/wpk/v1/things', method: 'GET' },
		create: { path: '/wpk/v1/things', method: 'POST' },
	}, // <- trailing comma
};
```

## Comments

### JSDoc for Public API

````typescript
/**
 * Define a typed REST resource with client methods, store, and cache keys.
 *
 * @param config - Resource configuration
 * @returns Resource object with client methods
 *
 * @example
 * ```typescript
 * const thing = defineResource<Thing>({
 *   name: 'thing',
 *   routes: {
 *     list: { path: '/wpk/v1/things', method: 'GET' },
 *   },
 * });
 * ```
 */
export function defineResource<T, Q = unknown>(
	config: ResourceConfig<T, Q>
): Resource<T, Q> {
	// Implementation
}
````

### Inline Comments

Use sparingly, only for non-obvious logic:

```typescript
// ✓ Good: explains why
// Retry with exponential backoff to handle transient network errors
const retry = async () => { ... };

// ✗ Bad: explains what (obvious from code)
// Get the thing by ID
const thing = getThing(id);
```

### TODO Comments

```typescript
// TODO(username): Brief description of what needs to be done
// TODO(jasonnathan): Add pagination support for large lists
```

## Error Handling

### Always Use KernelError

```typescript
import { KernelError } from '@geekist/wp-kernel/error';

// ✓ CORRECT
throw new KernelError('ValidationError', {
	field: 'title',
	message: 'Title is required',
});

// ✗ WRONG
throw new Error('Validation failed');
```

### Catch Specific Errors

```typescript
try {
	await CreateThing({ data });
} catch (e) {
	if (e.code === 'PolicyDenied') {
		// Handle permission error
	} else if (e.code === 'ValidationError') {
		// Handle validation error
	} else {
		// Handle unknown error
		reporter.error(e);
	}
}
```

## The Golden Rules

### 1. Actions-First (Enforced)

```typescript
// ✗ WRONG
const handleSubmit = async () => {
	await thing.create(formData); // Lint error
};

// ✓ CORRECT
const handleSubmit = async () => {
	await CreateThing({ data: formData });
};
```

### 2. Use Canonical Events

```typescript
import { events } from '@geekist/wp-kernel/events';

// ✓ CORRECT
action.emit(events.thing.created, { id });

// ✗ WRONG
action.emit('thing:created', { id }); // Lint error
```

### 3. Explicit Cache Invalidation

```typescript
// ✓ CORRECT
invalidate(['thing', 'list']);
invalidate(['thing', 'get', id]);

// ✗ WRONG
// (no automatic invalidation)
```

### 4. No Deep Imports

```typescript
// ✗ WRONG
import { foo } from '@geekist/wp-kernel/src/internal/foo';

// ✓ CORRECT
import { foo } from '@geekist/wp-kernel';
```

## Testing Patterns

See [Testing Guide](/contributing/testing) for comprehensive testing standards.

Quick reference:

```typescript
// Describe blocks for grouping
describe('CreateThing', () => {
	it('should create a thing', async () => {
		// Arrange
		const data = { title: 'Test' };

		// Act
		const result = await CreateThing({ data });

		// Assert
		expect(result).toHaveProperty('id');
		expect(result.title).toBe('Test');
	});
});
```

## React/JSX

### Component Structure

```typescript
import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import type { Thing } from '@/app/resources/Thing';

interface ThingFormProps {
  onSubmit: (thing: Thing) => void;
  initialValues?: Partial<Thing>;
}

export function ThingForm({ onSubmit, initialValues }: ThingFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ title });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}
```

### Hooks

- Use WordPress hooks when available: `@wordpress/element`, `@wordpress/data`
- Extract complex logic into custom hooks
- Follow [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)

## PHP Conventions

### WordPress Coding Standards

Follow [WordPress PHP Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/).

### Namespaces

```php
<?php
namespace Geekist\WPKernel\REST;

class Thing_Controller extends \WP_REST_Controller {
    // ...
}
```

### Type Hints

```php
<?php
public function create_item( WP_REST_Request $request ): WP_REST_Response {
    $params = $request->get_json_params();
    // ...
    return rest_ensure_response( $thing );
}
```

## Deprecation

### Mark Deprecated Code

```typescript
import deprecated from '@wordpress/deprecated';

/**
 * @deprecated Use `CreateThing` instead
 */
export function createThing(data: Partial<Thing>) {
	deprecated('createThing', {
		since: '1.0.0',
		alternative: 'CreateThing',
	});
	return CreateThing({ data });
}
```

### Emit Deprecation Events

```typescript
import { events } from '@geekist/wp-kernel/events';

deprecated('oldFunction', { ... });
emit(events.deprecated, {
  function: 'oldFunction',
  since: '1.0.0',
  alternative: 'newFunction',
});
```

## Next Steps

- [Testing Guide](/contributing/testing) - Write tests
- [Pull Requests](/contributing/pull-requests) - Submit code
- [Runbook](/contributing/runbook) - Common tasks
