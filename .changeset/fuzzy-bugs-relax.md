---
'@geekist/wp-kernel': patch
---

Add @wordpress/data store integration for resources (A3)

**New Features:**

- **Store Factory**: `createStore()` function generates typed @wordpress/data stores from resource definitions
- **Automatic Store Registration**: Resources now have a lazy-loaded `store` property that auto-registers with @wordpress/data on first access
- **Complete Store API**: Stores include reducer, actions, selectors, and resolvers following @wordpress/data patterns
- **TypeScript Support**: Full type safety with `ResourceState`, `ResourceActions`, `ResourceSelectors`, `ResourceResolvers`, `ResourceStoreConfig`, and `ResourceStore` interfaces

**Store Features:**

- **Selectors**: `getItem()`, `getItems()`, `getList()`, `getError()`, plus resolution helpers (`isResolving`, `hasStartedResolution`, `hasFinishedResolution`)
- **Resolvers**: Automatic data fetching with error handling when selectors are used
- **Actions**: `receiveItem()`, `receiveItems()`, `receiveError()`, `invalidate()`, `invalidateAll()` for state management
- **Reducer**: Handles `RECEIVE_ITEM`, `RECEIVE_ITEMS`, `RECEIVE_ERROR`, `INVALIDATE`, and `INVALIDATE_ALL` actions with immutable state updates
- **Customization**: Custom `getId` and `getQueryKey` functions, initial state support

**Documentation:**

- Added comprehensive @wordpress/data store integration section to resources guide
- Complete examples of using stores with `useSelect` and `dispatch`
- Best practices for selector usage, resolver patterns, and cache invalidation

**Testing:**

- 36 new test cases covering all store functionality
- 93.82% coverage for store module
- Tests for reducer logic, selectors, resolvers, actions, error handling, and custom configuration

**Implementation Details:**

- Store creation is lazy - only initialized on first `resource.store` access
- Stores automatically register with `window.wp.data.register()` when available
- Resolvers use async functions (not generators) for simpler implementation
- Normalized state structure: items by ID, lists as ID arrays, separate metadata
- Default `getId` assumes `item.id` property, default `getQueryKey` uses `JSON.stringify`

Resolves #3
