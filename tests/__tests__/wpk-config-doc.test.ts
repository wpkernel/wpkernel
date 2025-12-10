import fs from 'node:fs';
import path from 'node:path';

describe('wpk-config reference', () => {
	const docPath = path.resolve(
		__dirname,
		'../../docs/reference/wpk-config.md'
	);
	const doc = fs.readFileSync(docPath, 'utf8');

	const REQUIRED_SNIPPETS = [
		'`version`',
		'`namespace`',
		'`schemas`',
		'`resources`',
		'`adapters`',
		'`adapters.php`',
		'`adapters.extensions`',
		'`schemas.<key>.path`',
		'`schemas.<key>.generated.types`',
		'`schemas.<key>.description`',
		'`resources.<key>.name`',
		'`resources.<key>.namespace`',
		'`resources.<key>.schema`',
		'`resources.<key>.storage`',
		'`resources.<key>.identity`',
		'`resources.<key>.routes`',
		'`resources.<key>.capabilities`',
		'`resources.<key>.queryParams`',
		'`resources.<key>.ui`',
		'`resources.<key>.routes.list`',
		'`resources.<key>.routes.get`',
		'`resources.<key>.routes.create`',
		'`resources.<key>.routes.update`',
		'`resources.<key>.routes.remove`',
		'`resources.<key>.routes.*.path`',
		'`resources.<key>.routes.*.method`',
		'`resources.<key>.routes.*.capability`',
		'`meta`',
		'`meta.name`',
		'`meta.description`',
		'`meta.version`',
		'`meta.requiresAtLeast`',
		'`meta.requiresPhp`',
		'`meta.textDomain`',
		'`meta.author`',
		'`meta.authorUri`',
		'`meta.pluginUri`',
		'`meta.license`',
		'`meta.licenseUri`',
		'`resources.<key>.capabilities.<cap>.capability`',
		'`resources.<key>.capabilities.<cap>.appliesTo`',
		'`resources.<key>.capabilities.<cap>.binding`',
		'`resources.<key>.identity.type`',
		'`resources.<key>.identity.param`',
		'`resources.<key>.storage.mode`',
		'`resources.<key>.storage.postType`',
		'`resources.<key>.storage.statuses`',
		'`resources.<key>.storage.supports`',
		'`resources.<key>.storage.meta`',
		'`resources.<key>.storage.taxonomies`',
		'`resources.<key>.storage.taxonomies.*.taxonomy`',
		'`resources.<key>.storage.taxonomies.*.hierarchical`',
		'`resources.<key>.storage.taxonomies.*.register`',
		'`resources.<key>.storage.taxonomy`',
		'`resources.<key>.storage.hierarchical`',
		'`resources.<key>.storage.option`',
		'`resources.<key>.queryParams.<param>.type`',
		'`resources.<key>.queryParams.<param>.enum`',
		'`resources.<key>.queryParams.<param>.optional`',
		'`resources.<key>.queryParams.<param>.description`',
		'`resources.<key>.ui.admin.view`',
		'`resources.<key>.ui.admin.menu`',
		'`resources.<key>.ui.admin.menu.slug`',
		'`resources.<key>.ui.admin.menu.title`',
		'`resources.<key>.ui.admin.menu.capability`',
		'`resources.<key>.ui.admin.menu.parent`',
		'`resources.<key>.ui.admin.menu.position`',
	];

	it('documents every config field', () => {
		for (const snippet of REQUIRED_SNIPPETS) {
			expect(doc).toContain(snippet);
		}
	});
});
