# @geekist/wp-kernel-ui

WordPress-native UI components that seamlessly integrate with WP Kernel patterns and the WordPress component library.

## Overview

This package provides reusable components built on `@wordpress/components` that follow WP Kernel conventions. Instead of reinventing UI patterns, it extends WordPress's design system with kernel-aware functionality.

## Architecture

```mermaid
graph TD
    A[WP Kernel UI] --> B[@wordpress/components]
    A --> C[@geekist/wp-kernel]
    B --> D[WordPress Design System]
    C --> E[Actions & Resources]
```

## Design Philosophy

- **WordPress-First**: Extends existing WordPress components rather than replacing them
- **Action-Driven**: Components trigger actions instead of calling transport directly
- **Data-Aware**: Automatically connects to WP Kernel resources and stores
- **Accessible**: Maintains WordPress accessibility standards

## Key Components

### Layout Components

**ActionButton** - Buttons that trigger WP Kernel actions

```typescript
import { ActionButton } from '@geekist/wp-kernel-ui';
import { CreatePost } from '@/actions/CreatePost';

<ActionButton
  action={CreatePost}
  data={{ title: 'New Post' }}
  variant="primary"
>
  Create Post
</ActionButton>
```

**ResourceList** - Data-driven lists with automatic loading states

```typescript
import { ResourceList } from '@geekist/wp-kernel-ui';
import { post } from '@/resources/post';

<ResourceList
  resource={post}
  query={{ status: 'publish' }}
  renderItem={(item) => <PostCard post={item} />}
/>
```

**ResourceForm** - Forms with validation and action submission

```typescript
import { ResourceForm } from '@geekist/wp-kernel-ui';
import { UpdatePost } from '@/actions/UpdatePost';

<ResourceForm
  action={UpdatePost}
  schema={postSchema}
  initialData={post}
/>
```

### Data Components

**ResourceProvider** - Context provider for resource data

```typescript
import { ResourceProvider } from '@geekist/wp-kernel-ui';

<ResourceProvider resource={post} id={123}>
  <PostEditor />
</ResourceProvider>
```

**useResource** - Hook for accessing resource state

```typescript
import { useResource } from '@geekist/wp-kernel-ui';

function PostEditor() {
	const { data: post, loading, error } = useResource();
	// Post data automatically available from ResourceProvider
}
```

**useAction** - Hook for triggering actions

```typescript
import { useAction } from '@geekist/wp-kernel-ui';
import { UpdatePost } from '@/actions/UpdatePost';

function PostEditor() {
	const [updatePost, { loading, error }] = useAction(UpdatePost);

	const handleSave = () => updatePost({ title: 'Updated Title' });
}
```

### Block Components

**BindingPreview** - Preview block bindings in the editor

```typescript
import { BindingPreview } from '@geekist/wp-kernel-ui';

<BindingPreview
  source="wp-kernel/post"
  attribute="title"
  fallback="Post Title"
/>
```

**InteractivityProvider** - Wrap blocks with interactivity context

```typescript
import { InteractivityProvider } from '@geekist/wp-kernel-ui';

<InteractivityProvider namespace="my-plugin">
  <div data-wp-interactive>
    Interactive content
  </div>
</InteractivityProvider>
```

## Installation

```bash
npm install @geekist/wp-kernel-ui @geekist/wp-kernel
# or
pnpm add @geekist/wp-kernel-ui @geekist/wp-kernel
```

### Peer Dependencies

Required dependencies that must be installed alongside:

- `@geekist/wp-kernel` - Core framework
- `@wordpress/components` - WordPress component library
- `@wordpress/element` - WordPress React wrapper
- `react` (18+) - React library

## Integration Examples

### Admin Dashboard Component

```typescript
import { ResourceList, ActionButton } from '@geekist/wp-kernel-ui';
import { post } from '@/resources/post';
import { CreatePost, DeletePost } from '@/actions/post';

function PostDashboard() {
  return (
    <div>
      <ActionButton action={CreatePost} variant="primary">
        Add New Post
      </ActionButton>

      <ResourceList
        resource={post}
        renderItem={(post) => (
          <div>
            <h3>{post.title}</h3>
            <ActionButton
              action={DeletePost}
              data={{ id: post.id }}
              variant="secondary"
              destructive
            >
              Delete
            </ActionButton>
          </div>
        )}
      />
    </div>
  );
}
```

### Block Editor Integration

```typescript
import { BindingPreview, InteractivityProvider } from '@geekist/wp-kernel-ui';

// In your block's edit function
function Edit({ attributes, setAttributes }) {
  return (
    <InteractivityProvider namespace="my-plugin">
      <div {...useBlockProps()}>
        <BindingPreview
          source="wp-kernel/post"
          attribute="title"
          fallback="Enter post title..."
        />
      </div>
    </InteractivityProvider>
  );
}
```

## Real-World Implementation Patterns

