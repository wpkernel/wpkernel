---
'@geekist/wp-kernel': minor
---

feat(resource): add defineResource API with validation and client generation

Implements A2: defineResource Public API with comprehensive resource definition, config validation, and typed client method generation.

**Features:**
- `defineResource<T, TQuery>(config)` function for declaring typed REST resources
- Complete config validation with DeveloperError for dev-time safety
- Automatic client method generation (list, get, create, update, remove)
- Path interpolation for :id/:slug patterns in REST routes
- Store key generation (`gk/{resourceName}`)
- Default and custom cache key generators
- Full TypeScript type safety with generics

**Files Added:**
- `packages/kernel/src/resource/types.ts` - Type definitions for resource system
- `packages/kernel/src/resource/interpolate.ts` - Path parameter interpolation
- `packages/kernel/src/resource/defineResource.ts` - Core defineResource function
- `packages/kernel/src/resource/index.ts` - Module exports
- `packages/kernel/src/resource/__tests__/interpolate.test.ts` - 29 tests
- `packages/kernel/src/resource/__tests__/defineResource.test.ts` - 41 tests

**Tests:** 70 new tests (153 total passing)

**Dependencies:** Requires A1 (error system) for validation error handling

**Note:** Client methods throw NotImplementedError (transport integration in A3)
