```plaintext
# I ommitted the generated .wpk folder for clarity. The generated folder contains build artefacts and intermediate files.
examples/showcase
├── inc 																		# php files in the user space (the *applied paths in the manifest), but these extend from .wpk/generated currently
│   └── Rest
│       ├── ApplicationController.php
│       ├── JobCategoryController.php
│       ├── JobController.php
│       ├── SettingsController.php
│       └── StatusCacheController.php
├── package.json
├── plugin.php															# currently a direct copy from .wpk/generated/plugin.php (should it be? should we generate functions and require instead or just keep things simple for now?)
├── schemas																	# this is the assumption that the user populated the schemas property in wpk.config.ts. We generate types from these. And in this case, resource.meta schemas are ignored if resource.schema does not point to one the schema.keys
│   ├── application.schema.json
│   ├── job.schema.json
│   └── settings.schema.json
├── src 																	  # user source files, from the layout manifest, but I'm not even sure we are using the manifest properly for this
│   ├── app
│   │   ├── applications
│   │   │   ├── config.tsx
│   │   │   ├── form.tsx
│   │   │   └── page.tsx
│   │   ├── departments
│   │   │   ├── config.tsx
│   │   │   └── page.tsx
│   │   ├── jobs
│   │   │   ├── config.tsx
│   │   │   ├── form.tsx
│   │   │   └── page.tsx
│   │   ├── locations
│   │   │   ├── config.tsx
│   │   │   └── page.tsx
│   │   └── settings
│   │       └── page.tsx
│   ├── blocks																# we generate blocks artefacts if blocks are defined in the config. mode: ssr will get us a render.php, otherwise just json and tsx files
│   │   ├── application
│   │   │   ├── block.json
│   │   │   ├── index.tsx
│   │   │   ├── view.ts
│   │   │   └── view.tsx
│   │   ├── auto-register.ts
│   │   ├── job
│   │   │   ├── block.json
│   │   │   └── render.php
│   │   ├── jobcategory
│   │   │   ├── block.json
│   │   │   ├── index.tsx
│   │   │   ├── view.ts
│   │   │   └── view.tsx
│   │   ├── settings
│   │   │   ├── block.json
│   │   │   ├── index.tsx
│   │   │   ├── view.ts
│   │   │   └── view.tsx
│   │   └── statuscache
│   │       ├── block.json
│   │       ├── index.tsx
│   │       ├── view.ts
│   │       └── view.tsx
│   ├── components														# fairly certain this can live in packages/ui
│   │   └── TermQuickForm.tsx
│   ├── lib
│   │   └── runtime.ts
│   ├── resources
│   │   ├── application.ts
│   │   ├── job-department.ts
│   │   ├── job-location.ts
│   │   ├── job.ts
│   │   └── settings.ts
│   ├── types														      # some are shims, but this comes from the declared schemas property or inferred from resourse.meta
│   │   ├── application.d.ts
│   │   ├── job.d.ts
│   │   ├── settings.d.ts
│   │   ├── term.d.ts
│   │   ├── wordpress-blocks.d.ts
│   │   ├── wp-data.d.ts
│   │   ├── wp-element-jsx-runtime.d.ts
│   │   └── wpk-runtime.d.ts
│   └── ui
│       └── index.tsx
├── tsconfig.json
├── vite.config.ts
└── wpk.config.ts
```

And now the manifest:

```json
{
	"$schema": "",
	"directories": {
		".wpk": {
			"generate": {
				"php": {
					"$id": "php.generated",
					"Blocks": "blocks.php.generated",
					"build": {
						"blocks-manifest.php": "blocks.manifest"
					}
				},
				"blocks": "blocks.generated",
				"js": "js.generated",
				"ui": "ui.generated"
			},
			"apply": {
				"base": "plan.base",
				"incoming": "plan.incoming",
				"plan.json": "plan.manifest",
				"log.json": "apply.log",
				"patch-manifest.json": "patch.manifest",
				"state.json": "apply.state"
			},
			"tmp": {
				"$id": "workspace.tmp"
			},
			"bundler": {
				"config.json": "bundler.config",
				"assets": {
					"index.asset.json": "bundler.assets"
				},
				"shims": "bundler.shims"
			},
			"debug-ui.json": "debug.ui"
		},
		"src": {
			"blocks": "blocks.applied",
			"ui": {
				"$id": "ui.applied",
				"resources": "ui.resources.applied"
			}
		},
		"inc": {
			"Rest": "controllers.applied"
		},
		"plugin.php": "plugin.loader"
	}
}
```

