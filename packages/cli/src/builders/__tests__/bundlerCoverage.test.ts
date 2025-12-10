import {
	resolveBundlerNamespace,
	resolveBundlerVersion,
} from '../bundler.state';
import { resolveBundlerPaths } from '../bundler.paths';
import { hasBundlerDataViews, applyBundlerGeneration } from '../bundler.runner';
import type {
	BuilderInput,
	PipelineContext,
	BuilderOutput,
} from '../../runtime/types';
import type { IRv1 } from '../../ir/publicTypes';
import type { Workspace } from '../../workspace/types';
import { DEFAULT_ENTRY_POINT } from '../bundler.constants';
import { makeIr } from '@cli-tests/ir.test-support';
import { buildRollupDriverArtifacts } from '../bundler.artifacts';

// Mock buildRollupDriverArtifacts to avoid complex dependency logic
jest.mock('../bundler.artifacts', () => ({
	buildRollupDriverArtifacts: jest.fn().mockReturnValue({
		config: { input: { index: 'mocked-input' }, alias: [] },
		assetManifest: {},
	}),
}));

// Mock ensureBundlerDependencies and ensureBundlerScripts
jest.mock('../bundler.package', () => ({
	ensureBundlerDependencies: jest
		.fn()
		.mockResolvedValue({ pkg: {}, changed: false }),
	ensureBundlerScripts: jest
		.fn()
		.mockReturnValue({ pkg: {}, changed: false }),
}));

describe('bundler.state coverage', () => {
	it('resolveBundlerNamespace returns sanitizedNamespace from IR', () => {
		const input = {
			ir: {
				meta: {
					sanitizedNamespace: 'sanitized-ns',
				},
			},
			options: {
				namespace: 'fallback-ns',
				origin: 'wpk.config.ts',
				sourcePath: 'wpk.config.ts',
			},
		} as unknown as BuilderInput;
		expect(resolveBundlerNamespace(input)).toBe('sanitized-ns');
	});

	it('resolveBundlerNamespace falls back to options namespace', () => {
		const input = {
			ir: {
				meta: undefined,
			},
			options: {
				namespace: 'config-ns',
				origin: 'wpk.config.ts',
				sourcePath: 'wpk.config.ts',
			},
		} as unknown as BuilderInput;
		expect(resolveBundlerNamespace(input)).toBe('config-ns');
	});

	it('resolveBundlerVersion returns version from IR meta', () => {
		const input = {
			ir: {
				meta: {
					plugin: {
						version: '1.0.0',
					},
				},
			},
		} as unknown as BuilderInput;
		expect(resolveBundlerVersion(input, null)).toBe('1.0.0');
	});

	it('resolveBundlerVersion falls back to pkg version', () => {
		const input = {
			ir: {
				meta: undefined,
			},
		} as unknown as BuilderInput;
		expect(resolveBundlerVersion(input, { version: '2.0.0' } as any)).toBe(
			'2.0.0'
		);
	});

	it('resolveBundlerVersion defaults to 0.0.0', () => {
		const input = {
			ir: {
				meta: undefined,
			},
		} as unknown as BuilderInput;
		expect(resolveBundlerVersion(input, null)).toBe('0.0.0');
	});
});

describe('bundler.paths coverage', () => {
	it('resolveBundlerPaths throws if ir is null', () => {
		expect(() => resolveBundlerPaths(null)).toThrow(
			'Bundler paths require a resolved IR layout.'
		);
	});

	it('resolveBundlerPaths throws if ir.layout is missing', () => {
		expect(() => resolveBundlerPaths({} as IRv1)).toThrow(
			'Bundler paths require a resolved IR layout.'
		);
	});
});

describe('bundler.runner coverage', () => {
	it('hasBundlerDataViews returns false if no resources', () => {
		const input = {
			ir: {
				resources: [],
			},
		} as unknown as BuilderInput;
		expect(hasBundlerDataViews(input)).toBe(false);
	});

	it('hasBundlerDataViews returns false if ir is undefined', () => {
		const input = {
			ir: undefined,
		} as unknown as BuilderInput;
		expect(hasBundlerDataViews(input)).toBe(false);
	});

	it('hasBundlerDataViews returns true if resource has ui.admin.view = dataviews', () => {
		const input = {
			ir: {
				resources: [
					{
						ui: {
							admin: {
								view: 'dataviews',
							},
						},
					},
				],
			},
		} as unknown as BuilderInput;
		expect(hasBundlerDataViews(input)).toBe(true);
	});

	it('hasBundlerDataViews returns true if resource has ui.admin.dataviews object', () => {
		const input = {
			ir: {
				resources: [
					{
						ui: {
							admin: {
								dataviews: {},
							},
						},
					},
				],
			},
		} as unknown as BuilderInput;
		expect(hasBundlerDataViews(input)).toBe(true);
	});

	it('applyBundlerGeneration uses default entry point and alias root when layout resolution fails', async () => {
		const workspace = {
			readText: jest.fn().mockResolvedValue('{}'),
			resolve: jest.fn((p) => `/abs/${p}`),
			begin: jest.fn(),
			writeJson: jest.fn(),
			write: jest.fn(),
			commit: jest.fn().mockResolvedValue({ writes: [] }),
			root: '/root',
		} as unknown as Workspace;

		const context = {
			workspace,
		} as unknown as PipelineContext;

		const output = {
			queueWrite: jest.fn(),
		} as unknown as BuilderOutput;

		const reporter = {
			debug: jest.fn(),
		};

		const ir = makeIr({
			resources: [
				{
					name: 'demo',
					id: 'res:demo',
					ui: { admin: {} },
				} as any,
			],
		});

		const input = {
			phase: 'generate',
			ir,
			options: {
				namespace: ir.meta.namespace,
				origin: ir.meta.origin,
				sourcePath: ir.meta.sourcePath,
			},
		} as BuilderInput;

		await applyBundlerGeneration({
			context,
			input,
			output,
			reporter: reporter as any,
		});

		const expectedAlias = workspace.resolve(ir.artifacts.bundler.aliasRoot);

		expect(buildRollupDriverArtifacts).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				entryPoint:
					ir.artifacts.bundler.entryPoint ?? DEFAULT_ENTRY_POINT,
				aliasRoot: expectedAlias,
			})
		);
	});
});
