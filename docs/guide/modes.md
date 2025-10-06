# Modes: Static, Headless & Dynamic WP

> WP Kernel adapts to three execution modes with compile-time and runtime safety

## Overview

WP Kernel is designed to work in three distinct runtime environments. The framework detects your target mode and enforces appropriate patterns through linting, build checks, and runtime guards.

### Why Modes Matter

Different deployment targets have different constraints:

- **Dynamic WordPress**: Full WP runtime with blocks, bindings, and REST API
- **Headless**: External frontend consuming WordPress via API
- **Static Export**: Pre-rendered HTML on CDN with no runtime API calls

Building for the wrong mode can cause:

- ✗ Runtime errors (REST calls failing in static builds)
- ✗ Bundle bloat (shipping unused code)
- ✗ SEO issues (content not indexed)
- ✗ Performance problems (unnecessary hydration)

**Solution**: Declare your mode upfront. Kernel validates at compile-time, build-time, and runtime.

---

## Mode Types

### 1. Dynamic WordPress (Default)

Full WordPress runtime with server-side rendering, blocks, bindings, and REST API.

**Characteristics:**

- ✓ Blocks with bindings (client + server)
- ✓ Interactivity API for front-end behavior
- ✓ REST API available at runtime
- ✓ Actions can run in admin + front-end
- ✓ Server bindings for SSR

**Use cases:**

- Standard WordPress sites
- Block-based themes
- Admin interfaces
- Hybrid apps (server + client rendering)

**Example:**

```typescript
// Everything just works
const jobs = await job.list({ status: 'publish' });
```

---

### 2. Headless WordPress

WordPress as a backend API. External frontend (React, Next.js, Vue, etc.) consumes data via REST or GraphQL.

**Characteristics:**

- ✓ REST API consumed by external app
- ✓ Resources work with custom `rootURL`
- ✓ No WordPress rendering
- ✓ Actions run in external client
- ✗ No blocks or bindings
- ✗ No server-side rendering from WP

**Use cases:**

- Decoupled frontends (Next.js, Gatsby, etc.)
- Mobile apps consuming WP as CMS
- Multi-platform content distribution
- Custom web apps with WP backend

**Configuration:**

```typescript
// wpk.config.ts
export default defineKernelConfig({
	project: {
		supports: {
			wp: false,
			headless: true,
			static: false,
		},
	},
});
```

**Client setup:**

```typescript
import { configure } from '@geekist/wp-kernel';

configure({
	rootURL: process.env.WP_API_ROOT, // e.g., https://cms.example.com
	nonce: process.env.WP_NONCE, // For authenticated requests
});

// Now resources work
const jobs = await job.list();
```

---

### 3. Static Export

Pre-rendered HTML served from CDN. No runtime REST API calls. Content generated at build time.

**Characteristics:**

- ✓ Pre-rendered HTML (build time)
- ✓ Server bindings for content (SSR only)
- ✓ Interactivity for pure UI behavior (no API calls)
- ✗ No runtime REST calls
- ✗ No Actions in front-end bundles
- ✗ No dynamic data fetching

**Use cases:**

- Marketing sites (high performance, low cost)
- Documentation sites
- Blogs with infrequent updates
- Edge-deployed content

**Configuration:**

```typescript
// wpk.config.ts
export default defineKernelConfig({
	project: {
		supports: {
			wp: true, // For editor experience
			headless: false,
			static: true, // Target is CDN
		},
	},
	build: {
		staticEnvVar: 'STATIC', // Used in build guards
	},
});
```

**Allowed patterns:**

```typescript
// ✓ Server bindings (rendered at build time)
registerBindingSource('wpk-server', {
	'job.title': (attrs) => get_the_title(attrs.id),
});

// ✓ Pure UI interactivity (no API)
defineInteraction('wpk/menu-toggle', {
	state: () => ({ open: false }),
	actions: {
		toggle() {
			this.state.open = !this.state.open;
		},
	},
});

// ✗ Runtime REST calls (blocked at build)
const jobs = await job.list(); // Build error!
```

---

## Configuration

### Project Config

Declare modes in `wpk.config.ts`:

```typescript
import { defineKernelConfig } from '@geekist/wp-kernel/config';

export default defineKernelConfig({
	project: {
		name: 'my-project',
		supports: {
			wp: true, // Dynamic WordPress
			headless: false, // External frontend
			static: false, // CDN export
		},
	},

	// Optional build settings
	build: {
		staticEnvVar: 'STATIC', // Check this env var for static mode
		targetWP: '6.8', // Target WordPress version
	},
});
```

### Common Configurations

**Standard WordPress Site:**

```typescript
supports: {
  wp: true,
  headless: false,
  static: false,
}
```

**Headless CMS:**

```typescript
supports: {
  wp: false,
  headless: true,
  static: false,
}
```

**Static Marketing Site:**

