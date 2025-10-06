# Actions

Actions are the **conductors of your WordPress application**. They orchestrate every write operation, ensuring consistency, reliability, and extensibility. Think of them as the difference between chaos and harmony in a complex system.

## Why Actions Matter

In traditional WordPress development, you might see code like this scattered throughout themes and plugins:

```php
// Scattered, inconsistent write operations
wp_insert_post($data);
wp_cache_delete('posts_list');
do_action('post_created', $post_id);
wp_schedule_single_event(time() + 300, 'send_notification', [$post_id]);
```

WP Kernel Actions bring **predictability and coordination** to this process:

```typescript
// Coordinated, predictable, testable
await CreatePost({ title: 'Hello World', content: 'First post!' });
// ✓ Resource called
// ✓ Events emitted
// ✓ Cache invalidated
// ✓ Jobs queued
// ✓ All side effects handled
```

## The Actions-First Philosophy

```mermaid
graph LR
    A[UI Event] --> B[Action]
    B --> C[Resource Call]
    B --> D[Event Emission]
    B --> E[Cache Invalidation]
    B --> F[Job Queueing]

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#ffebee
    style F fill:#f1f8e9
```

**The Golden Rule**: UI components **never** call resource write methods directly. Always route through Actions.

This isn't just a suggestion-it's the foundation that makes everything else possible:

- **Consistent side effects**: Every write operation follows the same pattern
- **Automatic event emission**: Other parts of your app can react to changes
- **Smart cache invalidation**: UI stays fresh without manual work
- **Background job coordination**: Long-running tasks don't block the user
- **Audit trails**: Every action is trackable and debuggable

## Anatomy of an Action

Let's build up an action step by step to see how it all fits together:

### 1. Basic Structure

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';

export const CreatePost = defineAction(
	'Post.Create',
	async (ctx, { title, content }) => {
		// Action logic goes here
	}
);
```

### 2. Add Resource Integration

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { post } from '@/resources/post';

export const CreatePost = defineAction(
	'Post.Create',
	async (ctx, { title, content }) => {
		// Call the resource (this does the actual API work)
		const created = await post.create({ title, content });

		return created;
	}
);
```

### 3. Add Event Emission

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { post } from '@/resources/post';

export const CreatePost = defineAction(
	'Post.Create',
	async (ctx, { title, content }) => {
		const created = await post.create({ title, content });

		// Emit canonical domain events
		ctx.emit('post.created', {
			postId: created.id,
			data: created,
		});

		return created;
	}
);
```

### 4. Add Cache Invalidation

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { post } from '@/resources/post';

export const CreatePost = defineAction(
	'Post.Create',
	async (ctx, { title, content }) => {
		const created = await post.create({ title, content });

		ctx.emit('post.created', {
			postId: created.id,
			data: created,
		});

		// Invalidate relevant cache keys
		ctx.invalidate(['post', 'post:list']);

		return created;
	}
);
```

### 5. Add Background Jobs

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { post } from '@/resources/post';

export const CreatePost = defineAction(
	'Post.Create',
	async (ctx, { title, content, notifySubscribers = false }) => {
		const created = await post.create({ title, content });

		ctx.emit('post.created', {
			postId: created.id,
			data: created,
		});

		ctx.invalidate(['post', 'post:list']);

		// Queue background work
		if (notifySubscribers) {
			await ctx.jobs.enqueue('SendPostNotification', {
				postId: created.id,
			});
		}

		return created;
	}
);
```

### 6. Add Error Handling & Validation

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { post } from '@/resources/post';
import { KernelError } from '@geekist/wp-kernel/error';

export const CreatePost = defineAction(
	'Post.Create',
	async (ctx, { title, content, notifySubscribers = false }) => {
		// Validation
		if (!title?.trim()) {
			throw new KernelError('ValidationError', {
				message: 'Post title is required',
				field: 'title',
			});
		}

		// Permission check via policy surface
		ctx.policy.assert('publish_posts');

		try {
			const created = await post.create({ title, content });

			ctx.emit('post.created', {
				postId: created.id,
				data: created,
			});

			ctx.invalidate(['post', 'post:list']);

			if (notifySubscribers) {
				await ctx.jobs.enqueue('SendPostNotification', {
					postId: created.id,
				});
			}

			return created;
		} catch (error) {
			// Error is automatically normalized and emitted via wpk.action.error
			ctx.reporter.error('Post creation failed', { title, error });
			throw error;
		}
	}
);
```

### Reporting and notices

`ctx.reporter` forwards structured telemetry to the reporter module. With `channel: 'all'` the message prints in development
consoles and emits `showcase.reporter.error` via `wp.hooks`. When paired with [`useKernel()` from `@geekist/wp-kernel-ui`](/guide/data) the
`kernelEventsPlugin()` listens for `wpk.action.error` and raises `core/notices` alerts automatically.

## Using Actions in Your UI

Once you have an action, using it is simple and consistent:

### In React Components

```typescript
import { useAction } from '@geekist/wp-kernel-ui';
import { CreatePost } from '@/actions/CreatePost';

function PostForm() {
  const [createPost, { loading, error }] = useAction(CreatePost);

  const handleSubmit = async (formData) => {
    try {
      const newPost = await createPost(formData);
      // Success! UI automatically updates via cache invalidation
    } catch (err) {
      // Error handling
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### In Block Editor

```typescript
import { CreatePost } from '@/actions/CreatePost';

