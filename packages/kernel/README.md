# @geekist/wp-kernel

> The core framework for JavaScript-first WordPress development with Rails-like conventions

## Overview

WP Kernel is the foundation package that provides:

- **Actions-first architecture** - All writes flow through `defineAction()` orchestrators
- **Resource definitions** - Single `defineResource()` creates client + store + cache + events
- **Background jobs** - Define and queue async work with `defineJob()`
- **Event system** - Canonical taxonomy with PHP bridge for extensibility

Built on WordPress primitives: Script Modules, Block Bindings, Interactivity API, @wordpress/data.

## Quick Start

```bash
npm install @geekist/wp-kernel
```

```typescript
import { defineResource, defineAction } from '@geekist/wp-kernel';

// 1. Define your resource
const post = defineResource({
  name: 'post',
  routes: {
    list: { path: '/wp/v2/posts', method: 'GET' },
    create: { path: '/wp/v2/posts', method: 'POST' },
  },
});

// 2. Create actions for writes
const CreatePost = defineAction({
  name: 'CreatePost',
  execute: ({ title, content }) => post.create({ title, content }),
});

// 3. Use in components
import { ActionButton } from '@geekist/wp-kernel-ui';
<ActionButton action={CreatePost}>Create Post</ActionButton>
```

## Key Patterns

**📖 [Complete Documentation →](../../docs/packages/kernel.md)**

### Resources

```typescript
// Complete CRUD with events and caching
const user = defineResource<User>({
	name: 'user',
	routes: {
		/* REST endpoints */
	},
	cacheKeys: {
		/* cache strategies */
	},
	events: {
		/* canonical events */
	},
});
```

### Actions

```typescript
// Orchestrate writes with validation and events
const UpdateUser = defineAction({
	name: 'UpdateUser',
	async execute({ id, data }) {
		// validation, optimistic updates, events
		return await user.update(id, data);
	},
});
```

### Jobs

```typescript
// Background processing with retries
const SendWelcomeEmail = defineJob({
	name: 'SendWelcomeEmail',
	async execute({ userId }) {
		// async work, error handling, retries
	},
});
```

## WordPress Integration

- **WordPress 6.8+** - Required (Script Modules API)
- **PHP Bridge** - Automatic REST endpoint and capability integration (Sprint 9)

**📚 [Integration Guide](https://thegeekist.github.io/wp-kernel/guide/getting-started)**

## Import Patterns

Choose what fits your project:

```typescript
// Scoped (recommended)
import { defineResource } from '@geekist/wp-kernel/resource';

// Namespace
import { resource } from '@geekist/wp-kernel';

// Flat
import { defineResource } from '@geekist/wp-kernel';
```

## Documentation

- **[Getting Started](https://thegeekist.github.io/wp-kernel/getting-started/)** - Your first resource and action
- **[API Reference](https://thegeekist.github.io/wp-kernel/api/)** - Complete API documentation
- **[Contracts Reference](https://thegeekist.github.io/wp-kernel/reference/contracts)** - Events, errors, cache keys

## Requirements

- **WordPress**: 6.8+ (Script Modules API required)
- **Node.js**: 20+ LTS (development)
- **TypeScript**: Recommended for type safety

````

### Use in Block Editor

```typescript
import { CreatePost } from './actions/Post/Create';

const PostForm = () => {
	const handleSubmit = async (formData) => {
		await CreatePost({ data: formData });
	};

	return <form onSubmit={handleSubmit}>{/* ... */}</form>;
};
````

## Core Concepts

### Actions-First Rule

UI components **never** call transport directly. Always route writes through Actions.

```typescript
// ✗ WRONG
const handleClick = () => post.create(data);

// ✓ CORRECT
const handleClick = () => CreatePost({ data });
```

### Canonical Events

Use the event registry. Never create ad-hoc event names.

```typescript
import { events } from '@geekist/wp-kernel/events';

// Emit
action.emit(events.thing.created, payload);

// Listen
wp.hooks.addAction('acme-plugin.thing.created', 'my-plugin', callback);
```

### Automatic Caching

Resources manage cache lifecycle automatically.

```typescript
// First call - fetches from server
const posts = await post.fetchList();

// Second call - returns from cache
const samePosts = await post.fetchList();

// After write - cache invalidated
await CreatePost({ data });
// Next fetchList() will refetch
```

## Architecture

```
┌─────────────────────────────────────────┐
│  UI (Blocks + Bindings + Interactivity) │
└────────────────┬────────────────────────┘
                 │ triggers
                 ▼
         ┌───────────────┐
         │    Actions    │ ◄─── Orchestrates writes
         └───────┬───────┘
                 │ calls
                 ▼
         ┌───────────────┐
         │   Resources   │ ◄─── REST client + cache
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────┐
         │  WordPress    │ ◄─── REST API + capabilities
         │   REST API    │
         └───────────────┘
```

## API Reference

### Core Modules

- **`@geekist/wp-kernel/resource`** - defineResource, resource client
- **`@geekist/wp-kernel/actions`** - defineAction, action orchestration
- **`@geekist/wp-kernel/events`** - Event registry, canonical names
- **`@geekist/wp-kernel/policies`** - definePolicy, capability checks
- **`@geekist/wp-kernel/jobs`** - defineJob, background work
- **`@geekist/wp-kernel/bindings`** - Block binding sources
- **`@geekist/wp-kernel/interactivity`** - defineInteraction, front-end actions
- **`@geekist/wp-kernel/error`** - KernelError, error taxonomy

### Error Handling

```typescript
import { KernelError } from '@geekist/wp-kernel/error';

try {
	await CreatePost({ data });
} catch (error) {
	if (error instanceof KernelError) {
		console.log(error.code); // 'PolicyDenied', 'ValidationError', etc.
		console.log(error.context);
	}
}
```

## Contributing

See the [main repository](https://github.com/theGeekist/wp-kernel) for contribution guidelines.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
