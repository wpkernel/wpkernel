# Resource Configuration

Every WPKernel project lives on a bedrock of **resources**. A resource describes a slice of your domain — “job”, “order”, “subscription” — and the config under `resources.<key>` tells WPKernel how that slice behaves across PHP, REST, JS, and (optionally) admin UI.

This page walks through each resource property in depth. The headings match the config paths so the built-in VitePress outline and search work as you’d expect.

## resources.<key>.namespace

Most projects share a single top-level `namespace` at the root of `wpk.config.ts`. Occasionally you need to bend that rule: a plugin that bundles two logical modules, a migration where one resource has to keep its legacy prefix, or a shared WordPress instance where your plugin straddles multiple domains.

`resources.<key>.namespace` lets you override the root namespace **for one resource only**.

When you set it, three things happen:

- **PHP controllers and helpers**: the generated PHP namespace for that resource’s code switches to the override, so you can keep classes under `Generated\LegacyModule\…` even if the project namespace has moved on.
- **REST routes**: the REST namespace used for that resource’s routes derives from the override, so you can mount a resource under `/legacy/v1/...` while everything else uses `/acme/v1/...`.
- **Client/runtime metadata**: stores, capability unions, and reporter labels use the override when they derive their `namespace/resource` keys.

If you don’t set `resources.<key>.namespace`, the resource simply inherits the root `namespace` and moves in lockstep with the rest of the project when you rename it.

## resources.<key>.routes

Routes are where a resource becomes visible to the outside world. Under `resources.<key>.routes` you describe which HTTP operations the resource supports and how they’re exposed in REST.

The common pattern is a partial CRUD map:

- `list` – collection endpoint (typically `GET /<namespace>/v1/<resource>`).
- `get` – single-item endpoint (`GET /<namespace>/v1/<resource>/:id`).
- `create` – mutation endpoint (`POST /…`).
- `update` – mutation endpoint (`PUT` or `PATCH /…`).
- `remove` – deletion endpoint (`DELETE /…`).

Each route entry has a few core fields:

- **`path`** – required when the route is present. It may include parameters like `:id`, `:slug`, or any other segment your identity and storage model expects.
- **`method`** – HTTP verb for the route. Must be one of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- **`capability`** – optional capability key that links to `resources.<key>.capabilities`. You can leave it out during early development; the generator will emit a warning and fall back to a safe default (`manage_options`) so you still get working endpoints.

From this map WPKernel does the heavy lifting:

- Generates REST controllers with one handler per route.
- Registers those routes via `register_rest_route()`, using your `path` and `method`.
- Emits a typed API client with methods like `fetchList`, `fetch`, `create`, `update`, and `remove`, wired to the same routes.
- Threads capability hints into both the PHP side (permission callbacks) and the JS side (capability unions and helpers).

You can start with just `list` and `get`, add `create`/`update`/`remove` as the domain solidifies, and later introduce custom routes through the same pattern when your resource outgrows basic CRUD.

## resources.<key>.identity

Identity tells WPKernel how to talk about “one specific thing” for this resource. Is that thing identified by a numeric ID? A slug? A UUID? The answer influences REST arguments, PHP casting, cache keys, and even DataView row IDs.

By default, WPKernel assumes numeric IDs:

- `type: "number"`
- `param: "id"`

So if you don’t configure anything, generated handlers will expect an `id` parameter and cast it to an integer before touching storage.

When you need something else, you can be explicit:

- For slugs: `{ type: "string", param: "slug" }`
- For UUID-style IDs: `{ type: "string", param: "uuid" }`
- For custom patterns: `{ type: "string", param: "id" }` (with validation pushed into your schema and handlers)

This identity metadata flows into:

- **REST controllers** – the right parameter is marked as required and cast/sanitised appropriately before your handler runs.
- **Cache helpers** – generated cache keys include the identity type, so `"42"` vs `42` and `/slug/foo` vs `/id/foo` don’t collide.
- **UI/DataViews** – row identifiers and selection helpers use the same identity shape, so selection state remains stable and predictable.

