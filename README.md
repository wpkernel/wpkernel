# WPKernel

> A Rails-like, opinionated framework for building modern WordPress products. Built on WordPress Core primitives: Script Modules, Block Bindings, Interactivity API, @wordpress/data.

**[Read the documentation](https://wpkernel.dev/)** to get started and understand the philosophy.

**Using wp-env (Docker)?** Visit [http://localhost:8888/wp-admin](http://localhost:8888/wp-admin) - Login: `admin` / `password`

**Using Playground?** Opens automatically in your browser

**📖 Read [DEVELOPMENT.md](DEVELOPMENT.md)** for the complete contributor workflow, testing infrastructure, and troubleshooting.

The JavaScript is the source of truth and PHP is a thin contract.

[![CI Status](https://github.com/wpkernel/wpkernel/workflows/CI/badge.svg)](https://github.com/wpkernel/wpkernel/actions)
[![License](https://img.shields.io/badge/license-EUPL--1.2-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-20.x%20LTS+-brightgreen.svg)](.nvmrc)
[![Documentation](https://img.shields.io/badge/docs-VitePress-42b883.svg)](https://wpkernel.dev/)

---

## 🎯 What is WPKernel?

WPKernel provides a **Golden Path** for WordPress development in 2025+:

- **Actions-first**: UI never writes directly to transport (enforced by lint + runtime)
- **Resources**: Typed REST contracts → client + store + cache keys
- **Views**: Core Blocks + Bindings + Interactivity (no custom blocks needed)
- **Jobs**: Background work with polling and status tracking
- **Events**: Canonical taxonomy with PHP bridge for extensibility
- **Single PHP contract**: REST + capabilities + optional server bindings

Built on WordPress Core primitives: Script Modules, Block Bindings, Interactivity API, @wordpress/data.

---

## 🚀 Quick Start

### For Plugin Developers (Using WPKernel)

To **build your WordPress plugin** with WPKernel:

**Requirements:**

- **Node.js**: 20.x LTS or higher ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **pnpm**: 9.x or higher (`npm install -g pnpm`) or npm
- **WordPress**: 6.7+ (required for [Script Modules API](https://make.wordpress.org/core/2024/03/04/script-modules-in-6-5/) - core to the framework architecture)

> **Why WordPress 6.7+?** WPKernel builds on WordPress Core primitives (Script Modules, Block Bindings, Interactivity API). Script Modules enable native ESM support, which is fundamental to the framework's design.

#### Option 1: Scaffold a New Plugin (Recommended)

The fastest way to get started is using the scaffolding command:

```bash
# Create a new plugin with the CLI
npm create @wpkernel/wpk my-plugin
cd my-plugin

# Start development
npm start
```

This creates a complete WPKernel plugin with pre-configured `wpk.config.ts`, TypeScript setup, example resources and actions, and a development server ready to go.

**Core Workflow:**

```bash
# 1. Edit wpk.config.ts to define resources, actions, capabilities
# 2. Generate PHP/TS code
wpk generate

# 3. Apply changes to existing code (with Git safety)
wpk apply

# 4. Validate everything is correct
wpk doctor
```

**Available Commands After Creation:**

```bash
wpk generate    # Generate PHP/TS from wpk.config.*
wpk doctor      # Check project health and dependencies
wpk start       # Start development server
wpk init        # Initialize WPKernel in existing project
wpk apply       # Apply generated code patches
```

> 💡 **Tip**: Add these as scripts in your `package.json` for convenience:
>
> ```json
> {
> 	"scripts": {
> 		"generate": "wpk generate",
> 		"doctor": "wpk doctor",
> 		"dev": "wpk start"
> 	}
> }
> ```

#### Option 2: Manual Installation

If you prefer to set up manually or add WPKernel to an existing project:

```bash
# In your plugin directory
npm install @wpkernel/core
# or
pnpm add @wpkernel/core

# Add the CLI as dev dependency
npm install -D @wpkernel/cli
```

**Bootstrap the runtime:**

```ts
import { configureWPKernel } from '@wpkernel/core';
import { attachUIBindings } from '@wpkernel/ui';

const wpk = configureWPKernel({
	registry: window.wp.data,
	namespace: 'my-plugin',
	ui: { attach: attachUIBindings },
});

wpk.emit('my-plugin.ready', { timestamp: Date.now() });
```

Mount the UI runtime so React hooks can subscribe to resources and actions through the wpk event bus:

```tsx
import { createRoot } from 'react-dom/client';
import { WPKernelUIProvider } from '@wpkernel/ui';

const runtime = wpk.getUIRuntime();

createRoot(document.getElementById('app')!).render(
	<WPKernelUIProvider runtime={runtime}>
		<App />
	</WPKernelUIProvider>
);
```

`configureWPKernel()` installs the registry middleware and returns a shared instance so you can access the namespace, reporter, cache helpers, and the typed `wpkernel.events` bus.

> ℹ️ Import lifecycle phases, namespace constants, and CLI exit codes from `@wpkernel/core/contracts` to stay aligned with the framework's canonical contract.

**See the [Getting Started Guide](https://wpkernel.dev/getting-started/)** for creating your first WPKernel plugin.

---

### For Contributors (Working on WPKernel Itself)

To **contribute to the WPKernel framework** or run the showcase demo locally:

**Requirements:**

- All of the above, plus:
- **Docker** (for wp-env) OR **WordPress Playground** (WASM, no Docker needed)
- **PHP**: 8.1+ (only if using wp-env/Docker)

**Setup:**

```bash
# Clone this repository
git clone https://github.com/wpkernel/wpkernel.git
cd wp-kernel

# Use correct Node version
nvm use

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Option 1: Start WordPress with wp-env (Docker required)
pnpm wp:fresh  # Starts dev:8888, tests:8889 + seeds test data

# Option 2: Start WordPress Playground (no Docker)
pnpm playground  # Launches WASM-based WordPress in browser
```

**Using wp-env (Docker)?** Visit [http://localhost:8888/wp-admin](http://localhost:8888/wp-admin) - Login: `admin` / `password`

**Using Playground?** Opens automatically in your browser

**� Read [DEVELOPMENT.md](DEVELOPMENT.md)** for the complete contributor workflow, testing infrastructure, and troubleshooting.

**[📖 Read the Development Guide](DEVELOPMENT.md)** - Essential workflow, testing infrastructure, and troubleshooting.

---

## � Compatibility Matrix

### Supported Environments

| Component     | Minimum Version | Recommended      | Notes                                           |
| ------------- | --------------- | ---------------- | ----------------------------------------------- |
| **WordPress** | 6.7+            | Latest stable    | Script Modules API required                     |
| **Node.js**   | 20.x LTS        | 22.x LTS         | Vite 7 constraint                               |
| **pnpm**      | 9.0+            | Latest           | Monorepo workspace manager                      |
| **PHP**       | 8.1+            | 8.2+             | wp-env/Docker only, not a framework requirement |
| **Browsers**  | ES2020+         | Modern evergreen | Native ESM, BroadcastChannel API                |

### WordPress Version Support

✓ **6.7+**: Full support (Script Modules, Block Bindings, Interactivity API)  
✗ **< 6.7**: Not supported (missing required features)

### CI/CD Test Matrix

We test against multiple combinations to ensure compatibility:

| WordPress | PHP | Node   | Status                                                                                                                                            |
| --------- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.7.4     | 8.1 | 20 LTS | [![CI](https://img.shields.io/github/actions/workflow/status/wpkernel/wpkernel/ci.yml?branch=main)](https://github.com/wpkernel/wpkernel/actions) |
| 6.7.4     | 8.2 | 22 LTS | [![CI](https://img.shields.io/github/actions/workflow/status/wpkernel/wpkernel/ci.yml?branch=main)](https://github.com/wpkernel/wpkernel/actions) |
| Latest    | 8.3 | Latest | [![CI](https://img.shields.io/github/actions/workflow/status/wpkernel/wpkernel/ci.yml?branch=main)](https://github.com/wpkernel/wpkernel/actions) |

### Development Environment Options

| Option                   | Requirements     | Best For                               |
| ------------------------ | ---------------- | -------------------------------------- |
| **wp-env**               | Docker, PHP 8.1+ | Contributors, full WP testing          |
| **WordPress Playground** | None (WASM)      | Quick demos, no Docker                 |
| **npm/pnpm only**        | Node 20+         | Plugin developers (no local WP needed) |

---

## �📦 Import Patterns

WPKernel supports three flexible import patterns. Choose what fits your project:

### 1. Scoped Imports (Recommended)

Tree-shakeable, clear module boundaries. Best for production apps.

```typescript
import { fetch } from '@wpkernel/core/http';
import { defineResource, invalidate } from '@wpkernel/core/resource';
import { WPKernelError } from '@wpkernel/core/error';
```

### 2. Flat Imports

Quick and convenient. Good for prototyping or when you need multiple exports.

```typescript
import { fetch, defineResource, WPKernelError } from '@wpkernel/core';
```

Both patterns work identically - pick what you prefer. Submodule imports provide better tree-shaking, while flat imports offer convenience.

---

## 📦 Packages

| Package                                   | Description                                                       | Version |
| ----------------------------------------- | ----------------------------------------------------------------- | ------- |
| [@wpkernel/pipeline](packages/pipeline)   | Standalone typed dataflow DAG evaluator; usable outside WordPress | 2.0.0   |
| [@wpkernel/core](packages/core)           | Core framework (Resources, Actions, Events, Jobs)                 | 0.1.0   |
| [@wpkernel/ui](packages/ui)               | Accessible UI components (wraps @wordpress/components)            | 0.1.0   |
| [@wpkernel/cli](packages/cli)             | Scaffolding CLI (generators)                                      | 0.1.0   |
| [@wpkernel/e2e-utils](packages/e2e-utils) | Playwright test utilities _(optional - for E2E testing)_          | 0.1.0   |

---

## 🛠️ Contributor Commands

> **Note**: These commands are for contributing to WPKernel itself. If you're building a plugin with WPKernel, see the [Getting Started Guide](https://wpkernel.dev/getting-started/).

```bash
# Build & Watch
pnpm dev            # Watch mode for all packages
pnpm build          # Production build
pnpm clean          # Clean build artifacts

# WordPress Test Environment
pnpm wp:start       # Start wp-env (Docker required)
pnpm wp:stop        # Stop wp-env
pnpm wp:seed        # Seed test data
pnpm wp:fresh       # Start + seed in one command
pnpm playground     # Launch WordPress Playground (WASM, no Docker)

# Testing (for framework contributors)
pnpm test           # Unit tests (Jest)
pnpm e2e            # E2E tests (Playwright - requires wp-env or Playground)
pnpm test:watch     # Watch mode for unit tests
pnpm typecheck:tests # Type-check shared `.test-support.ts` helpers across packages

# Code Quality
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm typecheck      # TypeScript check
```

Shared testing helpers live under `@wpkernel/test-utils/wp` (WordPress globals) and `@wpkernel/test-utils/integration` (workspace scaffolding), with package-level `*.test-support.ts` barrels documented in each package README. See `tests/TEST_PATTERNS.md` for canonical setup, teardown, and global stubbing guidance.

---

## 📚 Documentation

**📖 [Official Documentation](https://wpkernel.dev/)** - Complete guide with 24 pages

### Quick Links

- **[Getting Started](https://wpkernel.dev/getting-started/)** - Installation and quick start tutorial
- **[Core Concepts](https://wpkernel.dev/guide/)** - Resources, Actions, Events, Bindings, Interactivity, Jobs
- **[API Reference](https://wpkernel.dev/api/)** - Type definitions and interfaces
- **[Contributing Guide](https://wpkernel.dev/contributing/)** - Development workflow and standards
- **[Roadmap](https://wpkernel.dev/contributing/roadmap)** - Project progress and upcoming features

### Developer Resources

- **[Foreword](information/Foreword.md)** - Why WPKernel exists, mental model
- **[Product Specification](information/Product%20Specification%20PO%20•%20v1.0.md)** - Complete API contracts and guarantees
- **[Event Taxonomy](information/Event%20Taxonomy%20Quick%20Reference.md)** - All events and payloads

---

## 🏗️ Architecture at a Glance

```
┌─────────────┐
│ UI/View     │ (Blocks + Bindings + Interactivity)
└──────┬──────┘
       │ triggers
┌──────▼──────┐
│ Action      │ (Orchestration: validates, calls resource, emits events)
└──────┬──────┘
       │ calls
┌──────▼──────┐
│ Resource    │ (Typed REST client + @wordpress/data store)
└──────┬──────┘
       │ HTTP
┌──────▼──────┐
│ WordPress   │ (REST API + capabilities + CPTs)
└─────────────┘
       ▲
       │ listens (optional)
┌──────┴──────┐
│ PHP Bridge  │ (Mirrors selected JS events for legacy/integrations)
└─────────────┘
```

**Read path**: View → Bindings → Store selectors  
**Write path**: View → Action → Resource → Events + cache invalidation

---

## 🎓 Example: Create a Resource

```typescript
// app/resources/Thing.ts
import { defineResource } from '@wpkernel/core/resource';

export const thing = defineResource<Thing>({
	name: 'thing', // Namespace auto-detected from plugin context
	routes: {
		list: { path: '/acme-plugin/v1/things', method: 'GET' },
		get: { path: '/acme-plugin/v1/things/:id', method: 'GET' },
		create: { path: '/acme-plugin/v1/things', method: 'POST' },
	},
	schema: import('../../contracts/thing.schema.json'),
	cacheKeys: {
		list: () => ['thing', 'list'],
		get: (id) => ['thing', 'get', id],
	},
});
```

This gives you:

- ✓ Typed client methods (`thing.fetchList()`, `thing.fetch()`, `thing.create()`)
- ✓ @wordpress/data store with selectors
- ✓ Automatic cache management
- ✓ Request/response events (using your plugin's namespace automatically)

**See [Product Spec § 4.1](information/Product%20Specification%20PO%20Draft%20•%20v1.0.md#41-resources-model--client) for details.**

---

## 📋 Project Status

WPKernel is in **active development** progressing toward v1.0. Core primitives (Resources, Actions, Data Integration, Reporting) are complete and stable.

**See the [Roadmap](https://wpkernel.dev/contributing/roadmap)** for detailed progress, completed features, and upcoming work.

---

## 🤝 Contributing

We welcome contributions! Please read our **[Contributing Guide](https://wpkernel.dev/contributing/)** before submitting PRs.

**Quick contribution flow**:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `pnpm lint && pnpm test && pnpm e2e`
5. Commit using conventional commits
6. Update CHANGELOG.md in affected packages
7. Push and open a PR

**Development Setup**:

```bash
pnpm install        # Install dependencies
pnpm build          # Build all packages
pnpm wp:fresh       # Start WordPress + seed data
pnpm test           # Run unit tests
pnpm e2e            # Run E2E tests
```

---

## 📄 License

### Framework: EUPL-1.2

The WPKernel framework (packages: `@wpkernel/core`, `@wpkernel/ui`, `@wpkernel/cli`, `@wpkernel/e2e-utils`) is licensed under **EUPL-1.2** (European Union Public License v1.2).

**This means you CAN**:
✓ Build commercial plugins and themes  
✓ Build SaaS products  
✓ Keep your application code proprietary  
✓ Sell products built with WPKernel

**You only need to share**:

- Modifications to the framework itself (if you distribute them)

### Showcase App: GPL-2.0-or-later

The showcase WordPress plugin (`examples/showcase`) is licensed under **GPL-2.0-or-later** to comply with WordPress.org requirements. This is example/reference code meant to demonstrate framework usage.

### 📖 Full Licensing Guide

For comprehensive information about:

- Building commercial products with WPKernel
- WordPress.org plugin publishing
- SaaS and premium version patterns
- Frequently asked questions

**Read the complete guide**: [LICENSING.md](LICENSING.md)

**For Contributors**: By contributing, you agree to license your contributions under EUPL-1.2 while retaining copyright. See [.github/CONTRIBUTOR_LICENSE.md](.github/CONTRIBUTOR_LICENSE.md) for details.

---

## 🙏 Acknowledgments

Built on the shoulders of giants:

- **WordPress Core Team** - Gutenberg, Script Modules, Interactivity API
- **@wordpress packages** - The foundation we build upon
- **Rails** - Inspiration for conventions and the Golden Path philosophy

---

## 🔗 Links

- **[Documentation](https://wpkernel.dev/)** - Official docs site
- **[GitHub Repository](https://github.com/wpkernel/wpkernel)** - Source code
- **[Issues](https://github.com/wpkernel/wpkernel/issues)** - Bug reports and feature requests
- **[Discussions](https://github.com/wpkernel/wpkernel/discussions)** - Community Q&A

---

<br>
<br>
<p align="center">
  <sub>
    Proudly brought to you by 
    <a href="https://github.com/theGeekist" target="_blank">@theGeekist</a> and <a href="https://github.com/pipewrk" target="_blank">@pipewrk</a>
  </sub>
</p>
