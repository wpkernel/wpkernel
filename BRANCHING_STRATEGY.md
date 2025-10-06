# WP Kernel Branching Strategy & Git Workflow

**Version**: 1.0  
**Last Updated**: 1 October 2025  
**Status**: Active

---

## Overview

This document defines the branching strategy and git workflow for the WP Kernel project. We use a **trunk-based development** approach with short-lived feature branches and GitHub Pull Requests for code review.

---

## Branch Types

### `main` (Protected)

- **Purpose**: Production-ready code
- **Protection**: Requires PR approval, passing CI, and up-to-date with base
- **Direct commits**: Not allowed
- **Release source**: All releases cut from `main`

### Feature Branches

- **Naming**: `sprint-<number>/<phase>-<task-id>-<short-description>`
- **Lifespan**: Short-lived (< 3 days ideal, < 1 week max)
- **Base**: Always branch from latest `main`
- **Merge strategy**: Squash and merge via GitHub PR

**Examples**:

```
sprint-1/a1-errors
sprint-1/a2-define-resource
sprint-1/b2-rest-stub
sprint-1/c3-e2e-tests
sprint-2/policies-client-hints
```

### Hotfix Branches (Future)

- **Naming**: `hotfix/<issue-number>-<short-description>`
- **Purpose**: Critical bug fixes for production
- **Base**: `main`
- **Merge**: Squash and merge to `main`, then cherry-pick to release branch if needed

---

## Workflow: Feature Development

### 1. Start New Task

```bash
# Ensure main is up-to-date
git checkout main
git pull origin main

# Create feature branch
git checkout -b sprint-1/a1-errors

# Verify you're on the correct branch
git branch --show-current
```

### 2. Work on Feature

**Commit often** with meaningful messages:

```bash
# Stage changes
git add packages/kernel/src/errors/KernelError.ts

# Commit with conventional commit format
git commit -m "feat(errors): add KernelError base class"

# Continue working...
git add packages/kernel/src/errors/TransportError.ts
git commit -m "feat(errors): add TransportError subclass"

# Add tests
git add packages/kernel/src/errors/__tests__/
git commit -m "test(errors): add error serialization tests"
```

### 3. Push to Remote

```bash
# First push creates remote branch
git push origin sprint-1/a1-errors

# Subsequent pushes
git push
```

### 4. Create Pull Request

Using GitHub CLI:

```bash
gh pr create \
  --title "A1: Result Types & Errors" \
  --body "## Summary
Implements KernelError base class with TransportError and ServerError subclasses.

## Changes
- ✓ Base error class with code, message, data, context
- ✓ TransportError for HTTP/network errors
- ✓ ServerError for WordPress REST errors
- ✓ Unit tests for serialization

## Testing
- [x] Unit tests pass (\`pnpm test\`)
- [x] Lint passes (\`pnpm lint\`)
- [x] Types check (\`pnpm typecheck\`)
- [x] Manual testing in wp-env

## Related
Closes #<issue-number>" \
  --label "sprint-1,type:enhancement" \
  --assignee "@me" \
  --draft  # Remove --draft when ready for review
```

Or use GitHub web UI at: `https://github.com/theGeekist/wp-kernel/compare/main...sprint-1/a1-errors`

### 5. Address Review Feedback

```bash
# Make requested changes
git add .
git commit -m "refactor(errors): apply review feedback"
git push

# Or amend last commit if minor
git add .
git commit --amend --no-edit
git push --force-with-lease
```

### 6. Merge PR

**Via GitHub UI**:

1. Ensure CI is green ✓
2. Ensure 1+ approvals ✓
3. Click "Squash and merge"
4. Edit squash commit message if needed
5. Confirm merge
6. Delete branch automatically (checkbox)

**After merge**:

```bash
# Switch to main and pull
git checkout main
git pull origin main

# Delete local feature branch
git branch -d sprint-1/a1-errors

# Verify it's gone
git branch
```

---

## Commit Message Convention

We follow **Conventional Commits** specification:

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding or updating tests
- `docs`: Documentation only
- `refactor`: Code refactor (no functional change)
- `style`: Code style (formatting, semicolons, etc.)
- `chore`: Build/tooling/dependencies
- `perf`: Performance improvement
- `ci`: CI/CD changes

### Scopes

- `errors`: Error handling
- `resource`: Resource API
- `store`: Data store
- `transport`: Network layer
- `events`: Event system
- `docs`: Documentation
- `cli`: CLI tool
- `showcase`: Showcase plugin
- `e2e`: E2E tests

### Examples

```bash
feat(resource): add defineResource API
fix(store): prevent duplicate resolver calls
test(errors): add TransportError tests
docs(resource): add usage guide
refactor(transport): extract _fields logic
chore(deps): update @wordpress/scripts to 30.24.0
```

### Breaking Changes

For breaking changes, add `BREAKING CHANGE:` in footer:

```bash
git commit -m "feat(resource)!: change cache key format

BREAKING CHANGE: Cache keys now use JSON.stringify for consistency"
```

---

## Pull Request Guidelines

### PR Title

Use conventional commit format:

```
feat(resource): add defineResource API
fix(store): prevent duplicate resolver calls
```

### PR Description Template

```markdown
## Summary

Brief description of what this PR does.

## Changes

- ✓ Change 1
- ✓ Change 2
- ✓ Change 3

## Testing

- [ ] Unit tests pass
- [ ] Lint passes
- [ ] Types check
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing complete

## Screenshots (if UI changes)

[Add screenshots]

## Related

Closes #<issue-number>
Relates to #<issue-number>
```

