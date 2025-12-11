# UI Configuration

WPKernel now infers the admin surface instead of asking you to hand-author dozens of `ui.admin.dataviews.*` fields. You only flip the switch; the builders take cues from your schemas, storage, and layout manifest to scaffold a DataViews screen.

## Opting in

Enable an admin DataView by setting:

```ts
resources: {
  job: {
    // …
    ui: { admin: { view: 'dataviews' } },
  },
}
```

Leave `ui` undefined to keep the resource API-only.

## What gets inferred

When `view: 'dataviews'` is present, the CLI derives:

- **Fields and visibility** from storage hints (post fields, meta descriptors, taxonomies) and identity.
- **Sorting/search defaults** that map to your query params.
- **Loader wiring** using the layout manifest and namespace.
- **Type-safe fixtures** under `.generated/ui/**` plus an admin entrypoint.

If you need bespoke tweaks, edit the generated files after a build rather than expanding the config surface.

## Things you still author explicitly

- `ui.admin.menu` is **not inferred**. Set `slug` and `title` (plus optional `capability`/`parent`/`position`) when you want a WordPress admin menu entry for the generated screen.

## Things you no longer author

Nested shapes like `ui.admin.dataviews.fields`, `actions`, `defaultLayouts`, or `screen` are no longer expected in `wpk.config.ts`. The generator produces defaults and keeps them in source control so you can refine the emitted code without teaching the config new keys.
