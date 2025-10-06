# Development Runbook

Common tasks and commands for WP Kernel development.

> **📖 For release workflow and changesets**, see `RELEASING.md` in project root.  
> **For PR flow and sprint process**, see [Pull Requests](./pull-requests.md).

---

## WordPress Environment

### Start WordPress

```bash
# Start with seed data (recommended)
pnpm wp:fresh

# Or start without seed
pnpm wp:start
```

### Stop WordPress

```bash
pnpm wp:stop
```

### Restart WordPress

```bash
pnpm wp:stop && pnpm wp:start
```

### Reset WordPress (Clean Slate)

```bash
# Destroy all data and start fresh
pnpm wp:destroy
pnpm wp:fresh
```

### Access WordPress

- **Development**: http://localhost:8888
- **Admin**: http://localhost:8888/wp-admin
- **Testing**: http://localhost:8889
- **Credentials**: `admin` / `password`

## Seed Data Management

### Seed All Fixtures

```bash
pnpm wp:seed
```

Seeds:

- Test users (admin, editor, author, contributor, subscriber)
- Sample applications (pending, approved, rejected)
- Sample jobs (completed, in-progress, failed)

### Reset Seed Data

```bash
pnpm wp:seed:reset
```

This deletes existing seed data before re-seeding.

### Manual Seeding

```bash
# Seed only users
pnpm wp:cli user create editor editor@example.com --role=editor

# Seed custom data
pnpm wp:cli post create --post_type=application --post_title="Test Application"
```

## Building Packages

### Watch Mode (Development)

```bash
pnpm dev
```

Watches all packages and rebuilds on file changes.

### Production Build

```bash
pnpm build
```

Builds all packages once for production.

### Build Specific Package

```bash
# Build only kernel package
pnpm --filter @geekist/wp-kernel build

# Build only UI package
pnpm --filter @geekist/wp-kernel-ui build
```

### Clean Build

```bash
# Remove all build artifacts
pnpm clean

# Rebuild from scratch
pnpm build
```

## Running Tests

### Unit Tests

```bash
# Run once
pnpm test

# Watch mode
pnpm test --watch

# With coverage
pnpm test:coverage

# Specific file
pnpm test packages/kernel/src/__tests__/index.test.ts
```

### E2E Tests

**Important**: WordPress must be running first!

```bash
# Start WordPress
pnpm wp:start

# Run E2E tests (all browsers)
pnpm e2e

# Chromium only (faster)
pnpm e2e --project=chromium

# Headed mode (see browser)
pnpm e2e --headed

# Debug mode (step through)
pnpm e2e --debug

# Specific test
pnpm e2e packages/e2e-utils/tests/sanity.spec.ts
```

### All Tests

```bash
# Run everything (unit + e2e)
pnpm test && pnpm e2e
```

## Linting & Formatting

### Check Lint

```bash
pnpm lint
```

### Auto-Fix Lint Issues

```bash
pnpm lint:fix
```

### Format Code

```bash
# Auto-format all files
pnpm format

# Check formatting only
pnpm format:check
```

## Type Checking

### Check Types

```bash
pnpm typecheck
```

### Generate Types from Schema

```bash
# Generate TypeScript types from JSON Schema
pnpm types:generate
```

(This command will be added when JSON Schema types are implemented)

## WP-CLI Commands

### Run WP-CLI

```bash
# General format
pnpm wp:cli <command>

# Examples:
pnpm wp:cli plugin list
pnpm wp:cli option get siteurl
pnpm wp:cli post list --post_type=page
```

### View WordPress Logs

```bash
pnpm wp:logs
```

### Access Database

```bash
# Start MySQL shell
pnpm wp:cli db cli

# Export database
pnpm wp:cli db export backup.sql

# Import database
pnpm wp:cli db import backup.sql
```

### Plugin Management

```bash
# List plugins
pnpm wp:cli plugin list

# Activate plugin
pnpm wp:cli plugin activate geekist-showcase

# Deactivate plugin
pnpm wp:cli plugin deactivate geekist-showcase
```

### Theme Management

```bash
# List themes
pnpm wp:cli theme list

# Activate theme
pnpm wp:cli theme activate twentytwentyfour
```

### User Management

```bash
# List users
pnpm wp:cli user list

# Create user
pnpm wp:cli user create newuser newuser@example.com --role=editor

# Update user password
pnpm wp:cli user update admin --user_pass=newpassword
```

## WordPress Playground

### Launch Playground

```bash
pnpm playground
```