### PR Checklist (Self-Review)

Before requesting review:

- [ ] Code compiles (`pnpm build`)
- [ ] Tests pass (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Types check (`pnpm typecheck`)
- [ ] No debug code (console.log, debugger)
- [ ] Documentation updated (if public API)
- [ ] Changeset added (`pnpm changeset`)
- [ ] Self-reviewed diff on GitHub
- [ ] PR description complete

### Review Guidelines

**As Author**:

- Respond to feedback within 24 hours
- Mark conversations as resolved when addressed
- Request re-review when ready

**As Reviewer**:

- Review within 24 hours of request
- Test locally if possible
- Leave constructive feedback
- Approve when satisfied, request changes if not

---

## Handling Conflicts

### If `main` has moved ahead:

```bash
# On your feature branch
git checkout sprint-1/a1-errors

# Fetch latest main
git fetch origin main

# Rebase onto main (preferred)
git rebase origin/main

# Or merge main into your branch
git merge origin/main

# Resolve conflicts
# ... edit files ...
git add .
git rebase --continue  # or git commit if merging

# Force push (only if already pushed)
git push --force-with-lease
```

### Merge vs Rebase

**Use rebase** (default):

- Keeps history linear
- No merge commits
- Cleaner git log

**Use merge** if:

- Multiple people working on same branch
- Already have PR reviews in progress

---

## Changesets

Every user-facing change requires a **changeset**.

### Create Changeset

```bash
# Run changeset CLI
pnpm changeset

# Select packages affected (spacebar to select)
# Choose version bump (patch, minor, major)
# Enter change description
```

### Changeset Format

```markdown
---
'@geekist/wp-kernel': minor
---

Add defineResource API for declaring REST resources with generated stores
```

### When to Skip

Only skip changeset for:

- Documentation-only changes
- Internal refactors (no API change)
- Test-only changes
- CI/CD changes

---

## Release Process (Future)

Once Sprint 1 is complete:

### 1. Prepare Release

```bash
# Create release branch
git checkout -b release/v0.2.0

# Run changeset version
pnpm changeset:version

# Review generated CHANGELOG.md
# Commit changes
git add .
git commit -m "chore(release): version packages for v0.2.0"

# Push and create PR
git push origin release/v0.2.0
gh pr create --title "Release v0.2.0"
```

### 2. Publish (After PR Merge)

```bash
# On main after release PR merged
git checkout main
git pull origin main

# Build all packages
pnpm build

# Publish to npm
pnpm changeset:publish

# Push tags
git push --follow-tags
```

### 3. Create GitHub Release

```bash
gh release create v0.2.0 \
  --title "v0.2.0 - Resources & Stores" \
  --notes-file RELEASE_NOTES.md
```

---

## Branch Protection Rules

### `main` Branch Protection

**Required**:

- ✓ Require pull request before merging
    - ✓ Require 1 approval
    - ✓ Dismiss stale reviews when new commits pushed
    - ✓ Require review from Code Owners (future)
- ✓ Require status checks to pass
    - ✓ Build
    - ✓ Lint
    - ✓ Unit Tests
    - ✓ E2E Tests
    - ✓ Changeset Check
- ✓ Require branches to be up to date before merging
- ✓ Require conversation resolution before merging
- ✓ Do not allow bypassing the above settings

**Optional** (can enable later):

- Require signed commits
- Require linear history
- Lock branch (prevent force push)

---

## Git Configuration

### Recommended Local Config

```bash
# Set user info (if not already set)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch name
git config --global init.defaultBranch main

# Set default pull strategy (rebase)
git config --global pull.rebase true

# Auto-prune remote branches on fetch
git config --global fetch.prune true

# Use VSCode as default editor
git config --global core.editor "code --wait"

# Better diff algorithm
git config --global diff.algorithm histogram

# Show branch names in log
git config --global log.decorate auto
```

### Project-Specific Config

```bash
# In repo root
cd /path/to/wp-kernel

# Set commit template (optional)
git config commit.template .github/.gitmessage

# Enable GPG signing (optional)
git config commit.gpgsign true
```

---

## Troubleshooting

### "Your branch has diverged"

```bash
# If you haven't pushed yet
git rebase origin/main

# If you've already pushed
git fetch origin
git reset --hard origin/sprint-1/a1-errors
```

### "Conflicts during rebase"

```bash
# View conflict files
git status

# Edit files to resolve
# ... resolve conflicts ...

# Mark as resolved
git add .

# Continue rebase
git rebase --continue

# Or abort and try merge instead
git rebase --abort
git merge origin/main
```

### "Accidentally committed to main"

```bash
# Create feature branch from current state
git checkout -b sprint-1/accidental-commit

# Reset main to remote
git checkout main
git reset --hard origin/main

# Your work is now on feature branch
git checkout sprint-1/accidental-commit
```

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Trunk-Based Development](https://trunkbaseddevelopment.com/)
- [Changesets Documentation](https://github.com/changesets/changesets)

---

## Updates to This Document

This branching strategy may evolve. Updates will be communicated via:

- Slack/Discord announcement
- PR to this document
- Team meeting discussion

**Version History**:

- v1.0 (1 Oct 2025): Initial branching strategy for Sprint 1

---

**Questions?** Ask in `#wp-kernel-dev` channel.