// In your block's save or edit function
const handleCreatePost = async () => {
	await CreatePost({
		title: 'Generated from block',
		content: 'Block-generated content',
	});
};
```

### In Interactivity API

```typescript
import { store } from '@wordpress/interactivity';
import { CreatePost } from '@/actions/CreatePost';

store('my-plugin', {
	actions: {
		async createPost() {
			const { title, content } = context;
			await CreatePost({ title, content });
			// UI automatically updates via store integration
		},
	},
});
```

## Common Patterns

### Optimistic Updates

```typescript
export const UpdatePost = defineAction(
	'Post.Update',
	async (ctx, { id, updates }) => {
		// Note: Optimistic updates would require additional store integration
		// beyond the action itself. This is a conceptual example.

		const updated = await post.update(id, updates);
		ctx.invalidate([`post:${id}`, 'post:list']);
		ctx.emit('post.updated', { postId: id, data: updated });

		return updated;
	}
);
```

### Batch Operations

```typescript
export const BulkDeletePosts = defineAction(
	'Post.BulkDelete',
	async (ctx, { ids }) => {
		const results = [];

		for (const id of ids) {
			try {
				await post.delete(id);
				results.push({ id, success: true });
			} catch (error) {
				results.push({ id, success: false, error: error.message });
			}
		}

		// Invalidate cache once at the end
		ctx.invalidate(['post', 'post:list']);

		ctx.emit('bulk.operation.completed', {
			operation: 'delete',
			results,
		});

		return results;
	}
);
```

### Conditional Side Effects

```typescript
export const PublishPost = defineAction(
	'Post.Publish',
	async (ctx, { id, scheduleNotifications = true }) => {
		const updated = await post.update(id, { status: 'publish' });

		ctx.emit('post.published', {
			postId: updated.id,
			data: updated,
		});

		ctx.invalidate(['post', 'post:list', 'post:featured']);

		// Conditional side effects based on post properties
		if (updated.featured && scheduleNotifications) {
			await ctx.jobs.enqueue('SendFeaturedPostNotification', {
				postId: id,
			});
		}

		if (updated.categories.includes('breaking-news')) {
			await ctx.jobs.enqueue('SendBreakingNewsAlert', { postId: id });
		}

		return updated;
	}
);
```

### Redux Middleware Integration

For complex admin UIs or block editor environments using `@wordpress/data`, actions can be dispatched through Redux stores:

```typescript
import {
	createActionMiddleware,
	invokeAction,
} from '@geekist/wp-kernel/actions';
import { createReduxStore, register } from '@wordpress/data';
import { CreatePost } from '@/actions/CreatePost';

// Setup store with action middleware
const actionMiddleware = createActionMiddleware();

register(
	createReduxStore('my-plugin/posts', {
		reducer: postsReducer,
		actions: {
			// Standard Redux actions...
		},
		selectors: {
			// Standard selectors...
		},
		__experimentalUseMiddleware: () => [actionMiddleware],
	})
);

// In your components
import { useDispatch } from '@wordpress/data';

function PostEditor() {
	const dispatch = useDispatch('my-plugin/posts');

	const handlePublish = async () => {
		// Dispatch kernel action through Redux
		const envelope = invokeAction(CreatePost, {
			title: 'New Post',
			content: '...',
		});

		const result = await dispatch(envelope);
		// Result is returned directly, bypassing reducers
		console.log('Created post:', result);
	};

	return <button onClick={handlePublish}>Publish</button>;
}
```

**How it works**:

1. `createActionMiddleware()` creates Redux middleware that intercepts kernel action envelopes
2. `invokeAction()` wraps your action in a Redux-compatible envelope
3. The middleware executes the action (with all lifecycle events, cache invalidation, etc.)
4. The action's result is returned directly, bypassing Redux reducers
5. Standard Redux actions pass through normally

**When to use Redux middleware**:

- ✓ WordPress block editor environments (Gutenberg)
- ✓ Complex admin UIs with existing Redux state
- ✓ Apps needing Redux DevTools integration for debugging

**When to call actions directly**:

- ✓ Simple components: `await CreatePost(args)`
- ✓ Non-Redux state management (Zustand, MobX, etc.)
- ✓ Server-side contexts or React Server Components

## Why This Pattern Works

### For Developers

- **Predictable**: Every action follows the same pattern
- **Testable**: Mock at the action level for clean unit tests
- **Debuggable**: Clear flow from UI → Action → Side Effects
- **Reusable**: Actions can be called from anywhere (UI, CLI, jobs, etc.)

### For Users

- **Responsive**: Optimistic updates provide immediate feedback
- **Reliable**: Consistent error handling and recovery
- **Informed**: Events keep different parts of the app in sync

### For Teams

- **Consistent**: Everyone follows the same patterns
- **Maintainable**: Side effects are centralized and documented
- **Extensible**: Other developers can hook into events
- **Auditable**: All changes flow through trackable actions

## What's Next?

- **[UI Implementation Patterns](/packages/ui#implementation-patterns)** - Real-world examples with DataViews and admin interfaces
- **[CLI Generators](/packages/cli#generator-patterns)** - Scaffold complete CRUD actions automatically
- **[Events Guide](/guide/events)** - How actions coordinate with the rest of your app
- **[Jobs Guide](/guide/jobs)** - Background processing patterns
- **[Testing Actions](/contributing/testing#testing-actions)** - Unit and integration testing strategies

Actions are where the magic happens in WP Kernel. They're the bridge between user intent and system reality, ensuring every operation is predictable, reliable, and extensible.