Importantly, `identity` does **not** create or alter database fields by itself. It only describes how the resource is addressed at the API boundary; your storage configuration decides where the data ultimately lives.

## resources.<key>.storage

Storage describes how a resource persists data inside WordPress. It does **not** create tables for you; instead, it wraps the storage primitives WordPress already exposes.

You choose one of the supported modes:

- `mode: "wp-post"` – model a custom post type or reuse an existing one.
- `mode: "wp-taxonomy"` – work with taxonomy terms as the primary object.
- `mode: "wp-option"` – treat a single option as this resource’s backing store.
- `mode: "transient"` – store ephemeral data in a transient.

Each mode adds its own set of fields:

- **`wp-post`**:
    - `postType` – the slug of the post type to manage; if omitted you can still hook into existing types.
    - `statuses` – which statuses are considered when listing (e.g. `["publish", "draft"]`).
    - `supports` – which core post features (`title`, `editor`, etc.) are relevant to this resource.
    - `meta` – a map of meta keys to descriptors, used for type-safe meta sync.
    - `taxonomies` – a map of taxonomy descriptors (`taxonomy`, `hierarchical`, `register`) to define term relationships.

- **`wp-taxonomy`**:
    - `taxonomy` – the taxonomy slug this resource owns.
    - `hierarchical` – whether the taxonomy behaves like categories (`true`) or tags (`false`).

- **`wp-option`**:
    - `option` – the option name this resource reads and writes.

- **`transient`**:
    - No extra fields; the resource’s identity drives which transient key is used.

From this configuration WPKernel:

- Generates CRUD helpers tailored to each storage mode.
- Emits controller scaffolding that calls the right WordPress APIs (`get_post()`, `wp_insert_post()`, `get_option()`, `update_option()`, `get_transient()`, etc.).
- Uses `meta` and `taxonomies` descriptors to generate sync helpers that keep REST responses and stored data in step.

When `resources.<key>.schema` is set to `"auto"`, this storage metadata also becomes the raw material for deriving a JSON Schema, so your REST handlers and clients reflect the shape of what you actually store.

---

## resources.<key>.schema

Schema bindings tell WPKernel how to validate and document the shape of the data that flows through this resource.

You have three main ways to express that relationship:

1. **Point to a named schema**  
   Use a string key that matches an entry in the top-level `schemas` map:

    ```ts
    schema: 'job';
    ```

    This keeps the schema definition centralised and lets multiple resources share the same shape.

2. Inline a JSON Schema object
   Define the schema directly inside the resource:

    ```ts
    schema: {
      $id: 'Job',
      type: 'object',
      properties: { /* … */ },
    }
    ```

    Inline objects are hashed and deduplicated internally, so if two resources share the same inline schema they end up referencing the same internal key.

3. Ask WPKernel to derive one
   Set schema: "auto" and WPKernel will synthesise a schema from your storage metadata where possible (e.g. post meta descriptors). This is useful when you want JSON Schema-driven validation without hand-authoring every property.

    You can also leave schema as undefined, which means “no JSON Schema for this resource”. In that case WPKernel still emits controllers and clients, but they do not rely on schema-driven argument validation.

Where schemas are wired, they feed into:

- REST argument metadata – WordPress gets a richer picture of fields, types, and constraints for request payloads.
- Future type emitters – TypeScript definitions can be generated from the same schemas, keeping compile-time and runtime validation in step.
- Runtime metadata – `ResourceObject.schemaKey` exposes which schema a resource uses so clients can introspect or cross-link docs.

⸻

## resources.<key>.capabilities

Capabilities define who is allowed to do what. The map under resources.<key>.capabilities ties your route-level capability hints to concrete WordPress capabilities.

Each entry key should match a routes.\*.capability value. For example, if your create route has capability: "job.create", you’ll want a matching entry under capabilities["job.create"].

The values can be:

- A simple string:

    ```ts
    capabilities: {
      'job.list': 'read',
      'job.get': 'read',
      'job.create': 'edit_posts',
    }
    ```

