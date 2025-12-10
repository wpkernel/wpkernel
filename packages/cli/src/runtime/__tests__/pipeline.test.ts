import type { IRCapabilityMap } from '../../ir/publicTypes';
import { WPKernelError } from '@wpkernel/core/error';
import { createHelper } from '../createHelper';
import { createPipeline } from '../createPipeline';
import type { WPKernelConfigV1 } from '../../config/types';
import type {
	BuilderApplyOptions,
	BuilderHelper,
	FragmentApplyOptions,
	FragmentHelper,
} from '../types';
import {
	buildBuilderHelper,
	buildFragmentHelper,
	buildPipelineExtension,
} from '../../../tests/runtime/pipeline.fixtures.test-support';
import { withPipelineHarness } from '../../../tests/runtime/pipeline.test-support';
import { loadTestLayoutSync } from '../../../tests/layout.test-support';
import { buildTestArtifactsPlan, makeIrMeta } from '@cli-tests/ir.test-support';

const DUMMY_LAYOUT = {
	resolve(id: string) {
		return id;
	},
	all: {},
};

type MetaHelperOptions = {
	readonly key?: string;
	readonly namespace?: string;
	readonly sanitizedNamespace?: string;
	readonly outputDir?: string;
	readonly mode?: FragmentHelper['mode'];
	readonly onApply?: () => void;
};

function createMetaHelper({
	key = 'ir.meta.test',
	namespace = 'test-namespace',
	sanitizedNamespace = namespace,
	outputDir,
	mode = 'override',
	onApply,
}: MetaHelperOptions = {}): FragmentHelper {
	const resolvedOutputDir = outputDir ?? 'php.generated';
	return createHelper({
		key,
		kind: 'fragment',
		mode,
		apply({ output }: FragmentApplyOptions) {
			onApply?.();
			output.assign({
				meta: makeIrMeta(namespace, {
					sanitizedNamespace,
					sourcePath: 'config.ts',
					origin: 'typescript',
				}),
				php: {
					namespace: sanitizedNamespace,
					autoload: 'inc/',
					outputDir: resolvedOutputDir,
				},
			});
		},
	});
}

type CollectionHelperOptions = {
	readonly key?: string;
	readonly dependsOn?: string;
	readonly capabilityMap?: IRCapabilityMap;
	readonly onApply?: () => void;
};

function createCollectionHelper({
	key = 'ir.collection.test',
	dependsOn = 'ir.meta.test',
	capabilityMap = buildCapabilityMap(),
	onApply,
}: CollectionHelperOptions = {}): FragmentHelper {
	return createHelper({
		key,
		kind: 'fragment',
		dependsOn: [dependsOn],
		apply({ output }: FragmentApplyOptions) {
			onApply?.();
			output.assign({
				schemas: [],
				resources: [],
				capabilities: [],
				blocks: [],
				capabilityMap,
			});
		},
	});
}

type CapabilityHelperOptions = {
	readonly key?: string;
	readonly dependsOn?: string;
	readonly capabilityMap?: IRCapabilityMap;
	readonly onApply?: () => void;
};

function createCapabilityHelper({
	key = 'ir.capability-map.test',
	dependsOn = 'ir.collection.test',
	capabilityMap = buildCapabilityMap(),
	onApply,
}: CapabilityHelperOptions = {}): FragmentHelper {
	return createHelper({
		key,
		kind: 'fragment',
		dependsOn: [dependsOn],
		apply({ output }: FragmentApplyOptions) {
			onApply?.();
			output.assign({ capabilityMap });
		},
	});
}

type ValidationHelperOptions = {
	readonly key?: string;
	readonly dependsOn?: string;
	readonly onApply?: () => void;
};

function createValidationHelper({
	key = 'ir.validation.test',
	dependsOn = 'ir.capability-map.test',
	onApply,
}: ValidationHelperOptions = {}): FragmentHelper {
	return createHelper({
		key,
		kind: 'fragment',
		dependsOn: [dependsOn],
		apply() {
			onApply?.();
		},
	});
}

function buildCapabilityMap(): IRCapabilityMap {
	return {
		sourcePath: undefined,
		definitions: [],
		fallback: { capability: 'manage_options', appliesTo: 'resource' },
		missing: [],
		unused: [],
		warnings: [],
	};
}