### Admin CRUD Tables - The WordPress Way

Building admin data tables using modern WordPress core primitives with WP Kernel as the data layer.

#### DataViews Implementation (WordPress 6.8+)

```typescript
import { DataViews } from '@wordpress/dataviews';
import { useSelect, useDispatch } from '@wordpress/data';
import { SearchControl, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { useMemo, useState, useCallback } from '@wordpress/element';
import { job } from '@/resources/job';

// Define your data fields
const fields = [
  { id: 'title', label: __('Title', 'wpk'), enableSorting: true },
  { id: 'status', label: __('Status', 'wpk'), enableSorting: true },
  { id: 'department', label: __('Department', 'wpk') },
  { id: 'location', label: __('Location', 'wpk') },
  { id: 'created_at', label: __('Created', 'wpk'), enableSorting: true },
];

const initialView = {
  type: 'table',
  fields: ['title', 'status', 'department', 'location', 'created_at'],
  sort: { field: 'created_at', direction: 'desc' },
  perPage: 20,
};

export function JobsAdminTable() {
  const [query, setQuery] = useState({
    q: '',
    status: '',
    page: 1,
    perPage: 20,
    orderBy: 'created_at',
    order: 'desc' as const,
  });

  // Declarative data access - triggers resolvers automatically
  const { items, total, isLoading, hasFinished } = useSelect(
    (select) => {
      const store = select(job.store);
      const list = store.getList(query);
      return {
        items: list?.items ?? [],
        total: list?.total ?? 0,
        isLoading: store.isResolving('getList', [query]),
        hasFinished: store.hasFinishedResolution('getList', [query]),
      };
    },
    [query]
  );

  const { invalidateResolution } = useDispatch(job.store);

  // Event handlers
  const onSearch = useCallback(
    (value: string) => setQuery((q) => ({ ...q, q: value, page: 1 })),
    []
  );

  const onSort = useCallback(
    (field: string, direction: 'asc' | 'desc') =>
      setQuery((q) => ({ ...q, orderBy: field, order: direction })),
    []
  );

  const onDelete = useCallback(
    async (id: number) => {
      await job.remove(id);
      // Invalidate cache to refresh the list
      invalidateResolution('getList', [query]);
    },
    [query, invalidateResolution]
  );

  return (
    <section className="wpk-admin-screen">
      <header className="wpk-toolbar">
        <SearchControl
          value={query.q}
          onChange={onSearch}
          placeholder={__('Search jobs…', 'wpk')}
        />
        <Button variant="primary" onClick={() => {}}>
          {__('New Job', 'wpk')}
        </Button>
      </header>

      <DataViews
        fields={fields}
        items={items}
        view={initialView}
        isLoading={isLoading && !hasFinished}
        onSort={(sort) => onSort(sort.field, sort.direction)}
        pagination={{
          totalItems: total,
          perPage: query.perPage,
          page: query.page,
        }}
        getItemId={(row) => row.id}
        actions={[
          {
            id: 'edit',
            label: __('Edit', 'wpk'),
            onClick: (row) => {
              /* open edit modal */
            },
          },
          {
            id: 'delete',
            label: __('Delete', 'wpk'),
            isDestructive: true,
            onClick: (row) => onDelete(row.id),
          },
        ]}
        selection={{ type: 'multiple' }}
        onSelectionChange={(ids) => {
          /* handle bulk actions */
        }}
      />
    </section>
  );
}
```

#### WordPress Version Compatibility

```typescript
import { supportsDataViews } from '@geekist/wp-kernel-ui/compat';

function AdminTable() {
  return supportsDataViews() ? (
    <DataViewsTable />
  ) : (
    <FallbackTable />
  );
}

// Feature detection utility
export function supportsDataViews(): boolean {
  return typeof window !== 'undefined' &&
         window.wp?.dataViews !== undefined;
}
```

#### Fallback Table Implementation (WordPress 6.5)

```typescript
import {
  __experimentalVStack as VStack,
  __experimentalHStack as HStack,
  Button,
  SearchControl,
} from '@wordpress/components';

export function FallbackTable({ items, onSort, onDelete }) {
  return (
    <VStack spacing={4}>
      <table className="wp-list-table widefat">
        <thead>
          <tr>
            <th>
              <Button
                variant="link"
                onClick={() => onSort('title')}
              >
                {__('Title', 'wpk')}
              </Button>
            </th>
            <th>{__('Status', 'wpk')}</th>
            <th>{__('Department', 'wpk')}</th>
            <th>{__('Actions', 'wpk')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.status}</td>
              <td>{item.department}</td>
              <td>
                <HStack spacing={2}>
                  <Button size="small" variant="secondary">
                    {__('Edit', 'wpk')}
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    isDestructive
                    onClick={() => onDelete(item.id)}
                  >
                    {__('Delete', 'wpk')}
                  </Button>
                </HStack>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </VStack>
  );
}
```