- Or a richer descriptor:

    ```ts
    capabilities: {
      'job.create': {
        capability: 'edit_posts',
        appliesTo: 'resource',
      },
      'job.update': {
        capability: 'edit_post',
        appliesTo: 'object',
        binding: 'id',
      },
    }
    ```

The descriptor form gives you control over:

- `capability` – the WordPress capability string passed into `current_user_can()`.
- `appliesTo` – `"resource"` or `"object"`. When set to `"object"`, the check receives an object identifier as a second argument.
- `binding` – which request parameter to treat as the object ID when `appliesTo: "object"` (commonly `"id"` or `"slug"`).

During generation, WPKernel:

- Normalises this map and warns if there are `routes.*.capability` values without matching entries, or entries that are never used.
- Emits PHP helpers that encapsulate the capability logic per resource.
- Generates typed helpers and unions on the client side so you can write code against the exact set of capabilities without stringly-typed guessing.

If you temporarily omit capability entries while sketching your API, WPKernel will keep your routes working by falling back to safe defaults, but production-grade configs should treat this map as the single source of truth for authorisation.

⸻

## resources.<key>.queryParams

Not every resource needs query parameters, but when they appear repeatedly it’s worth describing them once and letting WPKernel do the plumbing.

Under resources.<key>.queryParams you define a small descriptor per param:

- `type` – currently `"string"` or `"enum"`. This drives both validation and documentation.
- `enum` – when `type: "enum"`, the list of allowed values.
- `optional` – whether the param is required. Defaults to `true`; set `false` to mark it as required.
- `description` – human-readable explanation that flows into REST arg docs and runtime metadata.

For example:

```ts
queryParams: {
  status: {
    type: 'enum',
    enum: ['draft', 'published'],
    description: 'Filter jobs by publication status.',
  },
  search: {
    type: 'string',
    optional: true,
    description: 'Full-text search over job titles and descriptions.',
  },
}
```

From here, WPKernel:
• Generates the args configuration passed to register_rest_route().
• Adds enum validation and required flags for you when registering routes.
• Exposes the parameter metadata via resource.queryParams so clients can build UI controls and validate filters without duplicating config.

⸻

## resources.<key>.blocks

Blocks are optional, but when you want a resource to surface as a Gutenberg block, it’s easier to let WPKernel wire the boring bits.

resources.<key>.blocks lets you tell the generator which rendering mode you want:
• mode: "js" – generates a client-side block. Rendering happens in JS; PHP just enqueues scripts and styles.
• mode: "ssr" – generates both JS and a PHP render callback so the block has a server-side representation for better SEO and editor fidelity.

If you omit the blocks section entirely, WPKernel still generates resource-level helpers; you simply won’t get any block scaffolding for that resource.

When configured, the block builder:
• Emits canonical artefacts under .generated/blocks/\*\*.
• Mirrors them into your chosen applied locations (via directories.blocks and directories.blocks.applied, if you use them).
• Generates helper files like build/blocks-manifest.php, Blocks/Register.php, and (for SSR) render.php.

The idea is that you describe the intent once — “this resource should have a block, rendered this way” — and then refine the generated code instead of starting from an empty file.

⸻

## resources.<key>.ui

Finally, resources.<key>.ui is where you opt a resource into a generated admin surface.

The authored part is now deliberately tiny:

- `resources.<key>.ui.admin.view` – set to `"dataviews"` to ask the CLI to generate an admin DataView. Leave it undefined to stay API-only.
- `resources.<key>.ui.admin.menu` – optional. Provide `slug`/`title` (and `capability`/`parent`/`position` when needed) if you want WordPress to register an admin menu page for the generated screen. Menu registration is explicit and not inferred.

Everything else (fields, saved views, interactivity wiring, loader handle) is inferred from your schema, storage metadata, and the layout manifest. The builders emit sensible defaults you can edit in the generated files if you need bespoke tweaks, but you no longer hand-author `ui.admin.dataviews.*` in the config.

Think of resources.<key>.ui as the intent flag — “give this resource an admin face” — while the actual shape of that face is derived automatically from the domain hints you’ve already provided. The only explicit wiring you might keep authoring is the menu if you want a WP admin entry.