Launches WordPress in a WebAssembly environment (no Docker required).

### Playground Use Cases

- Quick demos
- Testing without Docker
- CI/CD testing (lightweight)
- Sharing prototypes

## Changesets

### Create Sprint Changeset

```bash
# Feature sprint (default)
pnpm cs:new:minor "Sprint 5: Bindings & Interactivity"

# Alignment/patch sprint
pnpm cs:new:patch "Sprint 5.5: Performance & Polish"

# Breaking change (rare pre-1.0)
pnpm cs:new:major "Sprint 9: PHP Bridge (breaking API)"
```

> Direct commits to `main` (infra/docs only) do **not** trigger releases.

## Git Workflows

### Create Feature Branch

```bash
git checkout -b feature/my-feature
```

### Commit Changes

```bash
git add .
git commit -m "feat(resources): add custom cache invalidation"
```

### Update from Main

```bash
git checkout main
git pull origin main
git checkout feature/my-feature
git merge main
```

### Clean Up Branches

```bash
# List local branches
git branch

# Delete merged branches
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature
```

## Troubleshooting

### Port 8888/8889 Already in Use

```bash
# Find what's using the port
lsof -i :8888

# Kill the process
kill -9 <PID>

# Or change ports in .wp-env.json
```

### Docker Won't Start

```bash
# Restart Docker Desktop
# Then:
pnpm wp:destroy
pnpm wp:fresh
```

### Build Errors

```bash
# Clean node_modules
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install

# Rebuild
pnpm build
```

### Test Failures

```bash
# Reset test database
pnpm wp:seed:reset

# Clear test artifacts
rm -rf test-results/

# Run tests again
pnpm test && pnpm e2e
```

### Plugin Not Activating

```bash
# Check plugin status
pnpm wp:cli plugin list

# Activate manually
pnpm wp:cli plugin activate geekist-showcase

# Check for errors
pnpm wp:logs
```

### Database Corruption

```bash
# Export current data (if needed)
pnpm wp:cli db export backup.sql

# Reset everything
pnpm wp:destroy
pnpm wp:fresh

# Import data (if needed)
pnpm wp:cli db import backup.sql
```

### E2E Tests Hanging

```bash
# Kill hung processes
pkill -f playwright

# Restart WordPress
pnpm wp:stop && pnpm wp:start

# Run E2E again
pnpm e2e
```

## Performance Profiling

### Build Performance

```bash
# Time the build
time pnpm build
```

### Test Performance

```bash
# Time unit tests
time pnpm test

# Time E2E tests
time pnpm e2e
```

### WordPress Performance

```bash
# Check PHP memory usage
pnpm wp:cli option get WP_MEMORY_LIMIT

# Enable debug mode
pnpm wp:cli config set WP_DEBUG true --raw
pnpm wp:cli config set WP_DEBUG_LOG true --raw
```

## CI/CD

### Run CI Locally

```bash
# Set CI environment
export CI=true

# Run CI checks
pnpm lint && pnpm build && pnpm test && pnpm e2e
```

### View CI Runs

```bash
# Install GitHub CLI
gh auth login

# View recent runs
gh run list --limit 5

# View specific run
gh run view <run-id>

# View logs
gh run view <run-id> --log
```

## Debugging

### Debug Unit Tests

```bash
# Run specific test
pnpm test -- --testNamePattern="should create thing"

# Debug in VS Code
# Add breakpoint, then F5
```

### Debug E2E Tests

```bash
# Run in headed mode
pnpm e2e --headed

# Run in debug mode
pnpm e2e --debug

# Record trace
pnpm e2e --trace on
```

### Debug WordPress

```bash
# Enable WordPress debug mode
pnpm wp:cli config set WP_DEBUG true --raw
pnpm wp:cli config set WP_DEBUG_LOG true --raw
pnpm wp:cli config set WP_DEBUG_DISPLAY false --raw

# View debug log
pnpm wp:logs

# Or tail the log
docker exec -it <container-id> tail -f /var/www/html/wp-content/debug.log
```

---

## Deployment Modes

> **🚧 Roadmap**: Sprints 10-13 • See [Modes Guide](../guide/modes.md) for complete specification

WP Kernel supports three deployment modes: Dynamic WordPress, Headless, and Static Export. Each mode has specific build and deployment requirements.

### Dynamic WordPress (Default)

Standard WordPress deployment with full runtime.

**Build:**

```bash
pnpm build
```

**Deploy:**

- Upload plugin/theme to WordPress
- Standard WordPress hosting
- No special configuration needed