Yeah, we’ve stabilised the plumbing; we haven’t yet fired the architects. Builders are still doing town-planning instead of just showing up with bricks.

Let me answer your actual question in three layers: 1. Where IR v1 is already doing the right thing 2. What’s missing (paths, filenames, imports) and where it belongs 3. How that maps onto your examples/showcase + manifest

⸻

1. Where we actually are with IR v1 vs config

Right now, post-refactor:
• Config → IR is in a decent place:
• Resources, schemas, blocks, capabilities, php meta, layout keys, etc are being normalised by fragments.
• The IR has enough semantic information to describe “what the plugin is” without touching the file system.
• IR → Builders is still “old world” for TS:
• TS builders decide:
• File names (FooController.ts, job.ts, application.ts, etc.)
• Folders (src/resources, src/blocks/<blockKey>, src/app/<slug>/page.tsx)
• Import specifiers ('./application', '../types/application', '@wpk/runtime' etc.)

We’ve rerouted everything through createIr / createIrWithBuilders, and we’ve stopped the worst of the re-inference from config, but:

Builders are still making path decisions that should live in one place.

Which is exactly the thing you’re sniffing at: path / filename / import planning belongs in an IR fragment, not scattered across 4 TS builders and half the PHP side.

⸻

2. What’s missing: a “path & artefact plan” fragment

You already have:
• Layout manifest → logical ids:

"src": {
"blocks": "blocks.applied",
"ui": {
"$id": "ui.applied",
"resources": "ui.resources.applied"
}
},
"inc": {
"Rest": "controllers.applied"
},
"plugin.php": "plugin.loader"

    •	And inside .wpk:

".wpk": {
"generate": {
"php": {
"$id": "php.generated",
"Blocks": "blocks.php.generated",
"build": {
"blocks-manifest.php": "blocks.manifest"
}
},
"blocks": "blocks.generated",
"js": "js.generated",
"ui": "ui.generated"
},
...
}

The layout fragment already uses these ids (e.g. ir.layout.resolve('controllers.applied'), php.generated, etc.). That’s good.

What we don’t have is the next level up:

For each resource, block, schema, and php artefact, a canonical plan of “these are the files you will write and how they relate”.

That’s what should move into a dedicated fragment: call it mentally artifacts (could live inside the existing layout fragment, but conceptually it’s a second layer).

2.1. Target IR shape (conceptual)

Something along these lines (rough sketch, not exact typing):

interface IRv1 {
// already there
meta: { /_ ... _/ };
resources: ResourceDescriptor[];
blocks: BlockDescriptor[];
schemas: SchemaDescriptor[];
php: {
namespace: string;
autoload: string;
outputDir: string; // from layout/php.generated
};
layout: {
resolve: (id: LayoutId) => string;
manifest: LayoutManifest;
};

// NEW: artefact plan
artifacts: {
pluginLoader: FilePlan;

    controllers: Record<string, ControllerPlan>; // keyed by resource id/name
    resources: Record<string, ResourceTsPlan>;
    uiResources: Record<string, UiResourcePlan>;
    blocks: Record<string, BlockPlan>;           // keyed by block key
    schemas: Record<string, SchemaPlan>;         // keyed by schema key

};
}

interface FilePlan {
id: string; // e.g. 'plugin.loader'
absolutePath: string;
relativePath: string; // from workspace root
importSpecifier?: string; // for TS/JS
}

interface ControllerPlan {
appliedPath: string; // inc/Rest/JobController.php
generatedPath: string; // .wpk/generate/php/Rest/JobController.php
className: string; // JobController
namespace: string; // e.g. "WPKernel\Showcase\Rest"
}

interface BlockPlan {
key: string; // 'job', 'application'
appliedDir: string; // src/blocks/job
jsonPath: string; // src/blocks/job/block.json
tsEntry?: string; // src/blocks/job/index.tsx
tsView?: string; // src/blocks/job/view.tsx
tsHelper?: string; // src/blocks/job/view.ts
phpRenderPath?: string; // for mode: 'ssr'
mode: 'ssr' | 'view' | 'edit'; // from config.blocks
}

interface ResourceTsPlan {
modulePath: string; // src/resources/job.ts
typeImport?: string; // ./types/job (if using schema)
}

