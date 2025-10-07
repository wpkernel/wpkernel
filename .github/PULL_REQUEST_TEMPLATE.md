## Summary

Concise headline. Example: “Sprint 5: Bindings & Interactivity — Block Bindings, Interactivity API, Providers”.

**Sprint:** 5 (Bindings & Interactivity) / 5.5 (Alignment) / Norms (check docs/contributing/roadmap.md for guidance)
**Scope:** actions · policy · resource · data · reporter · ui · cli · e2e

## Links

- Roadmap section: <!-- link to the section in your docs site or repo -->
- Sprint doc / spec: <!-- link to sprint notes/spec for this PR -->
- Related issues: <!-- #123, #456 -->
- Demo/preview (if any): <!-- URL -->

## Why

Problem/use-case. What changes for users (devs)?

## What

Top-level bullets of what’s shipped in this PR.

## How

High-level approach. Note any trade-offs, alternatives considered, or TODOs deferred.

## Testing

How reviewers test locally:

1. …
2. …
   **Expected:** …

### Test Matrix (tick what’s covered)

- [ ] Unit (pnpm test)
- [ ] E2E (pnpm e2e)
- [ ] Types (pnpm typecheck)
- [ ] Docs examples (build/run)
- [ ] WordPress playground / wp-env sanity

## Screenshots / Recordings (if applicable)

Attach visuals for UI-facing changes.

## Breaking Changes

- [ ] None  
       If any, list migration steps with code snippets.

## Affected Packages

Tick any public packages this PR changes functionally.

- [ ] `@geekist/wp-kernel`
- [ ] `@geekist/wp-kernel-ui`
- [ ] `@geekist/wp-kernel-cli`
- [ ] `@geekist/wp-kernel-e2e-utils`

## Release

Choose one and document in CHANGELOG.md files.

- [ ] **patch** — bugfixes / alignment (0.x.1)
- [ ] **minor** — feature sprint (default) (0.x.0)
- [ ] **major** — breaking API (x.0.0)

> Update CHANGELOG.md files in affected packages with summary of changes.
>
> _If infra/docs-only, add label **no-release**._

## Checklist

- [ ] Tests pass (`pnpm test`, where relevant: `pnpm e2e`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Types pass (`pnpm typecheck`, `pnpm typecheck:tests`)
- [ ] CHANGELOG.md updated in affected packages (or PR labelled `no-release`)
- [ ] Docs updated (site/README)
- [ ] Examples updated (if API changed)
