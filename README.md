# WP Kernel

> A Rails-like, opinionated framework for building modern WordPress products. Built on WordPress Core primitives: Script Modules, Block Bindings, Interactivity API, @wordpress/data.

**[Read the documentation](https://theGeekist.github.io/wp-kernel/)** to get started and understand the philosophy.

**Using wp-env (Docker)?** Visit [http://localhost:8888/wp-admin](http://localhost:8888/wp-admin) - Login: `admin` / `password`

**Using Playground?** Opens automatically in your browser

**📖 Read [DEVELOPMENT.md](DEVELOPMENT.md)** for the complete contributor workflow, testing infrastructure, and troubleshooting.

The JavaScript is the source of truth and PHP is a thin contract.

[![CI Status](https://github.com/theGeekist/wp-kernel/workflows/CI/badge.svg)](https://github.com/theGeekist/wp-kernel/actions)
[![License](https://img.shields.io/badge/license-EUPL--1.2-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-20.x%20LTS+-brightgreen.svg)](.nvmrc)
[![Documentation](https://img.shields.io/badge/docs-VitePress-42b883.svg)](https://theGeekist.github.io/wp-kernel/)

---

## 🎯 What is WP Kernel?

WP Kernel provides a **Golden Path** for WordPress development in 2025+:

- **Actions-first**: UI never writes directly to transport (enforced by lint + runtime)
- **Resources**: Typed REST contracts → client + store + cache keys
- **Views**: Core Blocks + Bindings + Interactivity (no custom blocks needed)
- **Jobs**: Background work with polling and status tracking
- **Events**: Canonical taxonomy with PHP bridge for extensibility
- **Single PHP contract**: REST + capabilities + optional server bindings

Built on WordPress Core primitives: Script Modules, Block Bindings, Interactivity API, @wordpress/data.

---

## 🚀 Quick Start

### For Plugin Developers (Using WP Kernel)

To **build your WordPress plugin** with WP Kernel:

- **Node.js**: 20.x LTS or higher ([nvm](https://github.com/nvm-sh/nvm) recommended)
- **pnpm**: 9.x or higher (`npm install -g pnpm`) or npm
- **WordPress**: 6.8+ (required for [Script Modules API](https://make.wordpress.org/core/2024/03/04/script-modules-in-6-5/) - core to the framework architecture)

> **Why WordPress 6.8+?** WP Kernel builds on WordPress Core primitives (Script Modules, Block Bindings, Interactivity API). Script Modules enable native ESM support, which is fundamental to the framework's design.

**Installation:**

```bash
# In your plugin directory
npm install @geekist/wp-kernel
# or
pnpm add @geekist/wp-kernel
```

**See the [Getting Started Guide](https://theGeekist.github.io/wp-kernel/getting-started/)** for creating your first WP Kernel plugin.

---

### For Contributors (Working on WP Kernel Itself)

To **contribute to the WP Kernel framework** or run the showcase demo locally:

**Requirements:**

- All of the above, plus:
- **Docker** (for wp-env) OR **WordPress Playground** (WASM, no Docker needed)
- **PHP**: 8.1+ (only if using wp-env/Docker)

**Setup:**

```bash
# Clone this repository
git clone https://github.com/theGeekist/wp-kernel.git
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
| **WordPress** | 6.8+            | Latest stable    | Script Modules API required                     |
| **Node.js**   | 20.x LTS        | 22.x LTS         | Vite 7 constraint                               |
| **pnpm**      | 9.0+            | Latest           | Monorepo workspace manager                      |
| **PHP**       | 8.1+            | 8.2+             | wp-env/Docker only, not a framework requirement |
| **Browsers**  | ES2020+         | Modern evergreen | Native ESM, BroadcastChannel API                |

### WordPress Version Support

✓ **6.8+**: Full support (Script Modules, Block Bindings, Interactivity API)  
⚠️ **6.5-6.7**: Not supported (missing Script Modules API)  
✗ **< 6.5**: Not supported

### CI/CD Test Matrix

We test against multiple combinations to ensure compatibility:

| WordPress | PHP | Node   | Status                                                                                                                                                  |
| --------- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.8       | 8.1 | 20 LTS | [![CI](https://img.shields.io/github/actions/workflow/status/theGeekist/wp-kernel/ci.yml?branch=main)](https://github.com/theGeekist/wp-kernel/actions) |
| 6.8       | 8.2 | 22 LTS | [![CI](https://img.shields.io/github/actions/workflow/status/theGeekist/wp-kernel/ci.yml?branch=main)](https://github.com/theGeekist/wp-kernel/actions) |
| Latest    | 8.3 | Latest | [![CI](https://img.shields.io/github/actions/workflow/status/theGeekist/wp-kernel/ci.yml?branch=main)](https://github.com/theGeekist/wp-kernel/actions) |

### Development Environment Options

| Option                   | Requirements     | Best For                               |
| ------------------------ | ---------------- | -------------------------------------- |
| **wp-env**               | Docker, PHP 8.1+ | Contributors, full WP testing          |
| **WordPress Playground** | None (WASM)      | Quick demos, no Docker                 |
| **npm/pnpm only**        | Node 20+         | Plugin developers (no local WP needed) |

---

## �📦 Import Patterns

WP Kernel supports three flexible import patterns. Choose what fits your project:

### 1. Scoped Imports (Recommended)

Tree-shakeable, clear module boundaries. Best for production apps.

```typescript
import { fetch } from '@geekist/wp-kernel/http';
import { defineResource, invalidate } from '@geekist/wp-kernel/resource';
import { KernelError } from '@geekist/wp-kernel/error';
```

### 2. Namespace Imports

Organized by module. Good for mid-sized projects.

```typescript
import { http, resource, error } from '@geekist/wp-kernel';

await http.fetch({ path: '/wpk/v1/things' });
const thing = resource.defineResource({ name: 'thing', routes: {...} });
throw new error.KernelError('ValidationError', {...});
```

### 3. Flat Imports

Quick and simple. Good for prototyping.

```typescript
import { fetch, defineResource, KernelError } from '@geekist/wp-kernel';
```

All patterns work identically - pick what you prefer. The framework doesn't care.

---

## 📦 Packages

| Package                                            | Description                                              | Version |
| -------------------------------------------------- | -------------------------------------------------------- | ------- |
| [@geekist/wp-kernel](packages/kernel)              | Core framework (Resources, Actions, Events, Jobs)        | 0.1.0   |
| [@geekist/wp-kernel-ui](packages/ui)               | Accessible UI components (wraps @wordpress/components)   | 0.1.0   |
| [@geekist/wp-kernel-cli](packages/cli)             | Scaffolding CLI (generators)                             | 0.1.0   |
| [@geekist/wp-kernel-e2e-utils](packages/e2e-utils) | Playwright test utilities _(optional - for E2E testing)_ | 0.1.0   |

---

## 🛠️ Contributor Commands

> **Note**: These commands are for contributing to WP Kernel itself. If you're building a plugin with WP Kernel, see the [Getting Started Guide](https://theGeekist.github.io/wp-kernel/getting-started/).

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

# Code Quality
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm typecheck      # TypeScript check
```

---

## 📚 Documentation

**📖 [Official Documentation](https://theGeekist.github.io/wp-kernel/)** - Complete guide with 24 pages

### Quick Links

- **[Getting Started](https://theGeekist.github.io/wp-kernel/getting-started/)** - Installation and quick start tutorial
- **[Core Concepts](https://theGeekist.github.io/wp-kernel/guide/)** - Resources, Actions, Events, Bindings, Interactivity, Jobs
- **[API Reference](https://theGeekist.github.io/wp-kernel/api/)** - Type definitions and interfaces
- **[Contributing Guide](https://theGeekist.github.io/wp-kernel/contributing/)** - Development workflow and standards
- **[Roadmap](https://thegeekist.github.io/wp-kernel/contributing/roadmap)** - Project progress and upcoming features

### Developer Resources

- **[Foreword](information/Foreword.md)** - Why WP Kernel exists, mental model
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
import { defineResource } from '@geekist/wp-kernel/resource';

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

WP Kernel is in **active development** progressing toward v1.0. Core primitives (Resources, Actions, Data Integration, Reporting) are complete and stable.

**See the [Roadmap](https://thegeekist.github.io/wp-kernel/contributing/roadmap)** for detailed progress, completed features, and upcoming work.

---

## 🤝 Contributing

We welcome contributions! Please read our **[Contributing Guide](https://theGeekist.github.io/wp-kernel/contributing/)** before submitting PRs.

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

The WP Kernel framework (packages: `@geekist/wp-kernel`, `@geekist/wp-kernel-ui`, `@geekist/wp-kernel-cli`, `@geekist/wp-kernel-e2e-utils`) is licensed under **EUPL-1.2** (European Union Public License v1.2).

**This means you CAN**:
✓ Build commercial plugins and themes  
✓ Build SaaS products  
✓ Keep your application code proprietary  
✓ Sell products built with WP Kernel

**You only need to share**:

- Modifications to the framework itself (if you distribute them)

### Showcase App: GPL-2.0-or-later

The showcase WordPress plugin (`app/showcase`) is licensed under **GPL-2.0-or-later** to comply with WordPress.org requirements. This is example/reference code meant to demonstrate framework usage.

### 📖 Full Licensing Guide

For comprehensive information about:

- Building commercial products with WP Kernel
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

- **[Documentation](https://theGeekist.github.io/wp-kernel/)** - Official docs site
- **[GitHub Repository](https://github.com/theGeekist/wp-kernel)** - Source code
- **[Issues](https://github.com/theGeekist/wp-kernel/issues)** - Bug reports and feature requests
- **[Discussions](https://github.com/theGeekist/wp-kernel/discussions)** - Community Q&A

---

<br>
<br>
<p align="center">
  <sub>
    Proudly brought to you by 
    <a href="https://github.com/theGeekist" target="_blank">@theGeekist</a> and <a href="https://github.com/pipewrk" target="_blank">@pipewrk</a>
  </sub>
</p>
