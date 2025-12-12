[**@wpkernel/cli v0.12.5-beta.0**](../README.md)

***

[@wpkernel/cli](../README.md) / resourceAccessors

# Variable: resourceAccessors

```ts
const resourceAccessors: ResourceAccessors&lt;"shared" | "wpPost" | "wpOption" | "transient" | "wpTaxonomy"&gt;;
```

WordPress Resource Accessor Registry

The canonical registry of all WordPress storage accessor helpers organized
by storage kind. This is the single source of truth for WordPress-specific
PHP AST builders used across the framework.

## Remarks

## Storage Kinds

### Shared
Cross-cutting helpers available to all storage types:
- **request**: REST request parameter parsing
- **query**: WP_Query and pagination
- **errors**: WP_Error handling
- **cache**: Cache invalidation metadata

### WP_Post
WordPress post resource helpers:
- **identity**: Post ID validation and type guards
- **list**: List route with foreach iteration
- **metaQuery**: Post meta field queries
- **taxonomyQuery**: Taxonomy term filtering
- **mutations**: Create, update, delete operations

### WP_Option
WordPress Options API:
- **wpOption**: Get/update routes and helper methods

### Transient
WordPress Transient API:
- **transient**: Get/set/delete routes with TTL support

### WP_Taxonomy
WordPress taxonomy resources:
- **helpers**: Term resolution and assignment
- **list**: List taxonomy terms
- **get**: Get individual term

## Example

```typescript
// Access WP_Post identity helpers
const postStorage = resourceAccessors.storage('wpPost');
const identityHelpers = postStorage.helpers.get('identity');
const { isNumericIdentity } = identityHelpers.value;

// Access shared query helpers
const sharedStorage = resourceAccessors.storage('shared');
const queryHelpers = sharedStorage.helpers.get('query');
```