describe('createPipeline', () => {
	const config: WPKernelConfigV1 = {
		version: 1,
		namespace: 'test-namespace',
		schemas: {},
		resources: {},
	};

	const layout = loadTestLayoutSync();

	const withConfiguredPipeline = (
		run: Parameters<typeof withPipelineHarness>[0],
		options?: Omit<Parameters<typeof withPipelineHarness>[1], 'config'>
	): ReturnType<typeof withPipelineHarness> =>
		withPipelineHarness(
			async (ctx) => {
				ctx.pipeline.ir.use(
					createHelper({
						key: 'ir.layout.test',
						kind: 'fragment',
						mode: 'override',
						apply({ output }) {
							output.assign({ layout: DUMMY_LAYOUT });
						},
					})
				);
				ctx.pipeline.ir.use(
					createHelper({
						key: 'ir.artifacts.test',
						kind: 'fragment',
						mode: 'override',
						dependsOn: ['ir.layout.test'],
						apply({ input, output }) {
							// Provide a minimal artifacts plan so pipeline finalisation succeeds.
							output.assign({
								artifacts: buildTestArtifactsPlan(
									input.draft.layout as any
								),
							});
						},
					})
				);
				await run(ctx);
			},
			{ config, ...(options ?? {}) }
		);

	it('orders helpers by dependency metadata and executes builders', async () => {
		await withConfiguredPipeline(async ({ pipeline, run }) => {
			const runOrder: string[] = [];
			const metaHelper = createMetaHelper({
				namespace: 'test-namespace',
				sanitizedNamespace: 'test-namespace',
				outputDir: layout.resolve('php.generated'),
				onApply: () => runOrder.push('meta'),
			});
			const collectionHelper = createCollectionHelper({
				dependsOn: 'ir.meta.test',
				onApply: () => runOrder.push('collection'),
			});
			const capabilityHelper = createCapabilityHelper({
				dependsOn: 'ir.collection.test',
				onApply: () => runOrder.push('capability'),
			});
			const validationHelper = createValidationHelper({
				dependsOn: 'ir.capability-map.test',
				onApply: () => runOrder.push('validation'),
			});

			const builderHelper = createHelper({
				key: 'builder.test',
				kind: 'builder',
				apply({ reporter }: BuilderApplyOptions) {
					runOrder.push('builder');
					reporter.debug('builder executed');
				},
			});

			pipeline.ir.use(metaHelper);
			pipeline.ir.use(collectionHelper);
			pipeline.ir.use(capabilityHelper);
			pipeline.ir.use(validationHelper);
			pipeline.builders.use(builderHelper);

			const { steps, ir } = await run();

			expect(ir.meta.namespace).toBe('test-namespace');
			expect(runOrder).toEqual([
				'meta',
				'collection',
				'capability',
				'validation',
				'builder',
			]);
			expect(steps.map((step) => step.key)).toEqual([
				'ir.layout.test',
				'ir.artifacts.test',
				'ir.meta.test',
				'ir.collection.test',
				'ir.capability-map.test',
				'ir.validation.test',
				'builder.test',
			]);
		});
	});

	it('throws when multiple overrides register for the same key', async () => {
		const pipeline = createPipeline({
			builderProvidedKeys: [
				'builder.generate.php.controller.resources',
				'builder.generate.php.capability',
				'builder.generate.php.registration.persistence',
				'builder.generate.php.plugin-loader',
				'builder.generate.php.index',
			],
		});

		pipeline.ir.use(
			createHelper({
				key: 'ir.meta.test',
				kind: 'fragment',
				mode: 'override',
				apply() {
					return Promise.resolve();
				},
			})
		);

		expect(() =>
			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.test',
					kind: 'fragment',
					mode: 'override',
					apply() {
						return Promise.resolve();
					},
				})
			)
		).toThrow(/Multiple overrides/);
	});

	it('rejects helpers registered under the wrong surface', () => {
		const pipeline = createPipeline({
			builderProvidedKeys: [
				'builder.generate.php.controller.resources',
				'builder.generate.php.capability',
				'builder.generate.php.registration.persistence',
				'builder.generate.php.plugin-loader',
				'builder.generate.php.index',
			],
		});

		const builder = buildBuilderHelper({
			key: 'builder.wrong-surface',
			apply: async () => undefined,
		});

		expect(() =>
			pipeline.ir.use(builder as unknown as FragmentHelper)
		).toThrow(/Attempted to register helper/);

		const fragment = buildFragmentHelper({
			key: 'ir.wrong-surface',
			apply: async () => undefined,
		});

		expect(() =>
			pipeline.builders.use(fragment as unknown as BuilderHelper)
		).toThrow(/Attempted to register helper/);
	});

	it('detects dependency cycles when ordering helpers', async () => {
		await withConfiguredPipeline(async ({ pipeline, run }) => {
			pipeline.ir.use(
				createHelper({
					key: 'ir.first',
					kind: 'fragment',
					dependsOn: ['ir.second'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.second',
					kind: 'fragment',
					dependsOn: ['ir.first'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			await expect(async () => {
				await run({ namespace: 'cycle' });
			}).rejects.toThrow(WPKernelError);
		});
	});

	it('supports top-level helper registration and extensions', async () => {
		await withConfiguredPipeline(async ({ pipeline, run }) => {
			const executionOrder: string[] = [];

			const metaHelper = createMetaHelper({
				key: 'ir.meta.inline',
				namespace: 'ext',
				sanitizedNamespace: 'ext',
				outputDir: layout.resolve('php.generated'),
				onApply: () => executionOrder.push('meta'),
			});

			const capabilityHelper = createCapabilityHelper({
				key: 'ir.capability-map.inline',
				dependsOn: 'ir.meta.inline',
				onApply: () => executionOrder.push('capability'),
			});

			const builderHelper = createHelper({
				key: 'builder.inline',
				kind: 'builder',
				apply({ reporter }: BuilderApplyOptions) {
					reporter.info('inline builder');
					executionOrder.push('builder.inline');
				},
			});

			const extensionBuilder = createHelper({
				key: 'builder.extension',
				kind: 'builder',
				apply() {
					executionOrder.push('builder.extension');
				},
			});

			pipeline.use(metaHelper);
			pipeline.use(builderHelper);
			pipeline.ir.use(capabilityHelper);
			const register = jest.fn((pipe) => {
				pipe.builders.use(extensionBuilder);
			});
			const extensionResult = pipeline.extensions.use(
				buildPipelineExtension({ register })
			);

			expect(register).toHaveBeenCalledWith(pipeline);
			expect(extensionResult).toBeUndefined();

			const { steps } = await run({ namespace: 'ext' });

			expect(executionOrder.slice(0, 2)).toEqual(['meta', 'capability']);
			expect(new Set(executionOrder.slice(2))).toEqual(
				new Set(['builder.inline', 'builder.extension'])
			);
			expect(steps.map((step) => step.key)).toContain(
				'builder.extension'
			);
		});
	});

	it('awaits asynchronous extension registration before execution', async () => {
		await withConfiguredPipeline(async ({ pipeline, run }) => {
			const commit = jest.fn(async () => undefined);
			const rollback = jest.fn(async () => undefined);
			const hookSpy = jest.fn();

			pipeline.ir.use(
				createMetaHelper({
					key: 'ir.meta.async',
					namespace: 'async',
					sanitizedNamespace: 'Async',
					outputDir: layout.resolve('php.generated'),
				})
			);

			pipeline.ir.use(
				createCollectionHelper({
					key: 'ir.resources.async',
					dependsOn: 'ir.meta.async',
				})
			);

			pipeline.ir.use(
				createValidationHelper({
					key: 'ir.validation.async',
					dependsOn: 'ir.resources.async',
				})
			);

			await pipeline.extensions.use({
				key: 'extension.async',
				async register() {
					return async (options) => {
						hookSpy(options.artifact.meta.namespace);
						return { commit, rollback };
					};
				},
			});

			pipeline.builders.use(
				createHelper({
					key: 'builder.async',
					kind: 'builder',
					apply({ reporter }: BuilderApplyOptions) {
						reporter.debug('async builder executed');
					},
				})
			);

			await run({ namespace: 'async' });

			expect(hookSpy).toHaveBeenCalledWith('async');
			expect(commit).toHaveBeenCalledTimes(1);
			expect(rollback).not.toHaveBeenCalled();
		});
	});

	it('applies extension IR updates and records builder writes', async () => {
		await withConfiguredPipeline(async ({ pipeline, run, reporter }) => {
			const commit = jest.fn(async () => undefined);
			const recordedActions: string[] = [];

			pipeline.ir.use(
				createMetaHelper({
					key: 'ir.meta.update',
					namespace: 'initial',
					sanitizedNamespace: 'Initial',
					outputDir: layout.resolve('php.generated'),
				})
			);

			pipeline.ir.use(
				createCollectionHelper({
					key: 'ir.collection.update',
					dependsOn: 'ir.meta.update',
				})
			);

			pipeline.ir.use(
				createValidationHelper({
					key: 'ir.validation.update',
					dependsOn: 'ir.collection.update',
				})
			);

			pipeline.extensions.use({
				key: 'extension.ir-update',
				register() {
					return async ({ artifact }) => ({
						artifact: {
							...artifact,
							meta: {
								...artifact.meta,
								namespace: 'updated',
								sanitizedNamespace: 'Updated',
							},
						},
						commit,
					});
				},
			});

			pipeline.builders.use(
				createHelper({
					key: 'builder.writer',
					kind: 'builder',
					apply({ output }: BuilderApplyOptions) {
						output.queueWrite({
							file: 'generated.txt',
							contents: 'generated',
						});
						recordedActions.push('generated.txt');
					},
				})
			);

			const result = await run({ namespace: 'update' });

			expect(result.ir.meta.namespace).toBe('updated');
			expect(commit).toHaveBeenCalledTimes(1);
			expect(recordedActions).toEqual(['generated.txt']);
			expect(reporter.warn).not.toHaveBeenCalled();
		});
	});

	it('orders builder helpers by priority, key, and registration order', async () => {
		await withConfiguredPipeline(async ({ pipeline, run }) => {
			const builderOrder: string[] = [];

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.priority',
					kind: 'fragment',
					mode: 'override',
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							meta: makeIrMeta('priority', {
								sanitizedNamespace: 'Priority',
								origin: 'typescript',
								sourcePath: 'config.ts',
							}),
							php: {
								namespace: 'Priority',
								autoload: 'inc/',
								outputDir: layout.resolve('php.generated'),
							},
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.collection.priority',
					kind: 'fragment',
					dependsOn: ['ir.meta.priority'],
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							schemas: [],
							resources: [],
							capabilities: [],
							blocks: [],
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.capability-map.priority',
					kind: 'fragment',
					dependsOn: ['ir.collection.priority'],
					apply({ output }: FragmentApplyOptions) {
						output.assign({ capabilityMap: buildCapabilityMap() });
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.priority',
					kind: 'fragment',
					dependsOn: ['ir.capability-map.priority'],
					apply() {
						// no-op validation stub
					},
				})
			);

			const builderHigh = createHelper({
				key: 'builder.high-priority',
				kind: 'builder',
				priority: 5,
				async apply({ reporter }: BuilderApplyOptions) {
					builderOrder.push('high');
					reporter.debug('high priority builder executed');
				},
			});

			const builderAlpha = createHelper({
				key: 'builder.alpha',
				kind: 'builder',
				priority: 1,
				async apply({ reporter }: BuilderApplyOptions) {
					builderOrder.push('alpha');
					reporter.debug('alpha builder executed');
				},
			});

			const builderBeta = createHelper({
				key: 'builder.beta',
				kind: 'builder',
				priority: 1,
				apply({ reporter }: BuilderApplyOptions) {
					builderOrder.push('beta');
					reporter.debug('beta builder executed');
				},
			});

			const duplicateFirst = createHelper({
				key: 'builder.duplicate',
				kind: 'builder',
				async apply({ reporter }: BuilderApplyOptions) {
					builderOrder.push('duplicate-1');
					reporter.debug('duplicate builder (first) executed');
				},
			});

			const duplicateSecond = createHelper({
				key: 'builder.duplicate',
				kind: 'builder',
				async apply({ reporter }: BuilderApplyOptions) {
					builderOrder.push('duplicate-2');
					reporter.debug('duplicate builder (second) executed');
				},
			});

			pipeline.builders.use(duplicateFirst);
			pipeline.builders.use(builderBeta);
			pipeline.builders.use(builderHigh);
			pipeline.builders.use(duplicateSecond);
			pipeline.builders.use(builderAlpha);

			const { steps } = await run({ namespace: 'priority' });

			expect(builderOrder).toEqual([
				'high',
				'alpha',
				'beta',
				'duplicate-1',
				'duplicate-2',
			]);

			const builderSteps = steps.filter(
				(step) => step.kind === 'builder'
			);
			expect(builderSteps.map((step) => step.key)).toEqual([
				'builder.high-priority',
				'builder.alpha',
				'builder.beta',
				'builder.duplicate',
				'builder.duplicate',
			]);
		});
	});

	it('commits extension hooks after successful execution', async () => {
		await withConfiguredPipeline(async ({ pipeline, run }) => {
			const commit = jest.fn();
			const rollback = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.commit',
					kind: 'fragment',
					mode: 'override',
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							meta: makeIrMeta('priority', {
								sanitizedNamespace: 'commit',
								origin: 'typescript',
								sourcePath: 'config.ts',
							}),
							php: {
								namespace: 'Commit',
								autoload: 'inc/',
								outputDir: layout.resolve('php.generated'),
							},
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.commit',
					kind: 'fragment',
					dependsOn: ['ir.meta.commit'],
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							schemas: [],
							resources: [],
							capabilities: [],
							blocks: [],
							capabilityMap: buildCapabilityMap(),
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.commit',
					kind: 'fragment',
					dependsOn: ['ir.resources.commit'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.builders.use(
				createHelper({
					key: 'builder.commit',
					kind: 'builder',
					async apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.commit',
				register() {
					return async () => ({
						commit,
						rollback,
					});
				},
			});

			await run({ namespace: 'commit' });

			expect(commit).toHaveBeenCalledTimes(1);
			expect(rollback).not.toHaveBeenCalled();
		});
	});

	it('rolls back executed extension hooks when a later hook throws', async () => {
		await withConfiguredPipeline(async ({ pipeline, run, reporter }) => {
			const commit = jest.fn();
			const rollback = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.extension-failure',
					kind: 'fragment',
					mode: 'override',
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							meta: makeIrMeta('priority', {
								sanitizedNamespace: 'ExtensionFailure',
								origin: 'typescript',
								sourcePath: 'config.ts',
							}),
							php: {
								namespace: 'ExtensionFailure',
								autoload: 'inc/',
								outputDir: layout.resolve('php.generated'),
							},
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.extension-failure',
					kind: 'fragment',
					dependsOn: ['ir.meta.extension-failure'],
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							schemas: [],
							resources: [],
							capabilities: [],
							blocks: [],
							capabilityMap: buildCapabilityMap(),
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.extension-failure',
					kind: 'fragment',
					dependsOn: ['ir.resources.extension-failure'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.rollback-before-throw',
				register() {
					return async () => ({
						commit,
						rollback,
					});
				},
			});

			pipeline.extensions.use({
				key: 'extension.throwing',
				register() {
					return async () => {
						throw new Error('extension failure');
					};
				},
			});

			await expect(
				run({ namespace: 'extension-failure' })
			).rejects.toThrow('extension failure');

			expect(commit).not.toHaveBeenCalled();
			expect(rollback).toHaveBeenCalledTimes(1);
			expect(reporter.warn).not.toHaveBeenCalled();
		});
	});

	it('rolls back extension hooks when builders fail', async () => {
		await withConfiguredPipeline(async ({ pipeline, run, reporter }) => {
			const commit = jest.fn();
			const rollback = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.rollback',
					kind: 'fragment',
					mode: 'override',
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							meta: makeIrMeta('priority', {
								sanitizedNamespace: 'rollback',
								origin: 'typescript',
								sourcePath: 'config.ts',
							}),
							php: {
								namespace: 'Rollback',
								autoload: 'inc/',
								outputDir: layout.resolve('php.generated'),
							},
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.rollback',
					kind: 'fragment',
					dependsOn: ['ir.meta.rollback'],
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							schemas: [],
							resources: [],
							capabilities: [],
							blocks: [],
							capabilityMap: buildCapabilityMap(),
						});
					},
				})
			);
			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.rollback',
					kind: 'fragment',
					dependsOn: ['ir.resources.rollback'],
					apply() {
						return Promise.resolve();
					},
				})
			);

			pipeline.builders.use(
				createHelper({
					key: 'builder.rollback',
					kind: 'builder',
					async apply() {
						throw new Error('builder failure');
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.rollback',
				register() {
					return async () => ({
						commit,
						rollback,
					});
				},
			});

			await expect(run({ namespace: 'rollback' })).rejects.toThrow(
				'builder failure'
			);

			expect(commit).not.toHaveBeenCalled();
			expect(rollback).toHaveBeenCalledTimes(1);
			expect(reporter.warn).not.toHaveBeenCalled();
		});
	});

	it('skips rollback when extension does not provide a rollback handler', async () => {
		await withConfiguredPipeline(async ({ pipeline, run, reporter }) => {
			const commit = jest.fn();

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.rollback-missing',
					kind: 'fragment',
					mode: 'override',
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							meta: makeIrMeta('priority', {
								sanitizedNamespace: 'RollbackMissing',
								origin: 'typescript',
								sourcePath: 'config.ts',
							}),
							php: {
								namespace: 'RollbackMissing',
								autoload: 'inc/',
								outputDir: layout.resolve('php.generated'),
							},
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.rollback-missing',
					kind: 'fragment',
					dependsOn: ['ir.meta.rollback-missing'],
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							schemas: [],
							resources: [],
							capabilities: [],
							blocks: [],
							capabilityMap: buildCapabilityMap(),
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.rollback-missing',
					kind: 'fragment',
					dependsOn: ['ir.resources.rollback-missing'],
					apply() {
						// validation no-op
					},
				})
			);

			pipeline.builders.use(
				createHelper({
					key: 'builder.rollback-missing',
					kind: 'builder',
					async apply() {
						throw new Error('builder failure');
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.rollback-missing',
				register() {
					return async () => ({ commit });
				},
			});

			await expect(
				run({ namespace: 'rollback-missing' })
			).rejects.toThrow('builder failure');

			expect(commit).not.toHaveBeenCalled();
			expect(reporter.warn).not.toHaveBeenCalled();
		});
	});

	it('warns when extension rollback fails', async () => {
		await withConfiguredPipeline(async ({ pipeline, run, reporter }) => {
			const commit = jest.fn();

			const rollback = jest
				.fn()
				.mockRejectedValue(new Error('rollback failure'));

			pipeline.ir.use(
				createHelper({
					key: 'ir.meta.rollback-warning',
					kind: 'fragment',
					mode: 'override',
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							meta: makeIrMeta('priority', {
								sanitizedNamespace: 'RollbackMissing',
								origin: 'typescript',
								sourcePath: 'config.ts',
							}),
							php: {
								namespace: 'RollbackWarning',
								autoload: 'inc/',
								outputDir: layout.resolve('php.generated'),
							},
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.resources.rollback-warning',
					kind: 'fragment',
					dependsOn: ['ir.meta.rollback-warning'],
					apply({ output }: FragmentApplyOptions) {
						output.assign({
							schemas: [],
							resources: [],
							capabilities: [],
							blocks: [],
							capabilityMap: buildCapabilityMap(),
						});
					},
				})
			);

			pipeline.ir.use(
				createHelper({
					key: 'ir.validation.rollback-warning',
					kind: 'fragment',
					dependsOn: ['ir.resources.rollback-warning'],
					apply() {
						// validation no-op
					},
				})
			);

			pipeline.builders.use(
				createHelper({
					key: 'builder.rollback-warning',
					kind: 'builder',
					async apply() {
						throw new Error('builder failure');
					},
				})
			);

			pipeline.extensions.use({
				key: 'extension.rollback-warning',
				register() {
					return async () => ({ commit, rollback });
				},
			});

			await expect(
				run({ namespace: 'rollback-warning' })
			).rejects.toThrow('builder failure');

			expect(commit).not.toHaveBeenCalled();
			expect(rollback).toHaveBeenCalledTimes(1);
			expect(reporter.warn).toHaveBeenCalledWith(
				'Pipeline extension rollback failed.',
				{
					error: 'rollback failure',
					extensions: ['extension.rollback-warning'],
				}
			);
		});
	});
});
