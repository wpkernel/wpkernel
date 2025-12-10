import { buildPluginLoaderProgram } from '../loader';
import { loadLayoutForTests } from '../../../tests/layout.test-support';
import type { PhpProgram } from '@wpkernel/php-json-ast';

describe('buildPluginLoaderProgram', () => {
	const phpGeneratedPath = loadLayoutForTests().resolve('php.generated');

	it('emits plugin loader with controller registrations', () => {
		const plugin = {
			name: 'Demo Plugin',
			description: 'Bootstrap loader for Demo Plugin.',
			version: '1.2.3',
			requiresAtLeast: '6.7',
			requiresPhp: '8.1',
			textDomain: 'demo-plugin',
			author: 'Demo Author',
			authorUri: 'https://example.test/author',
			pluginUri: 'https://example.test/plugin',
			license: 'GPL-2.0-or-later',
			licenseUri: 'https://example.test/license',
		};

		const program = buildPluginLoaderProgram({
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin',
			sanitizedNamespace: 'demo-plugin',
			plugin,
			resourceClassNames: [
				'Demo\\Plugin\\Generated\\Rest\\BooksController',
				'Demo\\Plugin\\Generated\\Rest\\AuthorsController',
			],
			phpGeneratedPath,
		});

		expect(program).toMatchSnapshot('plugin-loader-program');
	});

	it('handles projects without resources', () => {
		const plugin = {
			name: 'Jobs Plugin',
			description: 'Bootstrap loader for Jobs Plugin.',
			version: '0.1.0',
			requiresAtLeast: '6.7',
			requiresPhp: '8.1',
			textDomain: 'jobs-plugin',
			author: 'WPKernel Contributors',
			license: 'GPL-2.0-or-later',
		};

		const program: PhpProgram = buildPluginLoaderProgram({
			origin: 'wpk.config.ts',
			namespace: 'JobsPlugin',
			sanitizedNamespace: 'jobs-plugin',
			plugin,
			resourceClassNames: [],
			phpGeneratedPath,
		});

		expect(program).toMatchSnapshot('plugin-loader-program-empty');
	});

	it('honours custom generated PHP directory for classmap', () => {
		const customPhpGeneratedPath = `${phpGeneratedPath}/custom`;
		const program = buildPluginLoaderProgram({
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin',
			sanitizedNamespace: 'demo-plugin',
			plugin: {
				name: 'Demo Plugin',
				description: 'Bootstrap loader for Demo Plugin.',
				version: '1.0.0',
				requiresAtLeast: '6.7',
				requiresPhp: '8.1',
				textDomain: 'demo-plugin',
				author: 'Demo',
				license: 'GPL-2.0-or-later',
			},
			resourceClassNames: [],
			phpGeneratedPath: customPhpGeneratedPath,
		});

		expect(program).toMatchSnapshot('plugin-loader-program-custom-path');
	});

	it('emits content model registration when provided', () => {
		const plugin = {
			name: 'Demo Plugin',
			description: 'Bootstrap loader for Demo Plugin.',
			version: '1.0.0',
			requiresAtLeast: '6.7',
			requiresPhp: '8.1',
			textDomain: 'demo-plugin',
			author: 'Demo',
			license: 'GPL-2.0-or-later',
		};

		const program = buildPluginLoaderProgram({
			origin: 'wpk.config.ts',
			namespace: 'Demo\\Plugin',
			sanitizedNamespace: 'demo-plugin',
			plugin,
			resourceClassNames: [],
			phpGeneratedPath,
			contentModel: {
				statuses: [
					{
						slug: 'publish',
						label: 'Publish',
						public: true,
						showInAdminAllList: true,
						showInAdminStatusList: true,
					},
					{
						slug: 'archived',
						label: 'Archived',
						public: false,
						showInAdminAllList: true,
						showInAdminStatusList: true,
					},
				],
				postTypes: [
					{
						slug: 'demo_item',
						labels: {
							name: 'Demo Items',
							singular_name: 'Demo Item',
							add_new_item: 'Add New Demo Item',
						},
						supports: ['title', 'editor'],
						taxonomies: ['demo_category'],
						showUi: true,
						showInMenu: true,
						showInRest: true,
						rewrite: false,
						capabilityType: 'post',
						mapMetaCap: true,
						public: false,
					},
				],
				taxonomies: [
					{
						slug: 'demo_category',
						objectTypes: ['demo_item'],
						hierarchical: true,
						labels: {
							name: 'Demo Categories',
							singular_name: 'Demo Category',
							add_new_item: 'Add New Demo Category',
						},
						showUi: true,
						showAdminColumn: true,
						showInRest: true,
					},
				],
			},
		});

		expect(program).toMatchSnapshot('plugin-loader-program-content-model');
		expect(JSON.stringify(program)).not.toContain(
			'"value":"publish","attributes":{}'
		);
	});
});