### Form Patterns with Actions

```typescript
import { ActionButton, useAction } from '@geekist/wp-kernel-ui';
import { CreateJob, UpdateJob } from '@/actions/job';

export function JobForm({ job = null, onSuccess }) {
  const [createJob, { loading: creating }] = useAction(CreateJob);
  const [updateJob, { loading: updating }] = useAction(UpdateJob);

  const isEditing = job !== null;
  const loading = creating || updating;

  const handleSubmit = async (formData) => {
    try {
      if (isEditing) {
        await updateJob({ id: job.id, ...formData });
      } else {
        await createJob(formData);
      }
      onSuccess?.();
    } catch (error) {
      // Error handling
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}

      <ActionButton
        action={isEditing ? UpdateJob : CreateJob}
        data={formData}
        variant="primary"
        disabled={loading}
      >
        {loading
          ? __('Saving...', 'wpk')
          : isEditing
            ? __('Update Job', 'wpk')
            : __('Create Job', 'wpk')
        }
      </ActionButton>
    </form>
  );
}
```

### Real-Time Updates with Events

```typescript
import { useEffect } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';
import { events } from '@geekist/wp-kernel/events';
import { job } from '@/resources/job';

export function LiveJobsList() {
  const { invalidateResolution } = useDispatch(job.store);

  useEffect(() => {
    // Listen for job events and refresh data
    const unsubscribe = events.on('wpk.resource.job.created', () => {
      invalidateResolution('getList', [{}]);
    });

    return unsubscribe;
  }, [invalidateResolution]);

  // Component renders DataViews or fallback table
  return <JobsAdminTable />;
}
```

### WordPress Integration Features

#### Script Modules Integration

```typescript
// Automatic loading via Script Modules API
import { mountAdmin } from '@geekist/wp-kernel-ui/admin';
import JobsAdminTable from './JobsAdminTable';

// Mount when DOM is ready
mountAdmin('#wpk-admin-root', JobsAdminTable, {
	capability: 'manage_options',
	context: { pluginUrl: wpkData.pluginUrl },
});
```

#### WordPress Design System Integration

```css
/* Components automatically inherit WordPress admin styles */
.wpk-admin-screen {
	/* Uses WordPress spacing and typography */
	--wp-admin-theme-color: #007cba;
	--wp-admin-border-color: #dcdcde;
}

/* Customize with CSS custom properties */
.wpk-data-table {
	--wpk-table-spacing: var(--wp-admin-gap);
	--wpk-table-border: 1px solid var(--wp-admin-border-color);
}
```

## WordPress Compatibility Matrix

| WordPress Version | DataViews       | Script Modules | Interactivity API |
| ----------------- | --------------- | -------------- | ----------------- |
| 6.8+              | ✓ Stable        | ✓ Full         | ✓ Full            |
| 6.6               | ⚠️ Experimental | ✓ Basic        | ✓ Basic           |
| 6.5               | ✗ Not Available | ⚠️ Limited     | ⚠️ Limited        |

### Feature Detection & Graceful Degradation

```typescript
import {
  supportsDataViews,
  supportsScriptModules,
  supportsInteractivity
} from '@geekist/wp-kernel-ui/compat';

export function AdminInterface() {
  if (supportsDataViews()) {
    return <ModernDataViewsInterface />;
  }

  if (supportsScriptModules()) {
    return <StandardTableInterface />;
  }

  // Fallback for older WordPress versions
  return <BasicTableInterface />;
}
```

## Styling

Components use WordPress design tokens and CSS custom properties:

```css
/* Inherits WordPress admin styles */
.wp-kernel-action-button {
	/* Uses WordPress button variants */
}

/* Customizable via CSS custom properties */
.wp-kernel-resource-list {
	--wp-kernel-spacing: 1rem;
	--wp-kernel-border-radius: 4px;
}
```

## Development Status

This package is under active development. Current status:

- ✓ Component architecture designed
- ✓ Core hooks implemented
- ✓ DataViews integration patterns defined
- 🚧 Layout components in progress
- 🚧 Block components in progress
- ⏳ Styling system planned

## TypeScript Support

Full TypeScript support with component prop typing:

```typescript
interface ActionButtonProps<T> {
  action: Action<T>;
  data?: T;
  variant?: 'primary' | 'secondary';
  destructive?: boolean;
  children: React.ReactNode;
}

// Auto-inferred from your action definitions
<ActionButton action={CreatePost} data={/* typed based on CreatePost */} />
```

## Integration Guides

- [Getting Started](/getting-started/) - Installation and setup
- [Block Bindings](/guide/block-bindings) - Integrating with Block Editor
- [Interactivity](/guide/interactivity) - Using the Interactivity API

## Related Documentation

- [Resources Guide](/guide/resources) - Data management patterns
- [Actions Guide](/guide/actions) - Action orchestration
