# @geekist/wp-kernel-ui

> WordPress-native UI components for modern admin interfaces and blocks

## Overview

React components built on `@wordpress/components` with kernel-aware functionality:

- **ActionButton** - Buttons that trigger actions (never transport directly)
- **DataViews integration** - Modern admin tables for WordPress 6.8+
- **ResourceForm** - Forms with validation and action submission
- **Block utilities** - Binding and Interactivity API helpers

Maintains WordPress design consistency while adding modern patterns.

## Quick Start

```bash
npm install @geekist/wp-kernel-ui @geekist/wp-kernel
```

```typescript
import { ActionButton, useResource } from '@geekist/wp-kernel-ui';
import { CreatePost } from '@/actions/CreatePost';
import { post } from '@/resources/post';

function PostDashboard() {
  const { data: posts, isLoading } = useResource(post);

  return (
    <div>
      <ActionButton action={CreatePost} variant="primary">
        Add New Post
      </ActionButton>

      {isLoading ? <Spinner /> : (
        <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
      )}
    </div>
  );
}
```

## Key Components

**📖 [Complete Documentation →](../../docs/packages/ui.md)**

## React Hooks

- `usePolicy()` – subscribe to policy results with hydration-safe loading states.
- `attachResourceHooks(resource)` – attach `useGet`/`useList` hooks to kernel resources.
- `useAction()` – dispatch kernel actions with React state management

> Importing `@geekist/wp-kernel-ui` once in your app bootstrap automatically registers resource hooks for all defined resources.

**Note**: The `withKernel()` bootstrap function is now available from `@geekist/wp-kernel` (see [Data Integration Guide](/guide/data)).

### Admin Interfaces

```typescript
// DataViews for WordPress 6.8+
import { AdminTable } from '@geekist/wp-kernel-ui';
<AdminTable resource={user} fields={userFields} />

// Fallback for older WordPress
<FallbackTable resource={user} />
```

### Action Integration

```typescript
// Buttons that trigger actions
<ActionButton action={DeleteUser} variant="destructive">
  Delete User
</ActionButton>

// Forms with kernel actions
<ResourceForm
  resource={user}
  createAction={CreateUser}
  updateAction={UpdateUser}
/>
```

## Development Status (Sprint 5 - Bindings & Interactivity)

- ✓ Component architecture designed
- ✓ Core hooks specified
- 🚧 `useAction()` hook implementation (Sprint 5)
- 🚧 `useEvents()` hook implementation (Sprint 5)
- ⏳ Layout components (Sprint 6+)
- ⏳ Block components (Sprint 6+)
- ⏳ Admin CRUD patterns (Sprint 6+)

**Current Status**: Specification complete, implementation starting in Sprint 5

## Actions in React

`useAction` wraps kernel Actions with a React-friendly state machine and the
same middleware pipeline used everywhere else. You get predictable status
transitions, optional dedupe, concurrency controls, and automatic cache
invalidation hooks. Pair it with `withKernel()` from `@geekist/wp-kernel` so the data registry is wired up.

- [Guide – Actions](/guide/actions)
- [API reference – `useAction`](/api/useAction)

## Requirements

- **WordPress**: 6.8+
- **React**: 18+
- **@geekist/wp-kernel**: Latest version

## Documentation

- **[Getting Started](https://thegeekist.github.io/wp-kernel/getting-started/)** - Basic setup
- **[Component Patterns](https://thegeekist.github.io/wp-kernel/guide/ui-patterns)** - Planned component patterns

## Contributing

See the [main repository](https://github.com/theGeekist/wp-kernel) for contribution guidelines.

## License

EUPL-1.2 © [The Geekist](https://github.com/theGeekist)
