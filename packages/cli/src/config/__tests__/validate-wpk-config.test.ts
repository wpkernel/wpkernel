import { WPKernelError } from '@wpkernel/core/error';
import type { Reporter } from '@wpkernel/core/reporter';
import type { ResourceConfig } from '@wpkernel/core/resource';
import { createReporterMock, type ReporterMock } from '@cli-tests/reporter';
import {
	validateWPKernelConfig,
	resourceRoutesValidator,
	normalizeVersion,
	runResourceChecks,
	formatValidationErrors,
} from '../validate-wpk-config';
import type { WPKernelConfigV1 } from '../types';

function createMockReporter(): {
	reporter: Reporter;
	child: ReporterMock;
} {
	const child = createReporterMock();
	const reporter = createReporterMock({ childFactory: () => child });
	return { reporter: reporter as unknown as Reporter, child };
}

describe('validateWPKernelConfig', () => {
	const baseSchema: WPKernelConfigV1['schemas'] = {
		default: {
			path: 'schemas/default.json',
			description: 'Default schema',
		},
	} as const;

	function createValidConfig(): WPKernelConfigV1 {
		return {
			version: 1,
			namespace: 'valid-namespace',
			schemas: baseSchema,
			resources: {
				thing: {
					name: 'thing',
					routes: {
						get: {
							path: '/valid/v1/things/:id',
							method: 'GET',
						},
					},
				},
			},
		} as WPKernelConfigV1;
	}

	it('returns sanitized namespace when required', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.namespace = 'Valid Namespace';

		const result = validateWPKernelConfig(config, {
			reporter,
			origin: 'wpk.config.js',
			sourcePath: '/tmp/wpk.config.js',
		});

		expect(result.namespace).toBe('valid-namespace');
		expect(result.config.namespace).toBe('valid-namespace');
		expect(child.warn).toHaveBeenCalledWith(
			'Namespace "Valid Namespace" sanitised to "valid-namespace" for CLI usage.',
			expect.objectContaining({
				original: 'Valid Namespace',
				sanitized: 'valid-namespace',
			})
		);
	});

	it('rejects cacheKeys declarations', () => {
		const { reporter } = createMockReporter();
		const config = createValidConfig();
		config.resources = {
			thing: {
				name: 'thing',
				routes: {
					list: {
						path: '/valid/v1/things',
						method: 'GET',
					},
				},
				cacheKeys: {} as ResourceConfig['cacheKeys'],
			},
		};

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.ts',
				sourcePath: '/tmp/wpk.config.ts',
			})
		).toThrow(WPKernelError);
	});

	it('rejects store overrides', () => {
		const { reporter } = createMockReporter();
		const config = createValidConfig();
		config.resources = {
			thing: {
				name: 'thing',
				routes: {
					list: {
						path: '/valid/v1/things',
						method: 'GET',
					},
				},
				store: {
					getId: () => 'invalid',
				},
			},
		};

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.ts',
				sourcePath: '/tmp/wpk.config.ts',
			})
		).toThrow(WPKernelError);
	});

	it('rejects schema functions', () => {
		const { reporter } = createMockReporter();
		const config = createValidConfig();
		config.resources = {
			thing: {
				name: 'thing',
				routes: {
					list: {
						path: '/valid/v1/things',
						method: 'GET',
					},
				},
				schema: (() => ({})) as unknown as ResourceConfig['schema'],
			},
		};

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.ts',
				sourcePath: '/tmp/wpk.config.ts',
			})
		).toThrow(WPKernelError);
	});

	it('rejects reporter overrides', () => {
		const { reporter } = createMockReporter();
		const config = createValidConfig();
		config.resources = {
			thing: {
				name: 'thing',
				routes: {
					list: {
						path: '/valid/v1/things',
						method: 'GET',
					},
				},
				reporter: (() => ({})) as unknown as ResourceConfig['reporter'],
			},
		};

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.ts',
				sourcePath: '/tmp/wpk.config.ts',
			})
		).toThrow(WPKernelError);
	});

	it('allows DataView mapQuery declarations', () => {
		const { reporter } = createMockReporter();
		const config = createValidConfig();
		config.resources = {
			thing: {
				name: 'thing',
				routes: {
					list: {
						path: '/valid/v1/things',
						method: 'GET',
					},
				},
				ui: {
					admin: {
						dataviews: {
							fields: [],
							defaultView: {},
							mapQuery: () => ({}),
						},
					},
				},
			},
		};

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.ts',
				sourcePath: '/tmp/wpk.config.ts',
			})
		).not.toThrow();
	});

	it('allows DataView getItemId declarations', () => {
		const { reporter } = createMockReporter();
		const config = createValidConfig();
		config.resources = {
			thing: {
				name: 'thing',
				routes: {
					list: {
						path: '/valid/v1/things',
						method: 'GET',
					},
				},
				ui: {
					admin: {
						dataviews: {
							fields: [],
							defaultView: {},
							getItemId: () => 'x',
						},
					},
				},
			},
		};

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.ts',
				sourcePath: '/tmp/wpk.config.ts',
			})
		).not.toThrow();
	});

	it('throws when namespace cannot be sanitized', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.namespace = '123-invalid';

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.js',
				sourcePath: '/tmp/wpk.config.js',
			})
		).toThrow(WPKernelError);
		expect(child.error).toHaveBeenCalled();
	});

	it('defaults version to 1 with warning when omitted', () => {
		const { reporter, child } = createMockReporter();

		// Treat as raw loader output, not as a typed config.
		const rawConfig = createValidConfig() as unknown as {
			version?: number;
			[key: string]: unknown;
		};

		delete rawConfig.version;

		const result = validateWPKernelConfig(rawConfig, {
			reporter,
			origin: 'wpk.config.js',
			sourcePath: '/tmp/wpk.config.js',
		});

		expect(result.config.version).toBe(1);
		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining('missing "version"'),
			expect.objectContaining({ sourcePath: '/tmp/wpk.config.js' })
		);
	});

	it('throws when version is unsupported', () => {
		const { reporter, child } = createMockReporter();

		const rawConfig = createValidConfig() as unknown as {
			version?: number;
			[key: string]: unknown;
		};

		rawConfig.version = 2;

		expect(() =>
			validateWPKernelConfig(rawConfig, {
				reporter,
				origin: 'wpk.config.js',
				sourcePath: '/tmp/wpk.config.js',
			})
		).toThrow(WPKernelError);
		expect(child.error).toHaveBeenCalled();
	});

	it('throws when config shape fails validation', () => {
		const { reporter, child } = createMockReporter();

		expect(() =>
			validateWPKernelConfig(null, {
				reporter,
				origin: 'wpk.config.js',
				sourcePath: '/tmp/wpk.config.js',
			})
		).toThrow(WPKernelError);
		expect(child.error).toHaveBeenCalledWith(
			expect.stringContaining('Invalid wpk config discovered'),
			expect.objectContaining({
				errors: expect.any(Array),
			})
		);
	});

	it('throws when identity param does not exist in routes', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.resources.thing!.identity = { type: 'string', param: 'slug' };

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.js',
				sourcePath: '/tmp/wpk.config.js',
			})
		).toThrow(WPKernelError);
		expect(child.error).toHaveBeenCalledWith(
			expect.stringContaining('Identity param'),
			expect.objectContaining({
				resourceName: 'thing',
				identity: { type: 'string', param: 'slug' },
			})
		);
	});

	it('warns when wp-post storage omits postType', () => {
		const { reporter, child } = createMockReporter();
		const config = createValidConfig();
		config.resources.thing!.routes.list = {
			path: '/valid/v1/things',
			method: 'GET',
		};
		config.resources.thing!.storage = {
			mode: 'wp-post',
		};

		const result = validateWPKernelConfig(config, {
			reporter,
			origin: 'wpk.config.js',
			sourcePath: '/tmp/wpk.config.js',
		});

		expect(result.config.resources.thing!.storage).toEqual(
			expect.objectContaining({ mode: 'wp-post' })
		);
		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'wp-post storage without specifying "postType"'
			),
			expect.objectContaining({ resourceName: 'thing' })
		);
	});

	it('throws when adapters.php is not a function', () => {
		const { reporter, child } = createMockReporter();

		const rawConfig = {
			...createValidConfig(),
			adapters: {
				// Intentionally invalid: runtime validator should reject this.
				php: 'not-a-function',
			},
		} as unknown;

		expect(() =>
			validateWPKernelConfig(rawConfig, {
				reporter,
				origin: 'wpk.config.js',
				sourcePath: '/tmp/wpk.config.js',
			})
		).toThrow(WPKernelError);
		expect(child.error).toHaveBeenCalled();
	});

	it('accepts blocks.mode "ssr"', () => {
		const { reporter } = createMockReporter();
		const config: any = createValidConfig();
		config.resources.thing.blocks = { mode: 'ssr' };

		expect(() =>
			validateWPKernelConfig(config, {
				reporter,
				origin: 'wpk.config.js',
				sourcePath: '/tmp/wpk.config.js',
			})
		).not.toThrow();
	});
});

