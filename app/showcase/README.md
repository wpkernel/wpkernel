# WP Kernel Showcase Plugin

A demonstration plugin showcasing the WP Kernel framework with a careers/job posting system.

## Overview

This plugin demonstrates how to build a modern WordPress product using WP Kernel, implementing a complete job postings and applications workflow.

## Features Demonstrated

- **Resources**: Typed REST client with caching for Job and Application entities
- **Actions**: Write-path orchestration for job management and application submission
- **Block Bindings**: Data display in editor and front-end
- **Interactivity**: Front-end form handling and filtering
- **Jobs (Background)**: Async resume parsing and email sending
- **Policies**: Permission-based UI gating
- **Events**: Canonical event taxonomy with PHP bridge support

## Project Structure

```
app/showcase/
├── contracts/           # JSON Schema definitions
│   └── job.schema.json  # Job entity schema
├── types/              # Auto-generated TypeScript types
│   └── job.d.ts        # Generated from job.schema.json
├── src/                # Source code
│   ├── resources/      # defineResource() definitions
│   ├── actions/        # defineAction() orchestrators
│   ├── views/          # Block bindings + Interactivity
│   └── admin/          # Admin surfaces
├── includes/           # PHP code
│   └── rest/           # REST API controllers
├── seeds/             # Development seed scripts
└── __tests__/         # Unit tests
```

## JSON Schema & Type Generation

The plugin uses JSON Schema to define entity contracts, which are then used to generate TypeScript types automatically.

### Schema Location

Domain-specific schemas live in `contracts/` (within the showcase plugin, not the framework):

- `contracts/job.schema.json` - Job Posting entity

### Type Generation

TypeScript types are automatically generated from JSON Schema files using `json-schema-to-typescript`.

**Generate types manually:**

```bash
pnpm types:generate
```

**Types are auto-generated during build:**

```bash
pnpm build  # Runs types:generate first
```

### Schema Validation

The schema includes comprehensive validation tests in `__tests__/job-schema.test.ts`:

- ✓ Schema structure validation
- ✓ Required fields enforcement
- ✓ Enum value validation (status, seniority, job_type, etc.)
- ✓ Format validation (dates, slugs, etc.)
- ✓ Type generation verification

**Run schema tests:**

```bash
pnpm test job-schema
```

## Development

### Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install PHP dependencies (WordPress stubs for IDE support)
composer install
```

### PHP Development

The plugin uses WordPress and WP-CLI stubs for IDE support (Intelephense):

- **WordPress Stubs**: Provides type hints for WordPress core functions and classes
- **WP-CLI Stubs**: Provides type hints for WP-CLI commands
- **VSCode Configuration**: `.vscode/settings.json` configures Intelephense to use the stubs

**Note**: After installing composer dependencies, reload your PHP language server (VSCode: `Ctrl+Shift+P` → "PHP: Restart Language Server") to pick up the stubs.

### Build

The showcase plugin uses Vite with `@kucrut/vite-for-wp` to build WordPress-compatible Script Modules.

**Required dependencies:**

The build requires specific peer dependencies for proper WordPress package externalization:

- `rollup-plugin-external-globals@^0.13`
- `vite-plugin-external@^6`

These are already declared in `package.json`. Without them, WordPress packages (wp.data, wp.element, etc.) will be bundled instead of externalized, causing duplicate registries and runtime errors.

**Build output:**

- Bundle size: ~22KB (WordPress packages externalized)
- Format: ESM (WordPress Script Modules)
- Externals: `window.wp.*` globals

```bash
pnpm build  # Generates types + builds JS bundles
```

### Watch Mode

```bash
pnpm dev  # Watch for changes and rebuild
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test job-schema

# Watch mode
pnpm test:watch
```

### Seed Data

Load sample job postings and users:

```bash
pnpm wp:seed
```

## Schema Example

The Job entity schema (`contracts/job.schema.json`) defines:

**Required fields:**

- `id` (integer) - Post ID
- `title` (string) - Job title
- `status` (enum) - `draft`, `publish`, or `closed`
- `created_at` (date-time) - Creation timestamp

**Optional fields:**

- `slug` (string) - URL-friendly identifier
- `description` (string) - Full HTML description
- `department` (string) - Department/team
- `location` (string) - Geographic location
- `seniority` (enum) - Junior, Mid, Senior, Lead, Principal
- `job_type` (enum) - Full-time, Part-time, Contract, Internship, Temporary
- `remote_policy` (enum) - on-site, remote, hybrid
- `salary_min`, `salary_max` (integer) - Salary range in cents
- `apply_deadline` (date-time) - Application deadline
- `updated_at` (date-time) - Last update timestamp

## Generated Types Usage

Once types are generated, import and use them in your code:

```typescript
import type { Job } from '../types/job';

// Fully typed Job entity
const job: Job = {
	id: 123,
	title: 'Senior WordPress Developer',
	status: 'publish',
	seniority: 'Senior',
	created_at: '2025-10-01T12:00:00Z',
	// ... other fields
};
```

## Framework Separation

⚠️ **Important**: This showcase plugin contains **domain-specific code** (job postings). The schemas and types here are examples that demonstrate the framework, not part of the framework itself.

**Framework code** (generic, reusable):

- `packages/kernel/` - Core framework primitives
- `defineResource<T>()` - Generic resource factory
- Error handling, events, transport layer

**Showcase code** (domain-specific demonstration):

- `app/showcase/contracts/` - Job Posting schema
- `app/showcase/src/resources/job.ts` - Uses `defineResource<Job>()`
- REST endpoints, UI components, business logic

## License

EUPL-1.2

## Documentation

For complete framework documentation, see:

- [Product Specification](../../information/Product%20Specification%20PO%20Draft%20%E2%80%A2%20v1.0.md)
- [Sprint 1 Tasks](../../information/sprints/sprint_1_tasks.md)
- [API Reference](../../docs/api/)
