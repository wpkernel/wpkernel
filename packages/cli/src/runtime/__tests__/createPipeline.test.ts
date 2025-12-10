import { createPipeline } from '../createPipeline';
import { WPKernelError } from '@wpkernel/core/error';
import type {
	BuilderHelper,
	FragmentHelper,
	FragmentInput,
	FragmentOutput,
	PipelineContext,
} from '../types';
import {
	buildBuilderHelper,
	buildFragmentHelper,
} from '../../../tests/runtime/pipeline.fixtures.test-support';

describe('createPipeline registration', () => {
	it('throws when registering a fragment with wrong kind', () => {
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
		).toThrow(WPKernelError);
	});

	it('throws when registering a builder with wrong kind', () => {
		const pipeline = createPipeline({
			builderProvidedKeys: [
				'builder.generate.php.controller.resources',
				'builder.generate.php.capability',
				'builder.generate.php.registration.persistence',
				'builder.generate.php.plugin-loader',
				'builder.generate.php.index',
			],
		});

		const fragment = buildFragmentHelper<
			PipelineContext,
			FragmentInput,
			FragmentOutput,
			PipelineContext['reporter']
		>({
			key: 'ir.wrong-surface',
			apply: async () => undefined,
		});

		expect(() =>
			pipeline.builders.use(fragment as unknown as BuilderHelper)
		).toThrow(WPKernelError);
	});

	it('throws on multiple overrides for same fragment key', () => {
		const pipeline = createPipeline({
			builderProvidedKeys: [
				'builder.generate.php.controller.resources',
				'builder.generate.php.capability',
				'builder.generate.php.registration.persistence',
				'builder.generate.php.plugin-loader',
				'builder.generate.php.index',
			],
		});

		const first = buildFragmentHelper<
			PipelineContext,
			FragmentInput,
			FragmentOutput,
			PipelineContext['reporter']
		>({
			key: 'same',
			mode: 'override',
			apply: async () => undefined,
			origin: 'a',
		});
		const duplicate = buildFragmentHelper<
			PipelineContext,
			FragmentInput,
			FragmentOutput,
			PipelineContext['reporter']
		>({
			key: 'same',
			mode: 'override',
			apply: async () => undefined,
			origin: 'b',
		});

		pipeline.use(first);

		expect(() => pipeline.use(duplicate)).toThrow(WPKernelError);
	});
});
