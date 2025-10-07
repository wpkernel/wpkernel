# Development Setup

Complete guide to setting up your development environment for WP Kernel.

## 🚨 TL;DR - Quick Start

**👉 [Runbook](/contributing/runbook)** - Common development tasks and workflows.

For experienced developers who want the critical information fast, read that first. This page has the complete, detailed setup instructions.

## Prerequisites

### Required Software

Install these tools before proceeding:

#### Node.js (v22.20.0 LTS)

Use [nvm](https://github.com/nvm-sh/nvm) for version management:

```bash
# Install nvm (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node 22
nvm install 22.20.0
nvm use 22.20.0
nvm alias default 22.20.0

# Verify
node --version  # Should show v22.20.0
```

#### pnpm (v9.12.3+)

```bash
npm install -g pnpm

# Verify
pnpm --version  # Should show 9.12.3 or later
```

#### Docker Desktop

Download and install from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop).

```bash
# Verify
docker --version  # Should show 20.10+ or later
```

#### Git

```bash
# macOS (via Homebrew)
brew install git

# Verify
git --version
```

## Repository Setup

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/theGeekist/wp-kernel.git
cd wp-kernel

# Install dependencies (this may take a few minutes)
pnpm install
```

### Verify Installation

```bash
# Build all packages
pnpm build

# Run lint
pnpm lint

# Expected output: zero errors
```

## WordPress Environment

WP Kernel uses `@wordpress/env` for local WordPress instances.

### Two Environments

1. **Development** (localhost:8888) - For manual testing
2. **Testing** (localhost:8889) - For E2E tests with fixtures

### Start WordPress

#### Quick Start (Recommended)

Start WordPress with seed data:

```bash
pnpm wp:fresh
```

This command:

1. Starts Docker containers
2. Seeds test users, applications, and jobs
3. Activates the showcase plugin

#### Manual Start

```bash
# Start without seed data
pnpm wp:start

# Seed data separately
pnpm wp:seed
```

### Access WordPress

- **Development Site**: http://localhost:8888
- **Admin Dashboard**: http://localhost:8888/wp-admin
- **Testing Site**: http://localhost:8889
- **Credentials**: `admin` / `password`

### Stop WordPress

```bash
pnpm wp:stop
```

### Reset WordPress

If you need a clean slate:

```bash
# Stop and destroy all data
pnpm wp:destroy

# Start fresh
pnpm wp:fresh
```

## Development Workflow

### Terminal Setup

Open three terminal windows/tabs:

#### Terminal 1: Watch Build

```bash
pnpm dev
```

This watches all packages and rebuilds on file changes.

#### Terminal 2: WordPress

```bash
pnpm wp:start
```

Keep WordPress running for manual testing.

#### Terminal 3: Tests

```bash
# Unit tests (watch mode)
pnpm test --watch

# Or run once
pnpm test

# E2E tests (WordPress must be running)
pnpm e2e
```

### Making Changes

1. **Create a branch**:

    ```bash
    git checkout -b feature/my-feature
    ```

2. **Make changes**: Edit files in `packages/*/src/`

3. **Verify builds**: Watch terminal 1 for build errors

4. **Write tests**: Add tests for new functionality

5. **Run tests**:

    ```bash
    pnpm test        # Unit tests
    pnpm e2e         # E2E tests
    pnpm test:coverage  # With coverage
    ```

6. **Lint**:

    ```bash
    pnpm lint        # Check
    pnpm lint:fix    # Auto-fix
    ```

7. **Update CHANGELOG.md**:

    Add entry to affected packages' CHANGELOG.md:

    ```markdown
    ## 0.x.0 [Unreleased]

    ### Added

    - Custom invalidation support for resources
    ```

8. **Commit**:

    ```bash
    git add .
    git commit -m "feat(resources): add custom invalidation"
    ```

9. **Push and PR**:
    ```bash
    git push origin feature/my-feature
    # Open PR on GitHub
    ```

## Package Structure

```
packages/
├── kernel/              # Core framework
│   ├── src/
│   │   ├── resource/    # Resources
│   │   ├── actions/     # Actions
│   │   ├── events/      # Events
│   │   └── index.ts
│   └── package.json
├── ui/                  # UI components
│   ├── src/
│   └── package.json
├── e2e-utils/           # Test utilities
│   ├── src/
│   └── package.json
└── showcase-plugin/     # Example plugin
    ├── app/             # Application code
    │   ├── resources/
    │   ├── actions/
    │   ├── views/
    │   └── jobs/
    └── includes/        # PHP code
```

## Environment Variables

### CI Flag

Set `CI=true` to run in CI mode (affects Playwright webServer):

```bash
export CI=true
pnpm e2e
```

### Node Version

Ensure you're using Node 22:

```bash
node --version  # Should be v22.20.0
```

If not, use nvm:

```bash
nvm use 22
```

## IDE Setup

### VS Code (Recommended)

Install these extensions:

- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier** (esbenp.prettier-vscode)
- **TypeScript** (ms-vscode.vscode-typescript-next)
- **WordPress Snippets** (wordpresstoolbox.wordpress-toolbox)

### Settings

Create `.vscode/settings.json`:

```json
{
	"editor.formatOnSave": true,
	"editor.defaultFormatter": "esbenp.prettier-vscode",
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": true
	},
	"typescript.tsdk": "node_modules/typescript/lib",
	"eslint.workingDirectories": [{ "pattern": "packages/*" }]
}
```

## Troubleshooting

### Port Conflicts

If ports 8888 or 8889 are already in use:

```bash
# Find what's using the port
lsof -i :8888

# Kill the process
kill -9 <PID>

# Or use different ports (edit .wp-env.json)
```

### Docker Issues

```bash
# Restart Docker Desktop

# Or reset wp-env
pnpm wp:destroy
pnpm wp:fresh
```

### Build Errors

```bash
# Clean and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Test Failures

```bash
# Reset test environment
pnpm wp:seed:reset
pnpm e2e
```

## Next Steps

Now that your environment is set up:

- [Runbook](/contributing/runbook) - Common development tasks
- [Coding Standards](/contributing/standards) - Style guide
- [Testing](/contributing/testing) - Writing tests
- [Pull Requests](/contributing/pull-requests) - Submitting changes
