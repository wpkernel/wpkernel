// packages/cli/src/ir/fragments/__tests__/ui.test.ts
import { createUiFragment } from '../ui';

describe('createUiFragment', () => {
	const fragment = createUiFragment();

	const baseMeta = {
		version: 1 as const,
		namespace: 'demo',
		sourcePath: 'wpk.config.ts',
		origin: 'wpk.config.ts',
		sanitizedNamespace: 'demo',
		features: [],
		ids: {
			algorithm: 'sha256' as const,
			resourcePrefix: 'res:' as const,
			schemaPrefix: 'sch:' as const,
			blockPrefix: 'blk:' as const,
			capabilityPrefix: 'cap:' as const,
		},
		redactions: [],
		limits: {
			maxConfigKB: 0,
			maxSchemaKB: 0,
			policy: 'truncate' as const,
		},
	};

	const mockOptions = {
		config: { version: 1, namespace: 'demo', schemas: {}, resources: {} },
		sourcePath: 'wpk.config.ts',
		origin: 'wpk.config.ts',
		namespace: 'demo',
	};

	function makeApplyOptions(draft: any) {
		const output = {
			draft,
			assign(partial: any) {
				Object.assign(draft, partial);
			},
		} as any;

		return {
			context: {} as any,
			input: {
				options: mockOptions,
				draft,
			} as any,
			output,
			reporter: {} as any,
		} as any;
	}

	it('derives UI descriptors from resource dataviews metadata', async () => {
		const draft = {
			meta: baseMeta,
			resources: [
				{
					name: 'jobs',
					ui: {
						admin: {
							view: 'dataview',
							menu: {
								slug: 'jobs',
								title: 'Jobs',
							},
						},
					},
				},
			],
		} as any;

		await fragment.apply(makeApplyOptions(draft));

		expect(draft.ui).toEqual({
			resources: [
				{
					resource: 'jobs',
					menu: {
						slug: 'jobs',
						title: 'Jobs',
					},
				},
			],
			loader: {
				handle: 'wp-demo-ui',
				assetPath: 'build/index.asset.json',
				scriptPath: 'build/index.js',
				localizationObject: 'wpKernelUISettings',
				namespace: 'demo',
			},
		});
	});

	it('falls back to namespace-derived preferences key and omits menu when empty', async () => {
		const draft = {
			meta: baseMeta,
			resources: [
				{
					name: 'applications',
					ui: {
						admin: {
							view: 'dataview',
							menu: {
								slug: '',
								title: '',
							},
						},
					},
				},
			],
		} as any;

		await fragment.apply(makeApplyOptions(draft));

		expect(draft.ui).toEqual({
			resources: [
				{
					resource: 'applications',
				},
			],
			loader: {
				handle: 'wp-demo-ui',
				assetPath: 'build/index.asset.json',
				scriptPath: 'build/index.js',
				localizationObject: 'wpKernelUISettings',
				namespace: 'demo',
			},
		});
	});
});