describe('validateWPKernelConfig helpers', () => {
	it('requires at least one resource route when validating', () => {
		const state = { errors: [] as string[] };

		const result = resourceRoutesValidator(
			{ list: undefined, get: undefined } as never,
			state as never
		);

		expect(result).toBe(false);
		expect(state.errors).toContain(
			'resources[].routes must define at least one operation.'
		);
	});

	it('normalizes missing versions and reports errors for unsupported ones', () => {
		const { reporter } = createMockReporter();
		const normalized = normalizeVersion(
			undefined,
			reporter,
			'/tmp/config.ts'
		);
		expect(normalized).toBe(1);
		expect(
			(reporter as unknown as { warn: jest.Mock }).warn
		).toHaveBeenCalled();

		expect(() =>
			normalizeVersion(2 as never, reporter, '/tmp/config.ts')
		).toThrow(WPKernelError);
	});

	it('warns when identity metadata exists without routes', () => {
		const { child } = createMockReporter();

		runResourceChecks(
			'thing',
			{
				name: 'thing',
				identity: { type: 'number', param: 'id' },
				routes: {} as never,
			} as ResourceConfig,
			child as unknown as Reporter
		);

		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining('defines identity metadata but no routes'),
			expect.objectContaining({ resourceName: 'thing' })
		);
	});

	it('formats validation errors into human readable strings', () => {
		const message = formatValidationErrors(
			['first', 'second'],
			'/tmp/config.ts',
			'wpk.config.ts'
		);

		expect(message).toMatch('Invalid wpk config discovered');
		expect(message).toContain('first');
		expect(message).toContain('second');
	});

	it('throws when resource has duplicate routes', () => {
		const { child } = createMockReporter();

		expect(() =>
			runResourceChecks(
				'thing',
				{
					name: 'thing',
					routes: {
						list: {
							path: '/things',
							method: 'GET',
						},
						get: {
							path: '/things',
							method: 'GET',
						},
					},
				} as ResourceConfig,
				child as unknown as Reporter
			)
		).toThrow(WPKernelError);

		expect(child.error).toHaveBeenCalledWith(
			expect.stringContaining('duplicate route'),
			expect.objectContaining({
				resourceName: 'thing',
				method: 'GET',
				path: '/things',
			})
		);
	});

	it('warns when write routes lack capability', () => {
		const { child } = createMockReporter();

		runResourceChecks(
			'thing',
			{
				name: 'thing',
				routes: {
					create: {
						path: '/things',
						method: 'POST',
					},
					update: {
						path: '/things/:id',
						method: 'PUT',
					},
				},
			} as ResourceConfig,
			child as unknown as Reporter
		);

		expect(child.warn).toHaveBeenCalledTimes(2);
		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining('uses a write method but has no'),
			expect.objectContaining({
				resourceName: 'thing',
				routeKey: 'create',
				method: 'POST',
			})
		);
		expect(child.warn).toHaveBeenCalledWith(
			expect.stringContaining('uses a write method but has no'),
			expect.objectContaining({
				resourceName: 'thing',
				routeKey: 'update',
				method: 'PUT',
			})
		);
	});

	it('does not warn when write routes have capability', () => {
		const { child } = createMockReporter();

		runResourceChecks(
			'thing',
			{
				name: 'thing',
				routes: {
					create: {
						path: '/things',
						method: 'POST',
						capability: 'create_things',
					},
				},
			} as ResourceConfig,
			child as unknown as Reporter
		);

		expect(child.warn).not.toHaveBeenCalled();
	});
});
