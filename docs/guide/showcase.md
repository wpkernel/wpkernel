# Showcase: Jobs & Applications Plugin

> Real-world example demonstrating WP Kernel patterns in a complete, production-ready WordPress careers site and hiring workflow.

## Overview

The Jobs & Applications showcase plugin is a comprehensive example of building modern WordPress products with WP Kernel. It implements a full careers site with job listings, application workflows, and an admin hiring pipeline-all using kernel primitives.

**What it demonstrates:**

- Resources for typed REST clients
- Block Bindings for data-driven content
- Interactivity API for front-end behavior
- Actions for write orchestration
- Events for extensibility
- Jobs for background processing
- Policies for permissions

**Repository:** [View source code](https://github.com/theGeekist/wp-kernel/tree/main/app/showcase)

---

## Feature Overview

### Public (Front-End)

✓ **Job Listings** (`/jobs`)

- Browse all open positions
- Filter by department, location, seniority, job type
- Sort by date, salary, deadline
- Pagination with deep-linkable URLs
- SEO-optimized with XML sitemaps

✓ **Job Detail** (`/jobs/{slug}`)

- Complete job information
- Salary range, location, remote policy
- Apply CTA with embedded form
- JSON-LD JobPosting structured data
- Server-side rendering for SEO

✓ **Application Flow**

- Multi-field form with validation
- CV upload (PDF/DOC/DOCX, 10MB max)
- Progress indicator for uploads
- Client + server validation
- Confirmation page and email

### Admin (Back-End)

✓ **Jobs Management**

- Standard WordPress list table
- Publish, close, duplicate jobs
- Bulk operations
- Custom columns (department, location, status)

✓ **Application Pipeline (Kanban)**

- Visual board with status columns
- Drag-and-drop stage changes
- Application cards with key info
- Detail pane: CV preview, answers, timeline
- Send email templates per stage
- Keyboard navigation support

✓ **Settings & Configuration**

- Application form fields
- Stage labels and order
- Email templates
- Privacy & retention settings
- Integration webhooks (Slack, custom)

✓ **Reporting**

- Applications by stage dashboard
- Time-to-hire metrics
- Source tracking
- CSV export

---

## How Features Map to Kernel

This section shows how each product feature leverages specific kernel primitives.

### 1. Content Model → Resources

**Product needs:** Job and Application CPTs with taxonomies and meta fields

**Kernel solution:**

```typescript
// app/showcase/src/resources/job.ts
import { defineResource } from '@geekist/wp-kernel/resource';

export const job = defineResource<Job, JobQuery>({
	name: 'job',
	routes: {
		list: { path: '/wpk/v1/jobs', method: 'GET' },
		get: { path: '/wpk/v1/jobs/:id', method: 'GET' },
		create: { path: '/wpk/v1/jobs', method: 'POST' },
		update: { path: '/wpk/v1/jobs/:id', method: 'PUT' },
		remove: { path: '/wpk/v1/jobs/:id', method: 'DELETE' },
	},
	schema: import('../../contracts/job.schema.json'),
});
```

**What you get:**

- Typed REST client (`job.list()`, `job.get()`, etc.)
- Automatic `@wordpress/data` store registration
- Cache keys and invalidation helpers
- Event names (`job.events.created`, etc.)
- React hooks (`job.useList()`, `job.useGet()`)

**What you write:** Resource definition + REST endpoints in PHP

### 2. Public Listing & Detail → Bindings + Interactivity

**Product needs:** Display job data in blocks, add filters/search

**Kernel solution:**

```typescript
// Block Bindings (read path)
registerBindingSource('wpk', {
	'job.title': (attrs) => select('wpk/job').getById(attrs.id)?.title,
	'job.location': (attrs) => select('wpk/job').getById(attrs.id)?.location,
	'job.salary_range': (attrs) => {
		const job = select('wpk/job').getById(attrs.id);
		return `$${job.salary_min} - $${job.salary_max}`;
	},
});

// Interactivity (filters)
defineInteraction('wpk/job-filters', {
	state: () => ({
		department: null,
		location: null,
		jobType: null,
	}),
	actions: {
		setDepartment(dept) {
			this.state.department = dept;
			// Kernel resolver refetches with new filters
		},
	},
});
```

**In block editor:**

```json
{
	"blocks": [
		{
			"name": "core/heading",
			"attributes": {
				"content": "",
				"metadata": {
					"bindings": {
						"content": {
							"source": "wpk",
							"args": { "key": "job.title" }
						}
					}
				}
			}
		}
	]
}
```

**What you get:**

- No custom blocks needed
- Data automatically flows from store to UI
- Server bindings available for SEO
- Declarative filter state management

### 3. Apply Form → Actions + Interactivity + Upload Helper

**Product needs:** Handle form submission with CV upload

**Kernel solution:**

```typescript
// Action orchestrates the write path
export const SubmitApplication = defineAction(
	'Application.Submit',
	async ({ jobId, formData, cvFile }) => {
		// 1. Validate policy
		if (!policy.check('applications.create')) {
			throw new KernelError('PolicyDenied', {
				policyKey: 'applications.create',
			});
		}

		// 2. Upload CV with progress
		const media = await uploadFile(cvFile, {
			onProgress: (pct) => dispatch('wpk/ui').setProgress(pct),
		});

		// 3. Create application via REST
		const app = await application.create({
			job_id: jobId,
			...formData,
			cv_media_id: media.id,
		});

		// 4. Emit events
		SubmitApplication.emit('wpk.application.created', {
			id: app.id,
			jobId,
		});

		// 5. Invalidate caches
		invalidate(['application', 'list']);

		// 6. Queue background job
		await jobs.enqueue('ParseResume', { applicationId: app.id });

		return app;
	}
);
```

**Interactivity controller:**

```typescript
defineInteraction('wpk/apply-form', {
	state: () => ({ submitting: false, error: null }),
	actions: {
		async submit() {
			this.state.submitting = true;
			try {
				await SubmitApplication({
					jobId: this.state.jobId,
					formData: this.state.formData,
					cvFile: this.state.cvFile,
				});
				// Success - redirect to thanks page
				window.location.href = '/thanks';
			} catch (e) {
				this.state.error = e.message;
			} finally {
				this.state.submitting = false;
			}
		},
	},
});
```

**What you get:**

- Policy validation
- Error handling and reporting
- Event emission
- Cache invalidation
- Job queueing
- Progress tracking

**What you write:** Action logic + Interactivity wiring

### 4. Admin Pipeline → Admin Mount + Store + Optimistic Updates

**Product needs:** Kanban board with drag-and-drop

**Kernel solution:**

```typescript
// Admin Surface mount
import { AdminSurface } from '@geekist/wp-kernel/admin';
import { PipelineBoard } from './components/PipelineBoard';

AdminSurface.mount('wpk-applications-pipeline', {
	component: PipelineBoard,
	menu: {
		title: 'Applications',
		capability: 'review_applications',
	},
});

// Optimistic update Action
export const MoveApplicationStage = defineAction(
	'Application.MoveStage',
	async ({ id, fromStage, toStage }) => {
		// Optimistic update
		const prev = select('wpk/application').getById(id);
		dispatch('wpk/application').updateEntity(id, { stage: toStage });

		try {
			// Server update
			await application.update(id, { stage: toStage });

			// Emit event
			MoveApplicationStage.emit('wpk.application.stageChanged', {
				id,
				fromStage,
				toStage,
			});
		} catch (e) {
			// Auto-revert on failure
			dispatch('wpk/application').updateEntity(id, prev);
			throw e;
		}
	}
);
```

**What you get:**

- React app in admin
- Store-backed data
- Optimistic updates with auto-revert
- SlotFill extension points
- Keyboard accessibility

### 5. Emails & Notifications → Actions + Jobs + Events/Bridge

**Product needs:** Send emails on stage changes

**Kernel solution:**

```typescript
// JavaScript (canonical)
export const ChangeApplicationStage = defineAction(
	'Application.ChangeStage',
	async ({ id, stage }) => {
		await application.update(id, { stage });

		// Emit event
		ChangeApplicationStage.emit('wpk.application.stageChanged', {
			id,
			stage,
			timestamp: Date.now(),
		});

		// Queue email job
		await jobs.enqueue('SendStageEmail', { applicationId: id, stage });
	}
);

// PHP Bridge (for legacy integrations)
add_action('wpk.bridge.application.stageChanged', function ($payload) {
	// Send to Slack
	wp_remote_post(get_option('slack_webhook'), [
		'body' => json_encode([
			'text' => sprintf(
				'Application #%d moved to: %s',
				$payload['id'],
				$payload['stage']
			),
		]),
	]);
}, 10, 1);
```

**What you get:**

- Event-driven architecture
- Background job processing
- PHP extensibility via bridge
- No tight coupling

### 6. Reporting & Export → Selectors + Actions + Job

**Product needs:** Dashboard metrics and CSV export

**Kernel solution:**

```typescript
// Store selectors (fast, memoized)
const applicationStore = {
	selectors: {
		getByStage: createSelector(
			[(state) => state.entities, (state, stage) => stage],
			(entities, stage) =>
				Object.values(entities).filter((app) => app.stage === stage)
		),

		getTimeToHire: createSelector(
			[(state) => state.entities],
			(entities) => {
				const hired = Object.values(entities).filter(
					(a) => a.stage === 'hired'
				);
				// Calculate median...
			}
		),
	},
};

// CSV Export Action + Job
export const ExportApplicationsCSV = defineAction(
	'Applications.ExportCSV',
	async ({ filters }) => {
		// Queue long-running job
		const jobId = await jobs.enqueue('ExportCSV', { filters });

		// Poll for completion
		const result = await jobs.wait('ExportCSV', { jobId });

		return result.downloadUrl; // Signed URL
	}
);
```

**What you get:**

- Fast, memoized selectors
- Background processing for exports
- Job status polling
- Signed download URLs

### 7. Privacy & Retention → Settings + Scheduled Job

**Product needs:** Auto-purge old applications

**Kernel solution:**

```typescript
// Scheduled Job
export const PurgeOldApplications = defineJob('PurgeOldApplications', {
	schedule: 'daily',
	handler: async () => {
		const retentionDays = getSetting('application_retention_days', 180);
		const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

		const old = await application.list({
			stage: 'rejected',
			updated_before: cutoff,
		});

		for (const app of old) {
			await application.remove(app.id);
		}

		return { purged: old.length };
	},
});
```

**What you get:**

- Cron-like scheduling
- Job logging and monitoring
- Settings integration

### 8. SEO & Sitemaps → Server Bindings + Contracts

**Product needs:** JSON-LD structured data, fast initial render

**Kernel solution:**

```php
// Server Binding Source (PHP)
register_binding_source('wpk-server', [
	'callback' => function($attrs) {
		$job = get_post($attrs['id']);

		switch ($attrs['key']) {
			case 'job.title':
				return get_the_title($job);

			case 'job.jsonld':
				return json_encode([
					'@context' => 'https://schema.org',
					'@type' => 'JobPosting',
					'title' => get_the_title($job),
					'datePosted' => get_post_time('c', false, $job),
					// ... full schema
				]);
		}
	}
]);
```

**In block template:**

```json
{
	"name": "core/html",
	"attributes": {
		"metadata": {
			"bindings": {
				"content": {
					"source": "wpk-server",
					"args": { "key": "job.jsonld" }
				}
			}
		}
	}
}
```

**What you get:**

- SEO-optimized HTML (no JS required)
- Structured data
- Client-side hydration available

### 9. Permissions → Policies + REST Caps

**Product needs:** Role-based access control

**Kernel solution:**

```typescript
// Client-side policy (UI hints)
import { definePolicy } from '@geekist/wp-kernel/policies';

export const jobPolicies = definePolicy({
	'jobs.manage': () => userCan('manage_jobs'),
	'jobs.create': () => userCan('edit_jobs'),
	'applications.review': () => userCan('review_applications'),
});

// In component
if (policy.check('jobs.manage')) {
	return <Button>Edit Job</Button>;
}

// Server remains authoritative
add_action('rest_api_init', function () {
	register_rest_route('wpk/v1', '/jobs', [
		'methods' => 'POST',
		'permission_callback' => function () {
			return current_user_can('edit_jobs');
		},
	]);
});
```

**What you get:**

- Client-side UI gating
- Server-side enforcement
- No capability leakage
- Policy-denied events

### 10. Extensibility → Events + SlotFill + Bridge

**Product needs:** Allow third-party plugins to extend

**Kernel solution:**

```typescript
// Events (JavaScript)
addAction('wpk.application.created', 'analytics-plugin', (payload) => {
	trackEvent('application_submitted', {
		jobId: payload.jobId,
		source: payload.source,
	});
});

// SlotFill (React)
import { Slot, Fill } from '@wordpress/components';

// In core UI
<Slot name="wpk/pipeline/actions">
	{(fills) => (fills.length ? fills : <DefaultActions />)}
</Slot>;

// In plugin
<Fill name="wpk/pipeline/actions">
	<Button>Export to ATS</Button>
</Fill>;

// PHP Bridge
add_action('wpk.bridge.application.created', 'external-crm', function (
	$payload
) {
	// Sync to external CRM
	ExternalCRM::createLead([
		'name' => $payload['data']['name'],
		'email' => $payload['data']['email'],
	]);
});
```

**What you get:**

- Predictable extension points
- Event taxonomy guarantees
- No internal API coupling

---

## What You Write vs. What You Get

| You Write (Product)                     | Kernel Provides                                           |
| --------------------------------------- | --------------------------------------------------------- |
| CPTs/taxonomies/meta + REST endpoints   | Typed clients, stores, resolvers, cache keys, React hooks |
| Block bindings for 5-10 data keys       | Editor + front-end wiring, optional SSR for SEO           |
| 8-12 Actions (CRUD + workflows)         | Error handling, events, cache invalidation, retries       |
| 3-5 Interactivity controllers           | Declarative state, reactive updates, no jQuery            |
| 2-3 Jobs (email, parse CV, export)      | Enqueue/status/polling, timeouts, retry logic             |
| Settings screen (native WP)             | Policy gating, notices, persistence                       |
| Event listeners (optional integrations) | Event bus + PHP bridge, stable names                      |

---

## Content Model

### Custom Post Types

| CPT           | Visibility | Statuses                                          | Notes                                                       |
| ------------- | ---------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `job`         | Public     | draft, publish, closed                            | `closed` removes from listing but keeps detail page for SEO |
| `application` | Private    | new, screening, interview, offer, hired, rejected | Custom post statuses for pipeline stages                    |

### Taxonomies

| Taxonomy     | For | Behavior                                    |
| ------------ | --- | ------------------------------------------- |
| `department` | job | Hierarchical; used in filters and job cards |
| `location`   | job | Flat tags; supports multi-location jobs     |
| `seniority`  | job | Flat: Junior, Mid, Senior, Lead             |
| `job_type`   | job | Flat: Full-time, Contract, Internship, etc. |

### Meta Fields

**Job Meta:**
| Field | Type | Purpose |
|-------|------|---------|
| `salary_min` | int | Minimum salary (display + filter) |
| `salary_max` | int | Maximum salary (display + filter) |
| `apply_deadline` | date | Hide from listing after deadline |
| `remote_policy` | enum | on-site / remote / hybrid |

**Application Meta:**
| Field | Type | Purpose |
|-------|------|---------|
| `name` | string | Applicant name (required) |
| `email` | string | Contact email (required) |
| `phone` | string | Phone number |
| `cv_media_id` | int | Attachment ID (private) |
| `answers` | JSON | Form question responses |
| `source` | enum | site / referral / agency |

---

## Code Structure

```
app/showcase/
├── contracts/              # JSON Schema definitions
│   ├── job.schema.json
│   └── application.schema.json
├── includes/               # PHP (CPTs, REST, bindings)
│   ├── class-job-cpt.php
│   ├── class-application-cpt.php
│   ├── class-rest-controller.php
│   └── class-server-bindings.php
├── src/                    # TypeScript/JavaScript
│   ├── admin/             # Admin surfaces
│   │   ├── PipelineBoard.tsx
│   │   └── Settings.tsx
│   ├── resources/         # Resource definitions
│   │   ├── job.ts
│   │   └── application.ts
│   ├── actions/           # Write orchestration
│   │   ├── Job/
│   │   │   ├── Create.ts
│   │   │   └── Update.ts
│   │   └── Application/
│   │       ├── Submit.ts
│   │       └── MoveStage.ts
│   ├── views/             # Bindings + Interactivity
│   │   ├── bindings.ts
│   │   └── job-filters.ts
│   └── jobs/              # Background jobs
│       ├── ParseResume.ts
│       └── SendEmail.ts
├── tests/
│   ├── e2e/               # End-to-end tests
│   │   ├── jobs/
│   │   └── applications/
│   └── unit/              # Unit tests
├── build/                 # Compiled assets
└── showcase-plugin.php    # Main plugin file
```

---

## Running the Showcase

### Prerequisites

- Node.js 22+ LTS
- pnpm 9+
- Docker (for wp-env)

### Setup

```bash
# Clone repository
git clone https://github.com/theGeekist/wp-kernel.git
cd wp-kernel

# Install dependencies
pnpm install

# Build packages
pnpm build

# Start WordPress (development site)
pnpm wp:start

# Seed test data
pnpm wp:seed
```

**Access:**

- Development site: http://localhost:8888
- Admin: http://localhost:8888/wp-admin (admin/password)
- Tests site: http://localhost:8889 (for E2E tests)

### Development

```bash
# Watch mode (rebuilds on changes)
pnpm dev

# Run unit tests
pnpm test

# Run E2E tests
pnpm e2e

# Lint
pnpm lint
```

### Seed Data

The showcase includes seed scripts for testing:

```bash
# Seed jobs, applications, users
pnpm wp:seed

# Or manually via WP-CLI
pnpm wp-env run cli wp eval-file app/showcase/seeds/jobs.php
pnpm wp-env run cli wp eval-file app/showcase/seeds/applications.php
```

**Seeded data:**

- 10 sample jobs (Engineering, Design, Marketing)
- 50 applications across all stages
- Test users: admin, manager, recruiter, reviewer

---

## Key Takeaways

### Patterns to Reuse

✓ **One resource = one definition** - Everything else is generated

✓ **Actions orchestrate writes** - Never call REST directly from UI

✓ **Events for extensibility** - Emit canonical events for every important action

✓ **Bindings for reads** - No custom blocks needed for data display

✓ **Jobs for slow work** - Background processing with status/retry

✓ **Policies mirror capabilities** - Client hints, server enforces

✓ **Store selectors for derived data** - Fast, memoized, testable

### Common Gotchas

✗ **Forgetting cache invalidation** - Actions must invalidate affected queries

✗ **Not waiting for store state** - Use `useGet(id)` or selectors, not direct access

✗ **Mixing concerns** - Keep Actions for writes, Interactivity for view state

✗ **Skipping server bindings for SEO** - Critical content needs SSR

✗ **Not using TypeScript** - Types prevent runtime errors

### Performance Considerations

⚡ **Listing page:** < 1.2s TTI (target: 600ms)

- Use cursor pagination for large datasets
- Lazy-load images
- Prefetch next page

⚡ **Pipeline board:** Virtualize for > 200 cards

- Only render visible cards
- Debounce drag operations
- Optimistic updates for instant feedback

⚡ **File uploads:** Show progress for > 1MB files

- Chunked uploads via kernel helper
- Resume on network failure
- Validate size/type client-side

⚡ **CSV exports:** Use Jobs for > 1000 rows

- Don't block UI
- Return signed URL
- Expire after 1 hour

---

## Next Steps

- **Study the code:** [Browse showcase source](https://github.com/theGeekist/wp-kernel/tree/main/app/showcase)
- **Run the tests:** See E2E patterns in action
- **Adapt for your product:** Use showcase as a template
- **Read the guides:**
    - [Resources](/guide/resources)
    - [Actions](/guide/actions)
    - [Events](/guide/events)
    - [Block Bindings](/guide/block-bindings)
    - [Jobs](/guide/jobs)

---

## Questions?

The showcase plugin is actively maintained as a reference implementation. If you find patterns that could be improved or have questions about implementation details, please [open an issue](https://github.com/theGeekist/wp-kernel/issues).
