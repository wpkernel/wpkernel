import { finalizeIrDraft, buildIrDraft, type MutableIr } from '../types';
import { WPKernelError } from '@wpkernel/core/error';
import type { FragmentFinalizationMetadata } from '@wpkernel/pipeline';
import { makeWPKernelConfigFixture } from '@wpkernel/test-utils/printers.test-support';
import { loadTestLayoutSync } from '../../tests/layout.test-support';

function createHelpersMetadata(
	executed: readonly string[],
	missing: readonly string[]
): FragmentFinalizationMetadata<'fragment'> {
	return {
		fragments: {
			kind: 'fragment',
			registered: Array.from(new Set([...executed, ...missing])),
			executed: [...executed],
			missing: [...missing],
		},
	};
}

function buildDraft(): MutableIr {
	const config = makeWPKernelConfigFixture();
	const draft = buildIrDraft({
		config,
		namespace: config.namespace,
		origin: 'typescript',
		sourcePath: '/tmp/wpk.config.ts',
	});

	draft.meta = {
		version: 1,
		namespace: config.namespace,
		sourcePath: '/tmp/wpk.config.ts',
		origin: 'typescript',
		sanitizedNamespace: 'TestNamespace',
	};
	draft.capabilityMap = {
		sourcePath: undefined,
		definitions: [],
		fallback: {
			capability: 'manage_options',
			appliesTo: 'object',
		},
		missing: [],
		unused: [],
		warnings: [],
	};
	draft.php = {
		namespace: 'TestNamespace',
		autoload: 'inc/',
		outputDir: loadTestLayoutSync().resolve('php.generated'),
	};
	draft.layout = {
		resolve(id: string) {
			return id;
		},
		all: { foo: 'bar' },
	};

	return draft;
}

describe('finalizeIrDraft', () => {
	const REQUIRED = [
		'ir.meta.core',
		'ir.layout.core',
		'ir.schemas.core',
		'ir.resources.core',
		'ir.capabilities.core',
		'ir.capability-map.core',
		'ir.diagnostics.core',
		'ir.blocks.core',
		'ir.ordering.core',
		'ir.validation.core',
	] as const;

	it('returns a completed IR when all core fragments executed', () => {
		const draft = buildDraft();
		const helpers = createHelpersMetadata(REQUIRED, []);

		const ir = finalizeIrDraft(draft, helpers);

		expect(ir.meta.namespace).toBe(draft.meta!.namespace);
		expect(ir.capabilityMap).toBe(draft.capabilityMap);
		expect(ir.php).toBe(draft.php);
	});

	it('throws when any required fragment did not execute', () => {
		const draft = buildDraft();
		const helpers = createHelpersMetadata(
			REQUIRED.filter((key) => key !== 'ir.capability-map.core'),
			['ir.capability-map.core']
		);

		expect(() => finalizeIrDraft(draft, helpers)).toThrow(WPKernelError);
	});

	it('throws when metadata reports missing fragments even if executed list contains them', () => {
		const draft = buildDraft();
		const helpers = createHelpersMetadata(REQUIRED, ['ir.resources.core']);

		expect(() => finalizeIrDraft(draft, helpers)).toThrow(WPKernelError);
	});
});
