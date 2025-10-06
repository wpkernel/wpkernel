# Installation

This guide covers installing WP Kernel for **plugin development** or **contributing to the framework**.

---

## Compatibility Requirements

### Minimum Versions

| Component     | Plugin Developers | Framework Contributors |
| ------------- | ----------------- | ---------------------- |
| **WordPress** | 6.8+              | 6.8+                   |
| **Node.js**   | 20.x LTS+         | 20.x LTS+              |
| **pnpm**      | 9.0+              | 9.0+                   |
| **PHP**       | N/A               | 8.1+ (wp-env only)     |
| **Docker**    | N/A               | Optional (wp-env)      |

> **Why WordPress 6.8+?** WP Kernel relies on the [Script Modules API](https://make.wordpress.org/core/2024/03/04/script-modules-in-6-5/), which provides native ESM support. This is fundamental to the framework's architecture.

> **Why Node 20+?** Our build system uses [Vite 7](https://vitejs.dev/), which requires Node 18+ as a minimum. We recommend Node 20 LTS for long-term stability (Node 22 LTS also supported).

### Browser Support

Modern evergreen browsers with:

- ✓ ES2020+ support
- ✓ Native ESM (`import`/`export`)
- ✓ BroadcastChannel API (for cross-tab events)

Tested on: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## For Plugin Developers

To use WP Kernel in your WordPress plugin:

**Requirements:**

- Node.js 20.x LTS+ ([nvm recommended](https://github.com/nvm-sh/nvm))
- pnpm 9+ or npm
- WordPress 6.8+

**Install:**

```bash
# In your plugin directory
npm install @geekist/wp-kernel
# or
pnpm add @geekist/wp-kernel
```

See the [Quick Start guide](/getting-started/quick-start) to build your first feature.

---

## For Framework Contributors

To contribute to WP Kernel itself or run the showcase plugin:

### Prerequisites

- **Node.js**: 20.x LTS+ ([nvm recommended](https://github.com/nvm-sh/nvm))
- **pnpm**: 9+ (`npm install -g pnpm`)
- **Docker**: For wp-env ([Docker Desktop](https://www.docker.com/products/docker-desktop)) OR WordPress Playground (no Docker)
- **Git**: For version control

### Verify Prerequisites

```bash
node --version  # Should show v20.x or higher
pnpm --version  # Should show 9.x or higher
docker --version # Should show Docker 20.10+ (if using wp-env)
```

## Clone the Repository

```bash
git clone https://github.com/theGeekist/wp-kernel.git
cd wp-kernel
```

## Install Dependencies

WP Kernel uses a pnpm workspace monorepo:

```bash
pnpm install
```

This installs dependencies for:

- Core packages (`@geekist/wp-kernel`, `@geekist/wp-kernel-ui`)
- E2E testing utilities
- Showcase plugin
- Development tooling

## Start WordPress Environment

WP Kernel includes two WordPress test environments:

- **Development** (localhost:8888) - For manual testing
- **Testing** (localhost:8889) - For E2E tests with clean fixtures

### Quick Start (Recommended)

Start WordPress with seed data:

```bash
pnpm wp:fresh
```

This command:

1. Starts Docker containers (wp-env)
2. Seeds test data (users, applications, jobs)
3. Activates the showcase plugin

### Access WordPress

- **Development Site**: http://localhost:8888
- **Admin Dashboard**: http://localhost:8888/wp-admin
- **Default Credentials**: `admin` / `password`

## Build Packages

Build all packages in watch mode:

```bash
pnpm dev
```

Or build once for production:

```bash
pnpm build
```

## Run Tests

### Unit Tests

```bash
pnpm test
```

With coverage:

```bash
pnpm test:coverage
```

### E2E Tests

Make sure WordPress is running first (`pnpm wp:start`), then:

```bash
pnpm e2e
```

E2E tests run against localhost:8889 (testing environment).

## Verify Installation

After installation, verify everything works:

1. **Build succeeds**: `pnpm build` (should complete without errors)
2. **Lint passes**: `pnpm lint` (should show zero errors)
3. **Tests pass**: `pnpm test` (should show all tests passing)
4. **WordPress loads**: Visit http://localhost:8888
5. **Showcase plugin active**: Check wp-admin → Plugins

## Development Workflow

Typical development workflow:

```bash
# Terminal 1: Watch build
pnpm dev

# Terminal 2: WordPress environment
pnpm wp:start

# Terminal 3: Run tests as you code
pnpm test --watch
```

## Alternative: WordPress Playground

For quick demos without Docker:

```bash
pnpm playground
```

This launches WordPress in a WebAssembly environment (no installation required).

## Troubleshooting

### Port Conflicts

If ports 8888 or 8889 are in use:

```bash
# Stop wp-env
pnpm wp:stop

# Check what's using the port
lsof -i :8888
```

### Docker Issues

```bash
# Reset wp-env completely
pnpm wp:destroy
pnpm wp:fresh
```

### Build Errors

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Seed Data Not Loading

```bash
# Re-seed manually
pnpm wp:seed
```

## Next Steps

Now that your environment is set up:

- [Quick Start Guide](/getting-started/quick-start) - Build your first feature
- [Development Runbook](/contributing/runbook) - Common development tasks
- [Core Concepts](/guide/) - Understand the framework architecture
