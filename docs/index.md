---
layout: home

hero:
    name: 'WP Kernel'
    text: 'Modern WordPress Framework'
    tagline: A Rails-like, opinionated framework for building WordPress products where JavaScript is the source of truth
    actions:
        - theme: brand
          text: Get Started
          link: /getting-started/
        - theme: alt
          text: View on GitHub
          link: https://github.com/theGeekist/wp-kernel

features:
    - icon: 🎯
      title: Actions-First Architecture
      details: UI components never call transport directly. All writes route through Actions that orchestrate writes, emit events, invalidate caches, and queue jobs.

    - icon: 📦
      title: Typed Resources
      details: Define REST contracts once, get typed client + store + cache keys + events. One definition for your entire data layer.

    - icon: 🔌
      title: Block Bindings & Interactivity
      details: Bind core WordPress blocks to your data. Add behavior with the Interactivity API. No custom blocks needed for most use cases.

    - icon: 🎪
      title: Stable Event Registry
      details: Versioned event system with predefined names. JS hooks are authoritative, PHP bridge mirrors selected events only. No ad-hoc strings.

    - icon: ⚡
      title: Background Jobs
      details: Enqueue long-running tasks with polling support. Built-in status tracking and automatic retries with exponential backoff.

    - icon: 🛡️
      title: Type-Safe & Tested
      details: TypeScript strict mode, JSON Schema validation, structured error handling (KernelError), and comprehensive E2E tests.
---

## Why WP Kernel?

WordPress already gives us powerful primitives-blocks, Interactivity, script modules, and a reliable REST API. What teams still lack is a shared frame for turning those primitives into products without re-solving the same architecture on every build. WP Kernel steps in as that frame. It keeps JavaScript in the driver's seat while asking PHP to focus on capabilities and transport, so you deliver features faster without forking away from Core.

### Built for people shipping features

## Developers get consistent patterns for data fetching, mutation, and error handling. Product teams see shorter feedback loops because the guardrails prevent accidental tight coupling. Business stakeholders gain confidence that every feature emits versioned, registry-backed events, making analytics, integrations, and audits first-class rather than afterthoughts.

## Why WP Kernel?

WordPress already gives us powerful primitives-blocks, Interactivity, script modules, and a reliable REST API. What teams still lack is a shared frame for turning those primitives into products without re-solving the same architecture on every build. WP Kernel steps in as that frame. It keeps JavaScript in the driver’s seat while asking PHP to focus on capabilities and transport, so you deliver features faster without forking away from Core.

### Built for people shipping features

Developers get consistent patterns for data fetching, mutation, and error handling. Product teams see shorter feedback loops because the guardrails prevent accidental tight coupling. Business stakeholders gain confidence that every feature emits canonical events, making analytics, integrations, and audits first-class rather than afterthoughts.

## The golden path

A typical feature follows four beats. Start by defining a Resource so the contract between client and server is explicit. Wrap writes in an Action that manages permissions, retries, events, and cache invalidation. Bind data into blocks or React components using the generated hooks, then extend behaviour through the Interactivity API. Because every team walks the same path, documentation stays in sync with the actual code.

## A guided example

To make the flow tangible, consider the smallest slice of functionality: creating and listing “things.”

```typescript
// 1. Define a resource
export const thing = defineResource<Thing>({
	name: 'thing',
	routes: {
		list: { path: '/wpk/v1/things', method: 'GET' },
		create: { path: '/wpk/v1/things', method: 'POST' },
	},
	schema: import('../../contracts/thing.schema.json'),
});
```

That declaration generates a typed client and store selectors. An Action then centralises the write path:

```typescript
export const CreateThing = defineAction('Thing.Create', async ({ data }) => {
	const created = await thing.create(data);
	CreateThing.emit(events.thing.created, { id: created.id, data });
	invalidate(['thing', 'list']);
	return created;
});
```

Finally, your UI calls the Action. No component reaches into transport APIs directly, which keeps retries and analytics consistent across the application.

```typescript
import { CreateThing } from '@/app/actions/Thing/Create';

const handleSubmit = async () => {
	await CreateThing({ data: formData });
};
```

## What ships in the repository

The monorepo includes the core `@geekist/wp-kernel` package for resources, Actions, events, and jobs; `@geekist/wp-kernel-ui` for bindings and components; `@geekist/wp-kernel-e2e-utils` for Playwright helpers; and a showcase application that exercises the full stack. Tooling for linting, testing, and CI/CD is already configured so new contributors can focus on product work from day one.

## Ready to start?

Head to the [Getting Started guide](/getting-started/) for installation and the narrated quick start. If you prefer to skim before coding, the [Core Concepts section](/guide/) explains how resources, Actions, events, bindings, and jobs work together. When you want to explore the wider project documentation, the [Repository Handbook](/guide/repository-handbook) points directly to `DEVELOPMENT.md`, `BRANCHING_STRATEGY.md`, and other living references.
