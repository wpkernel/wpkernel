import fs from 'node:fs/promises';
import path from 'node:path';

let cachedManifest: Buffer | null = null;

async function readDefaultManifest(): Promise<Buffer> {
	if (cachedManifest) {
		return cachedManifest;
	}

	const source = path.resolve(__dirname, '../../../layout.manifest.json');
	cachedManifest = await fs.readFile(source);
	return cachedManifest;
}

export async function ensureLayoutManifest(root: string): Promise<void> {
	const target = path.join(root, 'layout.manifest.json');
	try {
		await fs.access(target);
		return;
	} catch {
		// Continue to copy the default manifest.
	}

	const manifest = await readDefaultManifest();
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, manifest);
}
