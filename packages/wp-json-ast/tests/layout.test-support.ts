import fs from 'node:fs';
import path from 'node:path';

/**
 * Minimal layout resolver for wp-json-ast tests.
 * Reads the repo-level layout.manifest.json and exposes a resolve(id) helper.
 * Keeps tests aligned to manifest changes without importing cross-package helpers.
 * @param overrides
 */
export function loadLayoutForTests(overrides?: Record<string, string>) {
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

function findManifest(): string {
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

	// Fallback: assume repo root relative to this file.
	return path.resolve(__dirname, '../../..', 'layout.manifest.json');
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