interface UiResourcePlan {
appDir: string; // src/app/jobs
pagePath?: string; // src/app/jobs/page.tsx
formPath?: string; // src/app/jobs/form.tsx
configPath?: string; // src/app/jobs/config.tsx
}

interface SchemaPlan {
typeDefPath: string; // src/types/job.d.ts
}

This artefacts section is what the TS + PHP builders should consume.

Then builders become:
• “Given ir.artifacts.blocks[blockKey], emit block.json, index.tsx, view.tsx, render.php with these paths and symbols.”
• “Given ir.artifacts.controllers[resId], emit the controller base + maybe a stub.”

The only things builders decide are:
• File contents.
• Which files to write out of the plan (e.g. some combinations may skip form, etc.).

Everything else — folder names, filename casing, import specifiers, PHP namespaces — comes from this fragment.

⸻

3. Mapping your showcase tree + manifest into that fragment

Let’s walk your example and map where each decision should live.

3.1. Plugin loader

examples/showcase
├── plugin.php # currently copied from .wpk/generated/plugin.php

From manifest:

"plugin.php": "plugin.loader"
".wpk": {
"generate": {
"php": { "$id": "php.generated" }
}
}

The layout fragment already knows:
• layout.resolve('plugin.loader') → <root>/plugin.php
• layout.resolve('php.generated') → <root>/.wpk/generate/php

The artefact fragment should decide:
• Where the real loader logic lives (generated):

const generatedLoader = path.join(
layout.resolve('php.generated'),
'plugin-loader.php'
);

    •	How plugin.php relates:
    •	Short term (what you have): copy .wpk/generated/plugin.php over plugin root.
    •	Medium term: plugin.php is a tiny, stable header + require_once generatedLoader.

Either way, that relationship is IR-level knowledge:

artifacts.pluginLoader = {
id: 'plugin.loader',
absolutePath: layout.resolve('plugin.loader'),
relativePath: 'plugin.php',
importSpecifier: undefined, // PHP, not TS
};

And PHP builder uses ir.artifacts.pluginLoader to write the final file and/or the generated loader.

3.2. Controllers – inc/Rest/\*.php

inc/Rest
├── ApplicationController.php
├── JobCategoryController.php
├── JobController.php
├── SettingsController.php
└── StatusCacheController.php

From manifest:

"inc": {
"Rest": "controllers.applied"
}

So:
• layout.resolve('controllers.applied') → <root>/inc/Rest.

Combine that with each resource from IR:
• res:application, res:job, res:job-category, etc. Each resource descriptor already has:
• name or slug
• maybe label
• identity information.

The artefact fragment can define:

for (const res of ir.resources) {
const classBase = pascalCase(res.name); // 'Job', 'Application'
const className = `${classBase}Controller`;

const appliedRoot = layout.resolve('controllers.applied');
const appliedPath = path.join(appliedRoot, `${className}.php`);

const generatedRoot = layout.resolve('php.generated');
const generatedPath = path.join(
generatedRoot,
'Rest',
`${className}.php`
);

artifacts.controllers[res.id] = {
appliedPath,
generatedPath,
className,
namespace: php.namespace + '\\Rest', // from ir.php.namespace
};
}

TS/PHP builders then stop doing:
• path.join('inc', 'Rest', ...)
• re-deriving class name from resource name
• building namespaces locally

They just read ir.artifacts.controllers[res.id].

3.3. Blocks – src/blocks/\*

src/blocks
├── application
│ ├── block.json
│ ├── index.tsx
│ ├── view.ts
│ └── view.tsx
├── auto-register.ts
├── job
│ ├── block.json
│ └── render.php # mode: ssr
├── jobcategory
│ ├── block.json
│ ├── index.tsx
│ ├── view.ts
│ └── view.tsx
...

From manifest:

"src": {
"blocks": "blocks.applied",
}
".wpk": {
"generate": {
"blocks": "blocks.generated"
}
}

So:
• layout.resolve('blocks.applied') → <root>/src/blocks
• layout.resolve('blocks.generated') → <root>/.wpk/generate/blocks

IR already has block descriptors coming from config:

ir.blocks: BlockDescriptor[]; // key, mode, resource linkage, etc.

The fragment can then define for each block:

for (const block of ir.blocks) {
const baseDir = layout.resolve('blocks.applied');
const dir = path.join(baseDir, block.key); // 'job', 'application', etc.

const jsonPath = path.join(dir, 'block.json');

const hasViewComponent =
block.mode !== 'ssr'; // or use richer config

const plan: BlockPlan = {
key: block.key,
appliedDir: dir,
jsonPath,
mode: block.mode,
tsEntry: hasViewComponent ? path.join(dir, 'index.tsx') : undefined,
tsView: hasViewComponent ? path.join(dir, 'view.tsx') : undefined,
tsHelper: hasViewComponent ? path.join(dir, 'view.ts') : undefined,
phpRenderPath:
block.mode === 'ssr'
? path.join(dir, 'render.php')
: undefined,
};

artifacts.blocks[block.key] = plan;
}

Then:
• TS block builder stops concatenating strings and just does:

const plan = ir.artifacts.blocks[block.key];
if (!plan) return;

writeFile(plan.jsonPath, jsonContents);
if (plan.tsEntry) writeFile(plan.tsEntry, entrySource);
if (plan.tsView) writeFile(plan.tsView, viewSource);
if (plan.tsHelper) writeFile(plan.tsHelper, helperSource);

    •	PHP block builder just checks plan.phpRenderPath and writes the render implementation.

And if you ever change the layout (e.g. you want src/wpk/blocks/ instead of src/blocks), that’s one fragment edit, not 4 builder rewrites.

3.4. UI resources – src/app/\*

src/app
├── applications
│ ├── config.tsx
│ ├── form.tsx
│ └── page.tsx
├── departments
│ ├── config.tsx
│ └── page.tsx
...

Manifest:

"src": {
"ui": {
"$id": "ui.applied",
"resources": "ui.resources.applied"
}
}

So:
• layout.resolve('ui.resources.applied') → <root>/src/app.

You probably already associate resources with some UI metadata in IR (or we can extend a fragment to do that). The artefact fragment can then decide that:
• resource.slug / resource.name → jobs, applications, etc.

For each resource:

const uiRoot = layout.resolve('ui.resources.applied');
const appDir = path.join(uiRoot, resource.slug); // or derived key

artifacts.uiResources[resource.id] = {
appDir,
pagePath: path.join(appDir, 'page.tsx'),
formPath: path.join(appDir, 'form.tsx'),
configPath: path.join(appDir, 'config.tsx'),
};

Again, the ui.entry / adminScreen TS builders can stop doing “ok, /src/app/ + slug + page.tsx” and just consume this.

3.5. Types & schemas – src/types/_ + schemas/_

schemas
├── application.schema.json
├── job.schema.json
└── settings.schema.json

src/types
├── application.d.ts
├── job.d.ts
└── settings.d.ts
...

The schema fragment already knows where the schema files live (manual, inline, etc.). All that’s left is to bind each schema key to a .d.ts output path.

You can either:
• Derive the root from layout (e.g. add a types.applied id to the manifest), or
• Hardcode src/types as a layout rule in the fragment for now.

Then:

const typesRoot = path.join(workspace.root, 'src', 'types'); // or layout.resolve('types.applied')

for (const schema of ir.schemas) {
const typeName = schema.key; // or some naming convention
const typeDefPath = path.join(typesRoot, `${typeName}.d.ts`);

artifacts.schemas[schema.key] = { typeDefPath };
}

TS type builders then simply write to ir.artifacts.schemas[schemaKey].typeDefPath.

⸻

4. So where are we actually on that journey?

Short version:
• IR v1 is already a good semantic model: resources, blocks, capabilities, php meta, layout manifest resolution, etc. You weren’t imagining that.
• What’s missing is one cohesive “artefact/layout” fragment that:
• Takes IR + manifest.
• Emits a canonical plan for every file path, filename, symbol, and import.
• Once that fragment exists, you can:
• Strip path logic out of TS builders (pipeline.builder.ts, pipeline.creator.adminScreen.ts, ui.entry.ts, etc.).
• Do the same for PHP builders (controllers, block loader, plugin loader).
• Nuke a frankly indecent amount of duplicated SLOC.

You’re basically one well-designed fragment away from being able to do the liposuction you’re fantasising about. The refactor we just did (killing buildIr, aligning tests on createIr, making layout + php + resources coherent) didn’t solve that higher-level concern, but it removed all the misleading “oh but in tests we build IR differently” noise.

Now you can safely design that artifacts layer knowing it’ll flow through the one real IR path instead of juggling a dozen bespoke builders.
