# GitHub Copilot Instructions for WP Kernel

## Project Overview

WP Kernel is a Rails-like, opinionated framework for building modern WordPress products where JavaScript is the source of truth and PHP is a thin contract (REST + capabilities + optional server bindings).

**Core Philosophy**: Actions-first, JS hooks canonical, blocks + bindings + interactivity for views, resources for transport, jobs for background work, and a single PHP bridge for structured legacy extensibility.

## Project Structure

### Packages (`packages/*`)

- **`@geekist/wp-kernel`** - Core framework (resources, actions, events, jobs)
- **`@geekist/wp-kernel-ui`** - UI components and design system
- **`@geekist/wp-kernel-cli`** - CLI tools for scaffolding and development
- **`@geekist/wp-kernel-e2e-utils`** - E2E testing utilities and fixtures (validated via showcase app e2e tests, not unit tests)

### Showcase App (`app/showcase`)

WordPress plugin demonstrating a complete jobs & applications system that exercises all kernel capabilities:

- **Public**: Job listings, search/filter, job details, application forms with CV uploads
- **Admin**: Job management, application pipeline (kanban), email templates, reporting
- **Integration**: Webhooks, Slack notifications, privacy compliance (GDPR)
- **Built incrementally** as sprint tasks are completed, showcasing real-world patterns
- **E2E validation**: The showcase app's e2e tests validate that `@geekist/wp-kernel-e2e-utils` work correctly in real browser environments (e2e-utils can't be unit tested in isolation)

## Documentation

### Internal Documentation

- **`./instructions/`** - Sprint docs, architecture decisions (symlinked from Obsidian vault, not in source control)
- **Current sprint**: Always in `./instructions/sprints/` - follow existing structure when updating

### Public Documentation & References

- **`./docs/`** - Public API docs, guides, tutorials (in source control)
- **`./information/`** - Critical project context:
    - **Product Specification** - Complete framework spec, contracts, guarantees
    - **Example Plugin Specifications** - Jobs & applications system that showcase demonstrates
    - **Roadmap** - Sprint planning and delivery phases
    - **Event Taxonomy** - Canonical events, payloads, PHP bridge mapping

## Task Management Workflow

1. **Before starting**: Always update sprint docs and share your understanding of current scope with user
2. **PR creation**: ALWAYS use `.github/PULL_REQUEST_TEMPLATE.md` - never create ad-hoc PRs
3. **CHANGELOG updates**: Update CHANGELOG.md files in affected packages with changes
4. **Roadmap alignment**: Link PR to roadmap section and sprint doc/spec
5. **Branch management**: Delete branch when PR is merged
6. **Issue tracking**: Ensure GitHub issue exists for new task before creating branch

## Core Code Practices

### Type Safety

- **No `any` types** - Use properly typed globals
- **Global types**:
    - Project globals: `global.d.ts`
    - Test globals: `tests/test-globals.d.ts`
- **Breaking changes**: If implementing a type signature change, stop and check with user first

### Core Scripts (Always Use These)

1. **Formatting**: `pnpm lint --fix` or `pnpm format` (don't wrestle with formatting)
2. **Type checking**:
    - `pnpm typecheck` (all packages)
    - `pnpm typecheck:tests` (test files)
3. **Testing**: `pnpm test` (do NOT use `--filter`, it doesn't work)

### Coverage Expectations

- **Overall Baseline**: Maintain ≥95% statements/lines and ≥98% functions across the codebase (our "green zone")
- **Branch Coverage**: Individual files may dip below 90%, but overall branch median must stay ≥90%
    - ✅ **Fine**: A few files in high-80s if balanced by others in high-90s
    - ❌ **Not fine**: Systemic drift that pulls global branch coverage under 90%
- **Critical Modules** (`error`, `http`, `resource` core): Should remain near 100% as they're foundation
- **Namespace/edge logic**: Some defensive branches will be harder to hit - keep documented, revisit if trending down
- **Definition of Done**: New code must not reduce overall coverage; test all public APIs and expected error paths

### File Size Guidelines

- **Target**: Keep individual files (modules and tests) under **500 lines**
- **General limit**: Files should ideally never exceed 500 lines
- **Refactoring indicators**: When approaching 500 lines, consider:
    - De-duplication of repeated patterns
    - Extracting utility functions or interfaces
    - Splitting into logical modules
- **Process**: Check with user before major file splits or refactoring

## Key Patterns

### 1. Actions-First Rule

UI components NEVER call transport directly. Always route writes through Actions.

```typescript
// ✅ CORRECT
import { CreateThing } from '@/app/actions/Thing/Create';
await CreateThing({ data: formData });
```

### 2. Resource Definition

One `defineResource()` → client + store + cache keys + events.

### 3. Event System

Use canonical events from registry. Never create ad-hoc event names.

### 4. Error Handling

All errors are typed `KernelError` subclasses (never plain `Error`).

## Folder Conventions

```
app/
  resources/     # defineResource() definitions
  actions/       # defineAction() orchestrators
  views/         # Block bindings + Interactivity
  jobs/          # defineJob() definitions
```

## Problem-Solving Approach

### When Fixing Issues

1. **Gather context first** - Read files, check error outputs, understand the full scope before making changes
2. **Look for consistent patterns** - If something works in one place, apply the same pattern elsewhere
3. **Address root causes** - Don't just fix symptoms; identify why the issue occurred
4. **Test incrementally** - Run checks after each change to validate the fix

### When TypeScript Issues Arise

- **Extend global types incrementally** - Add WordPress packages to global types as encountered
- **Use consistent type casting patterns** - Follow existing working patterns in the codebase
- **Check both main and test types** - Run `pnpm typecheck` AND `pnpm typecheck:tests`

### When Tests Fail

- **Identify the pattern** - Race conditions, resource conflicts, timing issues
- **Use appropriate solutions** - Serial mode for shared state, better selectors, proper cleanup
- **Verify the fix** - Run tests multiple times to ensure consistency

### Code Review Feedback

- **Address all feedback promptly** - Even "nitpick" suggestions improve code quality
- **Follow established patterns** - Extract interfaces, avoid duplication, optimize where suggested
- **Test after changes** - Ensure fixes don't break existing functionality

## What NOT to Do

❌ Call transport from UI components  
❌ Create ad-hoc event names  
❌ Deep-import across packages (`packages/*/src/**`)  
❌ Use `any` types  
❌ Throw plain Error objects  
❌ Skip cache invalidation after writes  
❌ Ignore TypeScript errors  
❌ Make assumptions - always gather context first
