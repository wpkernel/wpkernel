---
layout: home
title: WPKernel
titleTemplate: A modern framework for WordPress apps

hero:
    name: WPKernel
    text: Start with one config file
    tagline: Edit `wpk.config.ts`, run `wpk generate`, then `wpk apply`
    actions:
        - theme: brand
          text: Quickstart (3-minute setup)
          link: /#the-three-minute-path
        - theme: alt
          text: Edit your config
          link: /guide/config
        - theme: alt
          text: Philosophy & Architecture
          link: /guide/philosophy

features:
    - title: Single source of truth
      details: Define resources, capabilities and schemas in one `wpk.config.ts`. Generators build the rest.
    - title: Deterministic generation
      details: '`wpk generate` emits PHP controllers, JS hooks, types and docs. `wpk apply` commits atomically or rolls back.'
    - title: Inline capability mapping
      details: Declare friendly capability keys once. The CLI validates, injects server checks and emits a runtime JS map.
    - title: Ready-made WordPress admin screens
      details: Add `ui.admin.dataviews` to get full DataViews admin screens with React, interactivity and access control.
---

## The three-minute path

### 1. Create a plugin workspace

```bash
npm create @wpkernel/wpk my-plugin
cd my-plugin
```

### 2. Open 

### wpk.config.ts

Declare your first resource.

```
import type { WPKernelConfigV1 } from '@wpkernel/cli/config';

const config: WPKernelConfigV1 = {
    version: 1,
    namespace: 'MyOrg\\Demo',

    resources: {
        myPost: {
            routes: {
                list: {
                    path: '/myorg/v1/post',
                    method: 'GET',
                    capability: 'post.list',
                },
                get: {
                    path: '/myorg/v1/post/:id',
                    method: 'GET',
                    capability: 'post.get',
                },
                create: {
                    path: '/myorg/v1/post',
                    method: 'POST',
                    capability: 'post.create',
                },
            },

            capabilities: {
                'post.list': 'read',
                'post.get': 'read',
                'post.create': 'edit_posts',
            },

            ui: {
                admin: {
                    view: 'dataviews',
                    dataviews: { search: true },
                },
            },
        },
    },
};

export default config;
```

### 3. Run generate and apply

```
wpk generate
wpk apply
```

### 4. Activate in WordPress

Enable your plugin and open its admin screen.

::: tip What just happened?

> Your wpk.config.ts was compiled into REST endpoints, capability checks, typed React hooks and an optional admin UI without boilerplate.

## :::

## What is WPKernel?

WPKernel is a meta framework that brings determinism and predictability to WordPress development.

It replaces hand-written PHP controllers, scattered JS clients and admin-page boilerplate with a single declarative config. You design your product in one place and the CLI generates PHP, JavaScript, UI and capability logic from that description.

The result is a plugin that behaves like a coherent application rather than a pile of unrelated files.

## Why the generated artefacts matter

Most tools _scaffold_ WordPress code. WPKernel _builds_ the plugin.

Every run of `wpk generate` creates a complete, internally consistent layer of the project. It does this from the declarative config, not from scattered conventions.

In practical terms:
**You describe the domain once**
Routes, storage, schema, capabilities, UI design and block behaviour live together in `wpk.config.ts.`

**The CLI builds the wiring you would usually avoid**
REST controllers, capability maps, schema-driven arguments, admin screens, JS clients, block artefacts, manifests, registrars and type definitions all come from the same source of truth.

**The layers stay in sync**
When the config changes, everything updates together. You avoid the usual breakage where PHP, JS and the admin interface drift apart.

**Your time shifts to product work**
The CLI handles the repetitive glue so your attention stays on the behaviour your plugin needs.

**Custom work still fits**
You can add extensions that plug into the same deterministic pipeline. This allows you to reuse your own additions across future client projects without rewriting from scratch.

## What this approach enables

The entire workflow becomes cleaner and far more maintainable. Plugins avoid collapsing into spaghetti files because the generator produces structured, predictable output guided by the config. Security improves because capability maps, permission checks and REST routes all originate from the same definition, so the behaviour in PHP and the expectations in JS finally match. The mental model becomes consistent across projects: storage, routing, admin screens, blocks and interactivity follow the same patterns every time instead of reinventing themselves for each build. And because everything originates from declarative intent, you get predictable behaviour on the front-end and in the admin without fighting one-off edge cases or forgotten capability checks.

## Actions-first

All write operations in WPKernel move through an Action rather than being triggered directly from UI elements. This centralises side effects such as cache invalidation, event dispatching and background tasks, and it keeps business logic in a clean, testable location. The UI becomes a simple consumer of these actions instead of a place where logic is scattered across components. For plugin authors, this means fewer hidden bugs, easier testing and a clearer understanding of how data flows across the project.

## Next steps

- Edit the config → [/guide/config](/guide/config)
- Understand the workflow → [/guide](/guide/index)
- CLI reference → [/packages/cli](/packages/cli)![Attachment.tiff]
- Philosophy and architecture → [/guide/philosophy](/guide/philosophy.md)
