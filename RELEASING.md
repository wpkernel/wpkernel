# Release Model & Workflow

> **WP Kernel uses manual semantic versioning with fixed versioning across all public packages.**

**Model**: Sprint-driven releases with manual version management.

---

## Quick Reference

| Action            | Process                                 |
| ----------------- | --------------------------------------- |
| **New Sprint PR** | Update CHANGELOG.md with sprint changes |
| **Version Bump**  | Update package.json versions manually   |
| **Release**       | Tag and publish to npm manually         |

---

## 1️⃣ Versioning Rules

### Package Structure

All public packages use **fixed versioning** (same version number):

- `@geekist/wp-kernel`
- `@geekist/wp-kernel-ui`
- `@geekist/wp-kernel-cli`
- `@geekist/wp-kernel-e2e-utils`

### Bump Types

| Sprint Type     | Bump      | When                                   |
| --------------- | --------- | -------------------------------------- |
| Feature sprint  | **minor** | New capabilities, major features       |
| Alignment/fixes | **patch** | Bug fixes, optimizations, ".5" sprints |
| Breaking change | **major** | API changes (rare pre-1.0)             |
| Infra/docs only | **none**  | Use `no-release` label on PR           |

**Default**: `minor` for regular sprint work.

---

## 2️⃣ Sprint PR Workflow

### Creating a Sprint PR

**Step 1: Update CHANGELOG.md**

Add section to CHANGELOG.md files in affected packages:

```markdown
## 0.x.0 [Unreleased]

### Added

- New feature description

### Fixed

- Bug fix description
```

**Step 2: Use PR template**

When opening the PR, **always use the PR template** (`.github/PULL_REQUEST_TEMPLATE.md`). It includes:

- Sprint/scope metadata
- Roadmap & spec links
- Release checklist

**✗ Never create ad-hoc PRs without the template.**

**Step 3: Link documentation**

Every Sprint PR must link to:

- Roadmap section (`information/Roadmap PO • v1.0.md`)
- Sprint doc/spec (if available in `information/` or `instructions/`)

---

## 3️⃣ Release Process

### Preparing a Release

1. **Update versions** in all package.json files (fixed versioning)
2. **Update CHANGELOG.md** - Change `[Unreleased]` to version and date
3. **Commit and tag**:
    ```bash
    git add .
    git commit -m "chore(release): v0.x.0"
    git tag v0.x.0
    git push origin main --tags
    ```
4. **Build and publish**:
    ```bash
    pnpm build
    npm publish --workspace packages/kernel
    npm publish --workspace packages/ui
    npm publish --workspace packages/cli
    npm publish --workspace packages/e2e-utils
    ```

---

## 4️⃣ Direct Commits to Main

**Policy**: Main commits should be for monorepo hygiene only, not consumer-facing changes, and never trigger publishing.

### When to commit directly:

- CI configuration updates
- Documentation fixes (typos, clarifications)
- Tooling improvements (scripts, configs)
- Developer experience (VS Code settings, etc.)

### When to use a Sprint PR:

- Any change affecting published packages
- New features or bug fixes
- API modifications
- Behavioral changes

**No changeset needed** for direct main commits, which are by definition labelled `no-release` and never publish.

---

## 5️⃣ Mapping Sprints to Releases

### Standard Sprint (minor)

Update CHANGELOG.md with sprint changes, bump versions from `0.5.0` → `0.6.0`

### Alignment Sprint (patch)

Update CHANGELOG.md with fixes, bump versions from `0.6.0` → `0.6.1`

### Breaking Change (major)

If pre-1.0, bump next 0.x version (e.g., `0.9.0` → `0.10.0`); after 1.0, bump major version (e.g., `1.0.0` → `2.0.0`).

### Infrastructure PR (none)

Label PR with `no-release`:

- No CHANGELOG entry required
- No version bump
- Changes don't affect published packages

---

## 6️⃣ Beta/Pre-release Workflow

For Beta testing phases (e.g., Sprint 5 → 0.5.0-beta.1):

1. Update versions to beta (e.g., `0.5.0-beta.1`)
2. Build and publish with `--tag beta`:
    ```bash
    pnpm build
    npm publish --workspace packages/kernel --tag beta
    npm publish --workspace packages/ui --tag beta
    npm publish --workspace packages/cli --tag beta
    npm publish --workspace packages/e2e-utils --tag beta
    ```
3. Iterate with additional beta versions (0.5.0-beta.2, etc.)
4. When ready for stable, update to `0.5.0` and publish normally

**Install beta versions:**

```bash
npm install @geekist/wp-kernel@beta
```

---

## 7️⃣ Roadmap Alignment

Every Sprint PR **must** link to:

1. **Roadmap section** - `information/Roadmap PO • v1.0.md`
    - Shows sprint scope, deliverables, dependencies

2. **Sprint doc/spec** - If available in `information/` or `instructions/`
    - Detailed technical specs, acceptance criteria

The Roadmap is the **canonical record** of sprint planning. PR descriptions should mirror its bullet points.

---

## 8️⃣ Available Scripts

---

## 8️⃣ Enforcement Mechanisms

### Required

✓ **PR Template** - Always use `.github/PULL_REQUEST_TEMPLATE.md`  
✓ **CHANGELOG.md** - Update in affected packages unless labelled `no-release`  
✓ **Roadmap link** - Sprint PRs must reference roadmap  
✓ **CI checks** - Lint, typecheck, tests, build must pass

### Manual

✓ **Version bumps** - Update package.json versions manually  
✓ **CHANGELOG formatting** - Follow Keep a Changelog format  
✓ **npm publishing** - Publish to npm after tagging  
✓ **Git tags** - Create tags manually for releases

---

## 9️⃣ Common Workflows

### Example: Sprint 5 PR

```bash
git checkout -b sprint/5-bindings-interactivity
# Edit CHANGELOG.md files
git add .
git commit -m "feat(kernel): add block bindings support"
git push origin sprint/5-bindings-interactivity
```

- Link to roadmap in PR description
    - Roadmap: information/Roadmap PO • v1.0.md § Sprint 5
    - Spec: information/Sprint-5-Bindings.md

- After review/merge → manually create release when ready
- Update versions → tag → publish to npm

### Example: Patch/Alignment Sprint

```bash
git checkout -b sprint/5.5-polish
# Update CHANGELOG.md with fixes
```

Follow same workflow as above.

### Example: Infra Change

```bash
git checkout -b fix/ci-timeout
# Edit .github/workflows/ci.yml
git commit -m "ci: increase E2E test timeout"
```

If PR: add label `no-release`. No CHANGELOG entry needed.

---

## Related Documentation

- **[VERSIONING.md](./VERSIONING.md)** - Semver policy, deprecations, back-compat
- **[CHANGELOG.md](./CHANGELOG.md)** - Historical releases and changes
- **[PR Template](./.github/PULL_REQUEST_TEMPLATE.md)** - Required PR format
- **[Contributing Guide](./docs/contributing/)** - Full contributor workflow
- **[Roadmap](./information/Roadmap PO • v1.0.md)** - Sprint planning (internal)

---

## Questions?

- **"Should I create a changeset?"** → Yes, unless it's pure infra/docs (use `no-release` label)
- **"Which bump type?"** → Default to `minor` for sprint work, `patch` for `.5` sprints
- **"Can I edit a changeset?"** → Yes! Edit the `.changeset/*.md` file if scope grows
- **"Multiple changesets in one PR?"** → No. One changeset per sprint. Edit the existing one.
- **"When does it publish?"** → When the "Version Packages" Release PR is merged to main

---

**Last Updated**: 6 October 2025  
**Model Version**: v2025.10