### Headless WordPress

> **🚧 Requires**: `configure()` API • Sprint 12

WordPress as backend API, external frontend.

**Configure API root:**

```typescript
// Client app
import { configure } from '@geekist/wp-kernel';

configure({
	rootURL: process.env.NEXT_PUBLIC_WP_URL,
	nonce: process.env.WP_NONCE,
});
```

**Build:**

```bash
# WordPress backend
pnpm build

# Frontend app (example: Next.js)
NEXT_PUBLIC_WP_URL=https://cms.example.com npm run build
```

**Deploy:**

- WordPress: Standard hosting with REST API enabled
- Frontend: Vercel, Netlify, or custom host
- Configure CORS if needed

**CORS Setup (WordPress):**

```php
// In theme/plugin
add_action('rest_api_init', function () {
	remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
	add_filter('rest_pre_serve_request', function ($value) {
		header('Access-Control-Allow-Origin: https://your-frontend.com');
		header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
		header('Access-Control-Allow-Credentials: true');
		header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
		return $value;
	});
});
```

### Static Export (CDN)

> **🚧 Requires**: `defineKernelConfig()` API, build guards • Sprints 12-13

Pre-rendered HTML for CDN deployment.

**Configure for static:**

```typescript
// wpk.config.ts
export default defineKernelConfig({
	project: {
		supports: {
			wp: true,
			headless: false,
			static: true,
		},
	},
	build: {
		staticEnvVar: 'STATIC',
	},
});
```

**Build:**

```bash
# Build with static mode enabled
STATIC=1 pnpm build

# Generate static pages
STATIC=1 node build/generate-static.ts
```

**Verify build:**

```bash
# Check for forbidden REST calls in front-end bundles
grep -r "apiFetch" dist/public/
# Should return no results
```

**Deploy:**

- Upload `dist/` to CDN (Cloudflare, Fastly, AWS CloudFront)
- Configure cache headers
- Set up redirects/rewrites

**Cloudflare Pages example:**

```bash
# Install Wrangler CLI
npm install -g wrangler

# Deploy
wrangler pages deploy dist/ \
	--project-name=my-site \
	--branch=main
```

### Build Verification

Before deployment, verify mode constraints:

```bash
# Check bundle sizes
ls -lh dist/*.js

# Verify externals (should not bundle WordPress packages)
grep -r "@wordpress" dist/
# Should be imports, not bundled code

# Check for violations (static mode)
if grep -r "apiFetch\|kernel.fetch" dist/public/ ; then
	echo "✗ Static mode violation detected"
	exit 1
fi

# Test in target environment
pnpm e2e --config=playwright.static.config.ts
```

### Environment Variables

Set these for different modes:

**Dynamic WordPress:**

```bash
# .env
NODE_ENV=production
WP_ENV=production
```

**Headless:**

```bash
# .env (frontend)
NEXT_PUBLIC_WP_URL=https://cms.example.com
WP_NONCE=<runtime-nonce>

# .env (WordPress)
ALLOW_ORIGIN=https://app.example.com
```

**Static:**

```bash
# .env
STATIC=1
WP_API_ROOT=http://localhost:8888  # For build-time fetching
OUTPUT_DIR=dist/static
```

---

## Common Snippets

### Add New Resource

```bash
# 1. Create resource definition
touch packages/showcase-plugin/app/resources/MyResource.ts

# 2. Create schema
touch packages/showcase-plugin/contracts/my-resource.schema.json

# 3. Generate types
pnpm types:generate

# 4. Create REST controller
touch packages/showcase-plugin/includes/rest/class-my-resource-controller.php
```

### Add New Action

```bash
# 1. Create action directory
mkdir -p packages/showcase-plugin/app/actions/MyResource

# 2. Create action
touch packages/showcase-plugin/app/actions/MyResource/Create.ts

# 3. Write tests
touch packages/showcase-plugin/app/__tests__/actions/MyResource/Create.test.ts
```

### Add New E2E Test

```bash
# 1. Create test file
touch packages/e2e-utils/tests/my-feature.spec.ts

# 2. Run the test
pnpm e2e packages/e2e-utils/tests/my-feature.spec.ts
```

## Next Steps

- [Coding Standards](/contributing/standards) - Style guide
- [Testing](/contributing/testing) - Unit testing guide
- [E2E Testing](/contributing/e2e-testing) - E2E testing guide
- [Pull Requests](/contributing/pull-requests) - PR process
- [Modes Guide](/guide/modes) - Deployment modes deep dive