```typescript
supports: {
  wp: true,      // Editor experience
  headless: false,
  static: true,  // Target CDN
}
```

**Hybrid (WP + Headless):**

```typescript
supports: {
  wp: true,      // Some pages rendered by WP
  headless: true, // Some pages use external frontend
  static: false,
}
```

---

## Context Detection

Kernel automatically detects runtime context to enable/disable features:

### Admin Context

**Detected when:**

- `window.ajaxurl` present
- URL matches `/wp-admin/`
- `document.body.classList.contains('wp-admin')`

**Behavior:**

- ✓ All Actions available
- ✓ Resources can call REST
- ✓ Admin surfaces mount
- ✓ Policy checks active

### Front-End (Dynamic WP)

**Detected when:**

- WordPress globals present (`wp`, `wpApiSettings`)
- Script Modules registered
- `wp.apiFetch` available

**Behavior:**

- ✓ Bindings work (client + server)
- ✓ Interactivity runs
- ✓ Resources can fetch (when appropriate)
- ⚠️ Actions restricted in static mode

### Headless Client

**Detected when:**

- No WordPress globals
- `kernel.configure({ rootURL })` called
- `WPK_API_ROOT` env var set

**Behavior:**

- ✓ Resources work with custom root
- ✓ Actions orchestrate writes
- ✗ No blocks or bindings
- ✗ No WordPress rendering

### Static Export

**Detected when:**

- `process.env.STATIC === '1'` at build time
- `<meta name="wpk-static">` tag present
- No REST root available

**Behavior:**

- ✓ Server bindings rendered
- ✓ Pure UI interactivity
- ✗ REST calls blocked
- ✗ Actions blocked in front-end

---

## Enforcement Levels

Kernel enforces mode constraints at three stages:

### 1. Compile-Time (ESLint)

**What:** Lint rules catch violations during development

**Rules:**

```javascript
// .eslintrc.js
module.exports = {
	extends: ['@geekist/eslint-config-wp-kernel'],
	settings: {
		wpKernel: {
			mode: 'static', // From wpk.config.ts
		},
	},
};
```

**Static mode violations:**

```typescript
// ✗ ESLint error: No REST calls in front-end bundles
const jobs = await job.list();
// Fix: Move to admin or use server bindings

// ✗ ESLint error: No Actions in front-end
await CreateJob({ title: 'Test' });
// Fix: Actions only in admin context

// ✓ OK: Pure UI interactivity
this.state.open = !this.state.open;
```

### 2. Build-Time (Vite Plugin)

**What:** Build plugin scans output and fails on violations

**Setup:**

```typescript
// vite.config.ts
import { wpKernelBuildGuard } from '@geekist/wp-kernel/build';

export default defineConfig({
	plugins: [
		wpKernelBuildGuard({
			mode: 'static',
			failOnViolation: true,
		}),
	],
});
```

**Checks:**

- ✓ No `apiFetch` in public bundles (static mode)
- ✓ No `kernel.fetch` in static front-end
- ✓ No REST imports in wrong contexts
- ✓ Bundle size within limits

**Example error:**

```
[wpk] Build Error: Static mode violation detected

File: src/views/JobList.tsx
Issue: Resource.list() called in front-end bundle

Static builds cannot make runtime REST calls.

Solutions:
  1. Move data fetching to admin (authoring time)
  2. Use server binding sources for SSR
  3. Enable headless mode if you need client-side fetching

Docs: https://kernel.geekist.dev/guide/modes#static-export
```

### 3. Runtime (Development Only)

**What:** Dev-mode guards with helpful error messages

**When:** `process.env.NODE_ENV === 'development'`

**Behavior:**

```typescript
// kernel/src/resource/client.ts
export function list(query) {
	if (__DEV__ && isStaticMode() && isFrontEnd()) {
		throw new KernelError('StaticModeViolation', {
			method: 'list',
			resource: this.name,
			suggestion: 'Use server bindings or move to admin context',
			docsUrl: 'https://kernel.geekist.dev/guide/modes',
		});
	}

	return fetch(/* ... */);
}
```

**Error output:**

```
KernelError: StaticModeViolation

Resource: job
Method: list()
Context: front-end

Static builds cannot make runtime REST API calls.

Fix:
• Move data fetching to admin (build/authoring time)
• Use server binding sources for SSR content
• Enable headless mode if you need dynamic fetching

Docs: https://kernel.geekist.dev/guide/modes#static-export

Stack trace:
  at job.list (resource/client.ts:42)
  at JobList.tsx:15
```

---

## Static Mode Patterns

### Pattern 1: Server Bindings (SSR Content)

**Problem:** Display dynamic content without runtime API calls

**Solution:** Render content server-side at build time

