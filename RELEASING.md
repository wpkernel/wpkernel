# Release Model & Workflow

> **Canonical source of truth for WP Kernel sprint-driven fixed versioning releases and changesets.**

**Model**: Sprint-driven releases with fixed versioning across all public packages.

---

## Quick Reference

| Action                 | Command                                           |
| ---------------------- | ------------------------------------------------- |
| **New Sprint PR**      | `pnpm cs:new:minor "Sprint N: headline"`          |
| **Alignment (.5) PR**  | `pnpm cs:new:patch "Sprint N.5: headline"`        |
| **Direct main commit** | No changeset needed (infra/docs only, no publish) |
| **Merge Sprint PR**    | CI auto-creates "Version Packages" Release PR     |
| **Merge Release PR**   | npm publish runs automatically                    |
| **Beta phase**         | `pnpm changeset pre enter beta` + `--tag beta`    |

---

## 1️⃣ Versioning Rules

### Package Structure

All public packages use **fixed versioning** (same version number):

- `@geekist/wp-kernel`
- `@geekist/wp-kernel-ui`
- `@geekist/wp-kernel-cli`
- `@geekist/wp-kernel-e2e-utils`

Configured in `.changeset/config.json`:

```json
{
	"fixed": [
		[
			"@geekist/wp-kernel",
			"@geekist/wp-kernel-ui",
			"@geekist/wp-kernel-cli",
			"@geekist/wp-kernel-e2e-utils"
		]
	]
}
```

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

### One Sprint = One Changeset

Each Sprint PR includes **exactly one changeset**. If scope grows during development, edit the existing changeset file - don't create additional ones.

### Creating a Sprint PR

**Step 1: Create changeset**

```bash
# For feature sprints (default)
pnpm cs:new:minor "Sprint 5: Bindings & Interactivity (Block Bindings, Interactivity API, Providers)"

# For alignment/patch sprints
pnpm cs:new:patch "Sprint 5.5: Performance & Polish"

# For breaking changes (rare)
pnpm cs:new:major "Sprint 9: PHP Bridge (breaking API refactor)"
```

This creates a `.changeset/*.md` file with your summary.

**Step 2: Use PR template**

When opening the PR, **always use the PR template** (`.github/PULL_REQUEST_TEMPLATE.md`). It includes:

- Sprint/scope metadata
- Roadmap & spec links
- Release checklist
- Changeset confirmation

**✗ Never create ad-hoc PRs without the template.**

**Step 3: Link documentation**

Every Sprint PR must link to:

- Roadmap section (`information/Roadmap PO • v1.0.md`)
- Sprint doc/spec (if available in `information/` or `instructions/`)

---

## 3️⃣ CI & Automation

### Changeset Check

`.github/workflows/changesets-check.yml` enforces that every PR has a changeset **unless**:

- PR is labelled `no-release` (infra/docs only)
- PR is labelled `infra-only`

### Release Automation

`.github/workflows/release.yml` runs on every push to `main`:

1. **Creates/updates "Version Packages" PR**
    - Bumps versions in all `package.json` files
    - Generates `CHANGELOG.md` entries
    - Commits changes (`commit: true` in config)

2. **Publishes to npm on merge**
    - Runs `pnpm build` across all packages
    - Executes `changeset publish`
    - Pushes tags to GitHub

### Release PR Checklist

`.github/workflows/release-pr-checklist.yml` auto-comments on the "Version Packages" PR with:

- Pre-publish validation steps
- Dist-tag confirmation
- Documentation links
- Sanity-pack reminders

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

```bash
pnpm cs:new:minor "Sprint 6: Admin Mount & UI Components"
```

**Result**: `0.5.0` → `0.6.0`

### Alignment Sprint (patch)

```bash
pnpm cs:new:patch "Sprint 6.5: Performance Tuning"
```

**Result**: `0.6.0` → `0.6.1`

### Breaking Change (major)

```bash
pnpm cs:new:major "Sprint 9: PHP Bridge (breaking refactor)"
```

**Result**: If pre-1.0, bump next 0.x version (e.g., `0.9.0` → `0.10.0`); after 1.0, bump major version (e.g., `1.0.0` → `2.0.0`).

### Infrastructure PR (none)

Label PR with `no-release`:

- No changeset required
- No version bump
- Changes don't affect published packages

---

## 6️⃣ Beta/Pre-release Workflow

For Beta testing phases (e.g., Sprint 5 → 0.5.0-beta.1):

```bash
# Enter pre-release mode
pnpm changeset pre enter beta

# Create changeset for beta work
pnpm cs:new:minor "Beta 1: Bindings integration testing"

# Version packages
pnpm cs:version

# Publish with beta tag
pnpm -w changeset publish --tag beta

# Iterate with additional beta changesets...
pnpm cs:new:patch "Beta 2: Bug fixes"
pnpm cs:version
pnpm -w changeset publish --tag beta

# Exit pre-release when ready for stable
pnpm changeset pre exit

# Merge Release PR → stable 0.5.0
```

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

These scripts are defined in root `package.json`:

```json
{
	"scripts": {
		"cs": "changeset",
		"cs:new:patch": "node ./scripts/new-changeset.mjs patch",
		"cs:new:minor": "node ./scripts/new-changeset.mjs minor",
		"cs:new:major": "node ./scripts/new-changeset.mjs major",
		"cs:version": "changeset version",
		"cs:publish": "pnpm -w build && changeset publish"
	}
}
```

### Custom Changeset Script

`scripts/new-changeset.mjs` creates changesets with consistent formatting:

- Pre-filled package selections
- Bump type validation
- Formatted summary template

**Use this instead of raw `pnpm changeset`** for sprint work.

---

## 9️⃣ Enforcement Mechanisms

### Required

✓ **PR Template** - Always use `.github/PULL_REQUEST_TEMPLATE.md`  
✓ **Changeset** - Required unless labelled `no-release`  
✓ **Roadmap link** - Sprint PRs must reference roadmap  
✓ **CI checks** - Lint, typecheck, tests, build must pass

### Automatic

✓ **Version bumps** - Handled by Changesets action  
✓ **CHANGELOG generation** - Auto-generated from changeset summaries  
✓ **npm publishing** - Triggered on Release PR merge  
✓ **Git tags** - Created by Changesets during publish

---

## 🔟 Common Workflows

### Example: Sprint 5 PR

```bash
git checkout -b sprint/5-bindings-interactivity
pnpm cs:new:minor "Sprint 5: Bindings & Interactivity (Block Bindings, Interactivity API, Providers)"
git add .
git commit -m "feat(kernel): add block bindings support"
git push origin sprint/5-bindings-interactivity
```

- Link to roadmap in PR description
    - Roadmap: information/Roadmap PO • v1.0.md § Sprint 5
    - Spec: information/Sprint-5-Bindings.md

- After review/merge → CI creates Release PR
- Merge Release PR → npm publish happens automatically

### Example: Patch/Alignment Sprint

```bash
git checkout -b sprint/5.5-polish
pnpm cs:new:patch "Sprint 5.5: Polish & Performance"
```

Follow same workflow as above.

### Example: Infra Change

```bash
git checkout -b fix/ci-timeout
# Edit .github/workflows/ci.yml
git commit -m "ci: increase E2E test timeout"
```

If PR: add label `no-release`. No changeset needed.

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
