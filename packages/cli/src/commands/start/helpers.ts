import path from 'node:path';

export type ChangeTier = 'fast' | 'slow';

export type Trigger = {
	readonly tier: ChangeTier;
	readonly event: string;
	readonly file: string;
};

export function detectTier(filePath: string): ChangeTier {
	const relative = normaliseForLog(filePath).toLowerCase();
	if (relative.startsWith('contracts/') || relative.startsWith('schemas/')) {
		return 'slow';
	}

	return 'fast';
}

export function normaliseForLog(filePath: string): string {
	const absolute = path.isAbsolute(filePath)
		? filePath
		: path.resolve(process.cwd(), filePath);
	const relative = path.relative(process.cwd(), absolute);
	if (relative === '') {
		return '.';
	}
	return relative.split(path.sep).join('/');
}

export function toWorkspaceRelativePath(absolute: string): string {
	const relative = path.relative(process.cwd(), absolute);
	if (relative === '') {
		return '.';
	}

	return relative.split(path.sep).join('/');
}

export function prioritiseQueued(
	current: Trigger | null,
	incoming: Trigger
): Trigger {
	if (!current) {
		return incoming;
	}

	if (incoming.tier === 'slow' && current.tier === 'fast') {
		return incoming;
	}

	return current.tier === 'slow' && incoming.tier === 'fast'
		? current
		: incoming;
}
