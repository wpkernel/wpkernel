# Pull Requests

Guide to submitting pull requests to WP Kernel.

## Before You Start

- Read the [Contributing Guide](/contributing/)
- Check [existing issues](https://github.com/theGeekist/wp-kernel/issues) for related work
- Discuss large changes in an issue first

## Creating a Pull Request

### 1. Fork & Branch

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/wp-kernel.git
cd wp-kernel

# Add upstream remote
git remote add upstream https://github.com/theGeekist/wp-kernel.git

# Create a feature branch
git checkout -b feature/my-feature
```

### 2. Make Changes

Follow [Coding Standards](/contributing/standards):

```bash
# Make your changes
# ...

# Run tests
pnpm test
pnpm e2e

# Run lint
pnpm lint

# Run typecheck
pnpm typecheck
```

### 3. Add Changeset

```bash
pnpm changeset
```

Select affected packages, bump type, and write a clear summary:

```markdown
---
'@geekist/wp-kernel': minor
---

Add custom cache invalidation strategies.

Resources can now define `shouldInvalidate` functions to control when cache keys are invalidated based on the action and payload.
```

### 4. Commit Changes

Use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add .
git commit -m "feat(resources): add custom cache invalidation"
```

### 5. Push & Open PR

```bash
git push origin feature/my-feature
```

Then open a PR on GitHub.

## PR Template

Use this template when creating your PR:

```markdown
## What

Brief description of what this PR does.

## Why

Problem or use case this solves. Link to related issues.

Fixes #123

## How

High-level overview of the implementation approach.

## Testing

How to test this change:

1. Step one
2. Step two
3. Expected result

## Screenshots (if applicable)

## Breaking Changes

List any breaking changes and migration steps.

## Checklist

- [ ] Tests pass (`pnpm test` and `pnpm e2e`)
- [ ] Code is linted (`pnpm lint`)
- [ ] Changeset added (`pnpm changeset`)
- [ ] Documentation updated
- [ ] Examples updated (if API changed)
```

## PR Requirements

### Must Have

- [ ] **All tests pass** - Unit and E2E tests must be green
- [ ] **Lint passes** - Zero ESLint errors
- [ ] **Changeset** - Unless docs-only change
- [ ] **Conventional commits** - Proper commit message format
- [ ] **Description** - Clear what/why/how

### Should Have

- [ ] **Tests for new code** - Unit tests for new functionality
- [ ] **E2E tests** - For user-facing features
- [ ] **Documentation** - Update docs for API changes
- [ ] **Examples** - Update examples if relevant

### Nice to Have

- [ ] **Performance tests** - For performance-critical code
- [ ] **Screenshots** - For UI changes
- [ ] **Migration guide** - For breaking changes

## Review Process

### CI Checks

All PRs must pass CI:

- ✓ Lint
- ✓ TypeScript
- ✓ Build
- ✓ Unit Tests
- ✓ E2E Tests

### Code Review

1. **Automated review** - CI checks run automatically
2. **Maintainer review** - One approval required
3. **Changes requested** - Address feedback and push updates
4. **Approved** - PR is ready to merge

### Merge Strategy

- **Squash merge** - All PRs are squashed into one commit
- **Commit message** - Should follow Conventional Commits
- **Branch deletion** - Feature branch is deleted after merge

## Common Scenarios

### Addressing Review Feedback

```bash
# Make changes based on feedback
# ...

# Commit
git add .
git commit -m "refactor: address review feedback"

# Push
git push origin feature/my-feature
```

CI will re-run automatically.

### Updating from Main

```bash
# Fetch latest
git fetch upstream

# Merge main into your branch
git checkout feature/my-feature
git merge upstream/main

# Resolve conflicts if any
# ...

# Push
git push origin feature/my-feature
```

### Amending Commits

```bash
# Make additional changes
# ...

# Amend previous commit
git add .
git commit --amend --no-edit

# Force push (only on your fork!)
git push origin feature/my-feature --force-with-lease
```

### Updating Changeset

```bash
# Remove old changeset
rm .changeset/<old-changeset-id>.md

# Create new changeset
pnpm changeset

# Commit
git add .changeset/
git commit -m "chore: update changeset"
git push
```

## PR Types

### Bug Fix

```markdown
## What

Fix validation error for empty description field.

## Why

Users were unable to submit things without descriptions, even though description is optional.

Fixes #123

## How

Updated validation schema to allow empty strings for description field.

## Testing

1. Navigate to Things page
2. Click "Add New"
3. Enter title only, leave description empty
4. Click "Create"
5. Thing should be created successfully
```

### New Feature

```markdown
## What

Add custom cache invalidation strategies for Resources.

## Why

Some resources need fine-grained control over when cache is invalidated based on the specific action and payload.

## How

Added optional `shouldInvalidate` function to resource config that receives action and payload and returns boolean.

## Testing

See new unit tests in `packages/kernel/src/__tests__/resource.test.ts`.

## Breaking Changes

None. This is an optional enhancement.
```

### Documentation

```markdown
## What

Document block bindings usage patterns.

## Why

Users were asking how to implement server-side bindings for SEO.

## How

Added comprehensive guide with examples in `/docs/guide/block-bindings.md`.

## Testing

Review documentation locally:

1. `pnpm docs:dev`
2. Navigate to Guide → Block Bindings
3. Verify examples are clear
```

### Refactor

```markdown
## What

Extract transport retry logic into separate utility.

## Why

Retry logic was duplicated across resource methods. Extracting improves maintainability.

## How

Created `packages/kernel/src/transport/retry.ts` with exponential backoff implementation. Updated all resource methods to use it.

## Testing

All existing tests pass. Added unit tests for retry utility.

## Breaking Changes

None. Internal refactor only.
```

## Troubleshooting PRs

### CI Failing

#### Lint Errors

```bash
# Check locally
pnpm lint

# Auto-fix
pnpm lint:fix

# Commit and push
git add .
git commit -m "style: fix lint errors"
git push
```

#### Test Failures

```bash
# Run locally
pnpm test
pnpm e2e

# Debug
pnpm test --watch
pnpm e2e --headed

# Fix and push
```

#### Build Errors

```bash
# Clean build
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Merge Conflicts

```bash
# Fetch latest
git fetch upstream

# Rebase on main
git rebase upstream/main

# Resolve conflicts
# Edit conflicting files
git add .
git rebase --continue

# Force push
git push origin feature/my-feature --force-with-lease
```

### Changeset Missing

```bash
# Add changeset
pnpm changeset

# Commit
git add .changeset/
git commit -m "chore: add changeset"
git push
```

## After Merge

### Clean Up Branches

```bash
# Delete local branch
git checkout main
git branch -d feature/my-feature

# Delete remote branch (if not auto-deleted)
git push origin --delete feature/my-feature
```

### Update Local Main

```bash
# Fetch and pull latest
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

## Release Process

Releases are automated:

1. **Maintainer merges PRs** with changesets
2. **Changesets bot** opens "Version Packages" PR
3. **Maintainer reviews** version changes and changelog
4. **Maintainer merges** version PR
5. **GitHub Actions** publishes to npm automatically

## Questions?

- **Documentation**: https://theGeekist.github.io/wp-kernel/
- **Issues**: https://github.com/theGeekist/wp-kernel/issues
- **Discussions**: https://github.com/theGeekist/wp-kernel/discussions

## Quick Reference

```bash
# Before starting
git checkout -b feature/my-feature

# While working
pnpm test
pnpm lint
pnpm changeset

# Before pushing
git add .
git commit -m "feat: my feature"
git push origin feature/my-feature

# After PR merged
git checkout main
git pull upstream main
git branch -d feature/my-feature
```

Thank you for contributing! 🎉
