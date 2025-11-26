import {
	buildMenuLocalizationArray,
	buildNamespaceStatements,
	normaliseRelativeDirectory,
	splitNamespace,
} from '../helpers';
import {
	buildRegisterAdminMenuFunction,
	buildRegisterUiAssetsFunction,
} from '../ui';
import type { PluginLoaderProgramConfig } from '../types';
import { loadTestLayoutSync } from '@wpkernel/test-utils/layout.test-support';

const layout = loadTestLayoutSync();

const baseConfig: PluginLoaderProgramConfig = {
	origin: 'wpk.config.ts',
	namespace: 'Acme\\Jobs',
	sanitizedNamespace: 'acme-jobs',
	plugin: {
		name: 'Demo',
		description: 'Demo plugin',
		version: '1.0.0',
		requiresAtLeast: '6.7',
		requiresPhp: '8.1',
		textDomain: 'demo',
		author: 'Demo',
		license: 'GPL',
	},
	phpGeneratedPath: layout.resolve('php.generated'),
	resourceClassNames: [],
};

describe('plugin ui helpers', () => {
	it('buildRegisterUiAssetsFunction returns null when ui is missing or empty', () => {
		expect(buildRegisterUiAssetsFunction(baseConfig)).toBeNull();
		expect(
			buildRegisterUiAssetsFunction({
				...baseConfig,
				ui: { ...minimalUi(), resources: [] },
			})
		).toBeNull();
	});

	it('buildRegisterUiAssetsFunction emits function with core bundle guards', () => {
		const fn = buildRegisterUiAssetsFunction({
			...baseConfig,
			ui: minimalUi(),
		});
		expect(fn).not.toBeNull();
		expect((fn as any).name?.name).toBe('enqueue_wpkernel_ui_assets');
		const stmts = (fn as any).stmts ?? [];
		// Should register script and enqueue
		expect(
			stmts.some((stmt: any) =>
				stmt?.expr?.name?.parts?.includes?.('wp_register_script')
			)
		).toBe(true);
		expect(
			stmts.some((stmt: any) =>
				stmt?.expr?.name?.parts?.includes?.('wp_enqueue_script')
			)
		).toBe(true);
	});

	it('buildRegisterAdminMenuFunction returns null when no menu resources', () => {
		expect(buildRegisterAdminMenuFunction(baseConfig)).toBeNull();
		expect(
			buildRegisterAdminMenuFunction({
				...baseConfig,
				ui: minimalUi(),
			})
		).toBeNull();
	});

	it('buildRegisterAdminMenuFunction emits menu registration when menu present', () => {
		const fn = buildRegisterAdminMenuFunction({
			...baseConfig,
			ui: {
				...minimalUi(),
				resources: [
					{
						resource: 'job',
						preferencesKey: 'acme/dataviews/job',
						menu: { slug: 'jobs', title: 'Jobs' },
					},
				],
			},
		});
		expect(fn).not.toBeNull();
		expect((fn as any).name?.name).toBe('register_wpkernel_admin_menu');
	});

	it('buildMenuLocalizationArray returns null when menu has no properties', () => {
		expect(buildMenuLocalizationArray({} as any)).toBeNull();
		expect(
			buildMenuLocalizationArray({
				slug: 'jobs',
				title: 'Jobs',
				position: 12,
			})
		).not.toBeNull();
	});

	it('buildNamespaceStatements includes UI helpers when config provided', () => {
		const ns = buildNamespaceStatements({
			...baseConfig,
			ui: minimalUi(),
		});
		const stmts = (ns as any).stmts ?? [];
		expect(
			stmts.some(
				(stmt: any) => stmt?.name?.name === 'enqueue_wpkernel_ui_assets'
			)
		).toBe(true);
	});

	it('normalises directories and namespaces', () => {
		expect(normaliseRelativeDirectory('./foo/bar/')).toBe('foo/bar');
		expect(splitNamespace('Acme\\Jobs\\Demo')).toEqual([
			'Acme',
			'Jobs',
			'Demo',
		]);
	});
});

function minimalUi() {
	return {
		handle: 'demo-ui',
		assetPath: 'build/index.asset.json',
		scriptPath: 'build/index.js',
		localizationObject: 'wpKernelUISettings',
		namespace: 'demo',
		resources: [
			{
				resource: 'job',
				preferencesKey: 'demo/dataviews/job',
			},
		],
	};
}