```php
// Server binding source (PHP)
register_binding_source('wpk-server', [
	'callback' => function($attrs) {
		$job = get_post($attrs['id']);

		switch ($attrs['key']) {
			case 'job.title':
				return get_the_title($job);

			case 'job.description':
				return get_the_content(null, false, $job);

			case 'job.jsonld':
				return json_encode([
					'@context' => 'https://schema.org',
					'@type' => 'JobPosting',
					'title' => get_the_title($job),
					// ... full schema
				]);
		}
	}
]);
```

```json
{
	"name": "core/heading",
	"attributes": {
		"metadata": {
			"bindings": {
				"content": {
					"source": "wpk-server",
					"args": { "key": "job.title", "id": 123 }
				}
			}
		}
	}
}
```

**Result:** Content rendered in HTML, works without JS

### Pattern 2: Pure UI Interactivity

**Problem:** Need interactive UI without API calls

**Solution:** Use Interactivity for client-side-only state

```typescript
defineInteraction('wpk/job-filters', {
	state: () => ({
		department: null,
		showClosed: false,
	}),
	actions: {
		setDepartment(dept) {
			this.state.department = dept;
			// No API call - just filter rendered list
		},
		toggleClosed() {
			this.state.showClosed = !this.state.showClosed;
		},
	},
	effects: {
		// Filter visible items based on state
		filterJobs: () => {
			const items = document.querySelectorAll('.job-item');
			items.forEach((item) => {
				const dept = item.dataset.department;
				const closed = item.dataset.closed === 'true';

				const visible =
					(!this.state.department ||
						dept === this.state.department) &&
					(this.state.showClosed || !closed);

				item.style.display = visible ? '' : 'none';
			});
		},
	},
});
```

**Result:** Interactive filters without REST calls

### Pattern 3: Build-Time Data Generation

**Problem:** Need to generate pages from CMS data

**Solution:** Fetch at build time, render to static HTML

```typescript
// build/generate-pages.ts
import { job } from '../src/resources/job';

async function generateStaticPages() {
	// Fetch during build (not runtime)
	const jobs = await job.list({ status: 'publish' });

	// Generate HTML for each job
	for (const j of jobs) {
		const html = renderJobPage(j);
		await writeFile(`dist/jobs/${j.slug}.html`, html);
	}
}
```

```bash
# Build command
STATIC=1 node build/generate-pages.ts
```

---

## Headless Mode Patterns

### Pattern 1: Configure Root URL

```typescript
// src/index.ts (entry point)
import { configure } from '@geekist/wp-kernel';

configure({
	rootURL: process.env.NEXT_PUBLIC_WP_URL,
});
```

### Pattern 2: Authenticated Requests

```typescript
import { configure } from '@geekist/wp-kernel';

// Get nonce from auth endpoint
const { nonce } = await fetch('/api/auth/wp-nonce').then((r) => r.json());

configure({
	rootURL: process.env.WP_API_ROOT,
	nonce,
});

// Now resources work with auth
const jobs = await job.list(); // Includes private posts if user can see them
```

### Pattern 3: Next.js Integration

```typescript
// pages/jobs/index.tsx
import { job } from '@/resources/job';

export async function getStaticProps() {
	const jobs = await job.list();

	return {
		props: { jobs },
		revalidate: 60, // ISR
	};
}

export default function JobsPage({ jobs }) {
	return <JobList jobs={jobs} />;
}
```

---

## Troubleshooting

### "StaticModeViolation" Error

**Error:**

```
KernelError: StaticModeViolation
Resource: job
Method: list()
```

**Cause:** Runtime REST call in static front-end bundle

**Fixes:**

1. Use server bindings for content
2. Move fetch to admin/build time
3. Enable headless mode

### "No rootURL Configured" Warning

**Error:**

```
[wpk] Headless mode: kernel.fetch has no rootURL
```

**Cause:** Headless mode enabled but no API root configured

**Fix:**

```typescript
configure({ rootURL: 'https://cms.example.com' });
```

### Build Fails with "Forbidden Imports"

**Error:**

```
[vite] Build failed: Resource imports detected in static front-end bundle
```

**Cause:** Static mode enabled but resource used in front-end

**Fix:** Remove resource imports from front-end, use server bindings

---

## Best Practices

### ✓ DO

- **Declare mode upfront** in `wpk.config.ts`
- **Use server bindings for SEO** in static mode
- **Configure rootURL early** in headless mode
- **Test in target environment** before deployment
- **Leverage build checks** to catch violations early

### ✗ DON'T

- **Mix modes without guards** - Declare support clearly
- **Ship dev guards to production** - Stripped automatically
- **Bypass mode checks** - They exist for a reason
- **Assume context** - Let kernel detect it
- **Disable build guards** - They prevent production bugs

---

## See Also

- [Resources Guide](/guide/resources) - REST client patterns
- [Block Bindings](/guide/block-bindings) - Server binding sources
- [Interactivity](/guide/interactivity) - Pure UI behavior
- [Deployment Runbook](/contributing/runbook#deployment-modes) - Operational details
