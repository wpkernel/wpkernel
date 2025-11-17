import type { ResolvedLayout } from '../layout/manifest';
import { loadLayoutFromWorkspace } from '../layout/manifest';
import { buildWorkspace } from '../workspace';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Very small, per-process cache for test layouts.
 * Keyed by cwd + overrides + strict so behaviour stays deterministic.
 */
const layoutCache = new Map<string, Promise<ResolvedLayout>>();

/**
 * Test helper for resolving layout IDs from layout.manifest.json.
 *
 * Keeps tests aligned to the manifest so path expectations do not bake in
 * `.wpk` or `.generated` strings.
 * @param options
 * @param options.cwd
 * @param options.overrides
 * @param options.strict
 */
export async function loadTestLayout(
	options: {
		readonly cwd?: string;
		readonly overrides?: Record<string, string>;
		readonly strict?: boolean;
	} = {}
): Promise<ResolvedLayout> {
	const cwd = options.cwd ?? process.cwd();
	const strict = options.strict ?? true;

	// cache key is "behavioural": different inputs => different key
	const cacheKey = JSON.stringify({
		cwd,
		overrides: options.overrides ?? null,
		strict,
	});

	let cached = layoutCache.get(cacheKey);
	if (!cached) {
		const workspace = buildWorkspace(cwd);
		cached = (async () => {
			const layout = await loadLayoutFromWorkspace({
				workspace,
				overrides: options.overrides,
				strict,
			});
			if (!layout) {
				throw new Error('layout.manifest.json not found for tests.');
			}
			return layout;
		})();

		layoutCache.set(cacheKey, cached);
	}

	return cached;
}

export async function resolveLayoutPath(
	id: string,
	options?: Parameters<typeof loadTestLayout>[0]
): Promise<string> {
	const layout = await loadTestLayout(options);
	return layout.resolve(id);
}

function buildLayoutMap(
	prefix: string,
	node: unknown,
	into: Record<string, string>
): void {
	if (typeof node === 'string') {
		into[node] = prefix;
		return;
	}

	if (node && typeof node === 'object') {
		const record = node as Record<string, unknown>;
		const id = typeof record.$id === 'string' ? record.$id : null;
		if (id) {
			into[id] = prefix;
		}

		for (const [segment, child] of Object.entries(record)) {
			if (segment === '$id') {
				continue;
			}

			const nextPrefix =
				prefix === '.' ? segment : path.posix.join(prefix, segment);
			buildLayoutMap(nextPrefix, child, into);
		}
	}
}

export function loadTestLayoutSync(): ResolvedLayout {
	const manifestPath = path.resolve(
		__dirname,
		'..',
		'..',
		'..',
		'..',
		'layout.manifest.json'
	);
	const text = fs.readFileSync(manifestPath, 'utf8');
	const manifest = JSON.parse(text) as { directories?: unknown };
	const map: Record<string, string> = {};
	buildLayoutMap('.', manifest.directories ?? {}, map);

	return {
		resolve(id: string): string {
			const value = map[id] ?? map[`${id}.applied`];
			if (!value) {
				throw new Error(`Unknown layout id "${id}".`);
			}
			return value;
		},
		all: map,
	};
}
