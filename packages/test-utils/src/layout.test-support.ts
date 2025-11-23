import fs from 'node:fs';
import path from 'node:path';

export interface TestLayout {
	resolve: (id: string) => string;
	all: Record<string, string>;
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

/**
 * Backwards-compatible async loader that resolves the default layout manifest
 * using the production resolver. Mirrors the CLI test helper API.
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
): Promise<TestLayout> {
	// The CLI tests previously used a wrapper that respected cwd/overrides/strict.
	// For shared test-utils we ignore cwd/strict and apply overrides on top of the
	// default manifest to preserve compatibility without duplicating logic.
	return loadDefaultLayout(options.overrides);
}

/**
 * Backwards-compatible sync loader that resolves the default layout manifest.
 * Mirrors the CLI test helper API.
 * @param options
 * @param options.overrides
 */
export function loadTestLayoutSync(
	options: {
		readonly overrides?: Record<string, string>;
	} = {}
): TestLayout {
	return loadDefaultLayout(options.overrides);
}

/**
 * Computes a module specifier between two layout ids, optionally appending a filename,
 * relative to a provided `fromPath` (or the inferred `fromId` path when omitted).
 * @param fromId
 * @param toId
 * @param filename
 */
export function resolveLayoutRelativeSpecifier(
	fromId: string,
	toId: string,
	filename?: string
): string {
	const layout = loadDefaultLayout();
	const fromBase = filename
		? path.posix.join(layout.resolve(fromId), filename)
		: layout.resolve(fromId);
	const to = filename
		? path.posix.join(layout.resolve(toId), filename)
		: layout.resolve(toId);

	const relative = path.posix
		.relative(path.posix.dirname(fromBase), to)
		.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/iu, '');

	return relative;
}
