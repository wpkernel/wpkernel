import fs from 'node:fs';
import path from 'node:path';
import defaultLayoutManifest from '../../../layout.manifest.json' assert { type: 'json' };
import { buildWorkspace } from '../src/workspace';
import {
	type ResolvedLayout,
	loadLayoutFromWorkspace,
	resolveLayoutFromManifest,
} from '../src/ir/fragments/ir.layout.core';

export interface TestLayout {
	resolve: (id: string) => string;
	all: Record<string, string>;
}

/**
 * Test helper for resolving layout IDs from layout.manifest.json via the production loader.
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
	const workspace = buildWorkspace(cwd);
	const layout = await loadLayoutFromWorkspace({
		workspace,
		overrides: options.overrides,
		strict,
	});
	if (!layout) {
		throw new Error('layout.manifest.json not found for tests.');
	}

	return layout;
}

export async function resolveLayoutPath(
	id: string,
	options?: Parameters<typeof loadTestLayout>[0]
): Promise<string> {
	const layout = await loadTestLayout(options);
	return layout.resolve(id);
}

export function loadTestLayoutSync(
	options: {
		readonly overrides?: Record<string, string>;
	} = {}
): ResolvedLayout {
	const layout = resolveLayoutFromManifest({
		manifest: defaultLayoutManifest,
		overrides: options.overrides,
	});
	return layout;
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

/**
 * Legacy-style loader used by some tests that only care about a flat id→path map,
 * backed by layout.manifest.json discovered from cwd upwards.
 * @param overrides
 */
export function loadDefaultLayout(
	overrides?: Record<string, string>
): TestLayout {
	const findManifest = (): string => {
		let cursor = process.cwd();
		while (true) {
			const candidate = path.join(cursor, 'layout.manifest.json');
			if (fs.existsSync(candidate)) {
				return candidate;
			}

			const parent = path.dirname(cursor);
			if (parent === cursor) {
				break;
			}
			cursor = parent;
		}

		// Fallback to repo-root relative from the package (works both CJS/ESM when cwd walk fails)
		return path.resolve(process.cwd(), 'layout.manifest.json');
	};

	const manifestPath = findManifest();
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
		directories?: unknown;
	};

	const map: Record<string, string> = {};
	buildLayoutMap('.', manifest.directories ?? {}, map);

	if (overrides) {
		for (const [key, value] of Object.entries(overrides)) {
			map[key] = value;
		}
	}

	return {
		all: map,
		resolve(id: string): string {
			const value = map[id] ?? map[`${id}.applied`];
			if (!value) {
				throw new Error(`Unknown layout id "${id}".`);
			}
			return value;
		},
	};
}
