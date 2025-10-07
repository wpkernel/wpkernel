# Versioning & Back-Compatibility Policy

This document defines WP Kernel's approach to versioning, breaking changes, and deprecations.

---

## Version Numbers

WP Kernel follows [Semantic Versioning 2.0.0](https://semver.org/) with WordPress-specific considerations.

### Format: `MAJOR.MINOR.PATCH`

```
v0.5.2
│ │ └─ PATCH: Bug fixes, performance improvements
│ └─── MINOR: New features, non-breaking additions
└───── MAJOR: Breaking changes, API redesigns
```

### Pre-1.0 Interpretation (Current)

During the `0.x` release series:

- **`0.x.0` (Minor bump)**: New features; **may include breaking changes** in edge cases
- **`0.x.y` (Patch bump)**: Bug fixes, performance improvements, documentation updates
- **Breaking changes are documented** in CHANGELOG with migration guides

**Current Status**: v0.2.0 (Sprints 0-4.5 complete)

### Post-1.0 Interpretation (Future)

After reaching `1.0.0`:

- **`x.0.0` (Major bump)**: Breaking changes only (strict semver)
- **`1.x.0` (Minor bump)**: New features, backward-compatible
- **`1.x.y` (Patch bump)**: Bug fixes, security patches

---

## Stability Guarantees

### What Won't Break (Stable Contracts)

✓ **Event Names**

- System events: `wpk.resource.request`, `wpk.action.complete`, etc.
- Domain event patterns: `{namespace}.{resource}.created`
- No renames without major version bump

✓ **Error Codes**

- `PolicyDenied`, `Transport`, `Server`, `Validation`, `Timeout`, `Developer`
- Codes are stable identifiers across all 0.x and 1.x releases

✓ **Cache Key Patterns**

- `[storeName, operation, ...params]` structure preserved
- Examples: `['job', 'list']`, `['job', 'item', 123]`

✓ **Core API Signatures**

- `defineResource(config)` → Resource
- `defineAction(name, handler, options?)` → Action
- `definePolicy(policies)` → PolicyMap
- `createReporter(options)` → Reporter
- `useKernel(registry)` → Plugin
- `registerKernelStore(name, options)` → Store

✓ **TypeScript Types (Public)**

- Exported types from package roots won't change without major bump
- Example: `KernelError`, `ResourceConfig`, `ActionContext`

### What May Change (Non-Breaking)

⚠️ **Event Payload Additions**

- New **optional** fields may be added to event payloads
- Example: `wpk.action.complete` may gain `{ ...existing, telemetry?: {...} }`
- Your code continues to work; new fields are opt-in

⚠️ **Error Field Additions**

- New optional fields in error `data` or `context`
- Example: `TransportError` may add `retryCount?` field
- Existing error handling continues to work

⚠️ **Internal Implementation**

- Cache strategies, transport middleware, store internals
- If you're using documented public APIs, you're safe
- Deep imports (`@geekist/wp-kernel/src/internal/...`) are not supported

⚠️ **Default Values**

- Sensible defaults may change to improve DX
- Example: default cache TTL, retry attempts
- Explicit configuration always wins

### What Will Break (With Migration Path)

🚨 **Breaking Changes** (Major version only, post-1.0):

- API signature changes (parameter order, required fields)
- Removal of deprecated APIs (with 2-version warning period)
- Behavioral changes that affect existing code

---

## Deprecation Process

WP Kernel provides a clear deprecation path for all API changes.

### Phases

1. **Notice Phase** (Version N)
    - Feature marked as deprecated using `@wordpress/deprecated`
    - Console warning emitted in development mode
    - Documentation updated with migration guide
    - Code example provided showing new pattern

2. **Migration Period** (Versions N+1, N+2)
    - Old API continues to work alongside new API
    - Warnings become more prominent
    - Codemod provided when feasible (e.g., ESLint auto-fix)

3. **Removal** (Version N+3 or next major)
    - Old API removed from codebase
    - Runtime error with helpful message if attempted
    - CHANGELOG clearly documents removal

### Example Timeline

```
v0.3.0 → Notice: "defineResource({ name }) is deprecated, use defineResource({ name, namespace })"
v0.4.0 → Migration: Both syntaxes work; warning persists
v0.5.0 → Migration: Codemod provided; warning includes "Removed in 1.0"
v1.6.0 → Removal: Old syntax throws error with migration link
```

### Deprecation Notices

WP Kernel uses WordPress' own deprecation system:

```typescript
import deprecated from '@wordpress/deprecated';

deprecated('thing.fetch()', {
	since: '0.6.0',
	version: '1.0.0',
	alternative: 'thing.client.fetch()',
	hint: 'See https://theGeekist.github.io/wp-kernel/migration/0.6-to-1.0',
});
```

---

## Migration Support

### Codemods (When Feasible)

For common API changes, we provide automated migration scripts:

```bash
# Example: Migrate from 0.5 → 0.6 API changes
npx @geekist/wp-kernel-codemod migrate-0.6
```

Codemods use [jscodeshift](https://github.com/facebook/jscodeshift) to transform your codebase automatically.

### Migration Guides

Every breaking change includes:

- ✓ Before/after code examples
- ✓ Rationale for the change
- ✓ Step-by-step migration instructions
- ✓ Common pitfalls and solutions

See: [Migration Guides](https://theGeekist.github.io/wp-kernel/migration/)

---

## Pre-1.0 Expectations

**Current Phase**: Active development toward v1.0 (Beta)

### What to Expect

- ✓ **Core primitives are stable**: Resources, Actions, Policies, Events
- ✓ **Event names and error codes won't change**
- ⚠️ **API ergonomics may improve**: We're refining DX based on feedback
- ⚠️ **Edge case behavior may change**: We're hardening error handling and validation

### Pre-1.0 Adoption

WP Kernel is **production-ready for early adopters** who:

- Are comfortable with 0.x semver interpretation
- Can follow CHANGELOG for each release
- Want to influence the framework's direction

**Not yet recommended for**:

- Risk-averse enterprise projects (wait for 1.0)
- Agencies with tight update budgets (wait for 1.0)

---

## Post-1.0 Promises

Once we reach v1.0.0:

### Major Version Cadence

- **1.0 → 2.0**: ~18-24 months (breaking changes batched)
- **LTS Support**: Previous major supported for 12 months after new major

### Upgrade Path

- Every major version includes comprehensive migration guide
- Automated codemods provided for 80%+ of changes
- Deprecation warnings start 2 minor versions before removal

### WordPress Core Alignment

- We track WordPress Core LTS versions
- Minimum WP version may increase at major boundaries
- Example: WP Kernel 2.0 may require WordPress 6.10+

---

## Versioning for Packages

WP Kernel is a monorepo with multiple packages. They share version numbers:

| Package                        | Current Version | Sync'd with |
| ------------------------------ | --------------- | ----------- |
| `@geekist/wp-kernel`           | 0.3.0           | Monorepo    |
| `@geekist/wp-kernel-ui`        | 0.3.0           | Monorepo    |
| `@geekist/wp-kernel-cli`       | 0.3.0           | Monorepo    |
| `@geekist/wp-kernel-e2e-utils` | 0.3.0           | Monorepo    |

**Why synchronized versions?**

- Simplifies dependency management
- Clearer communication (one CHANGELOG)
- Avoids peer dependency hell

Packages are tested together and released together.

---

## Feedback & Communication

### Report Issues

Found a breaking change not documented?

- [Open an issue](https://github.com/theGeekist/wp-kernel/issues/new?template=breaking-change.md)
- Tag it `breaking-change`

### Stay Informed

- **CHANGELOG**: Every release documents all changes
- **GitHub Releases**: Subscribe to [releases](https://github.com/theGeekist/wp-kernel/releases)
- **Roadmap**: Track progress at the [Roadmap](https://thegeekist.github.io/wp-kernel/contributing/roadmap)

### Influence the API

We're actively seeking feedback on:

- API ergonomics (too verbose? too magical?)
- Missing features for your use case
- DX friction points

**[Join the discussion →](https://github.com/theGeekist/wp-kernel/discussions)**

---

## Summary

| Aspect             | Pre-1.0 (Now)      | Post-1.0 (Future)  |
| ------------------ | ------------------ | ------------------ |
| Breaking changes   | Possible in minors | Only in majors     |
| Deprecation period | 2 versions minimum | 2 versions minimum |
| Event names        | Stable             | Stable             |
| Error codes        | Stable             | Stable             |
| Cache patterns     | Stable             | Stable             |
| Codemods           | When feasible      | For all majors     |
| LTS support        | N/A                | 12 months          |

**Current recommendation**: Adopt now if you're comfortable with 0.x semver and want to shape the framework. Wait for 1.0 if you need absolute stability.

---

**Last Updated**: October 6, 2025 (v0.2.0 release)  
**Next Review**: v1.0.0 release (planned Q4 2025)
