# Contributing to WP Kernel

Thank you for your interest in contributing to WP Kernel! This guide will help you get started.

## 🚀 Quick Start

**👉 [Development Setup](/contributing/setup)** - Complete guide to setting up your development environment.

New contributors should read this first - it covers the critical infrastructure that makes this project work.

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (Node version, OS, WordPress version)
- **Code samples** (if applicable)
- **Screenshots** (if applicable)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Clear use case** - What problem does this solve?
- **Proposed API** - How would it work?
- **Alternatives considered** - What other approaches exist?
- **Breaking changes** - Would this affect existing code?

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`pnpm test` and `pnpm e2e`)
6. Lint your code (`pnpm lint`)
7. Update CHANGELOG.md in affected packages
8. Commit with Conventional Commits format
9. Push to your fork
10. Open a Pull Request

## Development Workflow

### Prerequisites

- **Node.js**: v22.20.0 LTS (use [nvm](https://github.com/nvm-sh/nvm))
- **pnpm**: v9.12.3 or later
- **Docker**: For local WordPress environment
- **Git**: For version control

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/theGeekist/wp-kernel.git
cd wp-kernel

# Install dependencies
pnpm install

# Start WordPress with seed data
pnpm wp:fresh

# Start watch mode for development
pnpm dev
```

See [Development Setup](/contributing/setup) for detailed instructions.

### Common Tasks

See [Runbook](/contributing/runbook) for detailed instructions on:

- Starting/stopping WordPress
- Running tests
- Building packages
- Seed data management
- Troubleshooting

### Coding Standards

See [Coding Standards](/contributing/standards) for:

- TypeScript guidelines
- ESLint rules
- Naming conventions
- File structure
- Import/export patterns

### Testing

See [Testing Guide](/contributing/testing) for:

- Writing unit tests
- Writing E2E tests
- Running tests locally
- Test fixtures and seed data

## Versioning

WP Kernel uses manual semantic versioning with fixed versioning across all packages.

### Updating Versions

After making changes, update CHANGELOG.md files:

```markdown
## 0.x.0 [Unreleased]

### Added

- Your feature description

### Fixed

- Bug fix description
```

### Version Bump Guidelines

- **One CHANGELOG update per PR** (usually)
- **Clear descriptions** - Users will read these in the changelog
- **Correct bump type**:
    - **Major**: Breaking changes, event taxonomy changes, slot changes
    - **Minor**: New features, new events/slots (non-breaking)
    - **Patch**: Bug fixes, documentation, internal refactors

Example changeset:

```markdown
---
'@geekist/wp-kernel': minor
---

Add support for custom cache invalidation strategies in Resources.

Resources can now define custom `shouldInvalidate` functions to control when cache keys are invalidated:

\`\`\`typescript
export const thing = defineResource({
// ...
shouldInvalidate: (action, payload) => {
return action === 'update' && payload.status === 'published';
},
});
\`\`\`
```

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (deps, configs, etc.)

### Examples

```bash
feat(resources): add custom cache invalidation strategies

fix(actions): emit events after cache invalidation

docs(guide): add examples for block bindings

test(e2e): add tests for job polling

chore(deps): update @wordpress/scripts to v27
```

### Scope

Use package names or feature areas:

- `resources`
- `actions`
- `events`
- `bindings`
- `interactivity`
- `jobs`
- `e2e-utils`
- `ui`

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`pnpm test` and `pnpm e2e`)
- [ ] Code is linted (`pnpm lint`)
- [ ] CHANGELOG.md updated in affected packages
- [ ] Documentation updated (if needed)
- [ ] Examples updated (if API changed)

### PR Template

When opening a PR, include:

**What**: Brief description of changes

**Why**: Problem/use case this solves

**How**: Implementation approach

**Testing**: How to test this change

**Breaking Changes**: Any breaking changes? Migration guide?

### Review Process

1. **CI must pass** - All automated checks must be green
2. **One approval required** - From a maintainer
3. **Changeset required** - Unless it's a docs-only change
4. **Squash merge** - PRs are squashed on merge

## Release Process

Releases are automated via GitHub Actions:

1. Maintainer merges PRs with changesets
2. Changesets bot opens a "Version Packages" PR
3. Maintainer reviews and merges the version PR
4. GitHub Actions publishes to npm automatically

## License

By contributing, you agree that your contributions will be licensed under the [EUPL-1.2 License](https://github.com/theGeekist/wp-kernel/blob/main/LICENSE).

The European Union Public Licence (EUPL) is a copyleft license with a network use clause, similar to AGPL but designed for European legal systems.

## Questions?

- **Documentation**: https://theGeekist.github.io/wp-kernel/
- **Issues**: https://github.com/theGeekist/wp-kernel/issues
- **Discussions**: https://github.com/theGeekist/wp-kernel/discussions

## Getting Help

If you need help:

1. Check the [documentation](/)
2. Search [existing issues](https://github.com/theGeekist/wp-kernel/issues)
3. Ask in [discussions](https://github.com/theGeekist/wp-kernel/discussions)
4. Reach out to maintainers

Thank you for contributing! 🎉
