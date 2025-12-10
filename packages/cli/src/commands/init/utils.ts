import path from 'node:path';
import fs from 'node:fs/promises';
import type { Workspace } from '../../workspace';
import { getCliPackageRoot } from '../../utils/module-url';
import { pathExists } from '../../utils';

const INIT_TEMPLATE_ROOT = path.join(getCliPackageRoot(), 'templates', 'init');

export type ScaffoldStatus = 'created' | 'updated' | 'skipped';

export interface ScaffoldFileDescriptor {
	readonly relativePath: string;
	readonly templatePath: string;
	readonly category: 'wpk' | 'author';
	readonly skipWhenPluginDetected?: boolean;
	readonly replacements?: Record<string, string>;
}

export async function fileExists(
	workspace: Workspace,
	relativePath: string
): Promise<boolean> {
	try {
		const absolute = workspace.resolve(relativePath);
		await fs.access(absolute);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return false;
		}

		throw error;
	}
}

export async function loadTemplate(relativePath: string): Promise<string> {
	const templatePath = path.join(INIT_TEMPLATE_ROOT, relativePath);
	return fs.readFile(templatePath, 'utf8');
}

export function applyReplacements(
	template: string,
	replacements: Record<string, string>
): string {
	let result = template;

	for (const [token, value] of Object.entries(replacements)) {
		result = result.replaceAll(token, value);
	}

	return result;
}

export function ensureTrailingNewline(contents: string): string {
	return contents.endsWith('\n') ? contents : `${contents}\n`;
}

export function slugify(value: string): string {
	const normalised = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return normalised.length > 0 ? normalised : 'wpkernel-project';
}

export function buildPhpNamespace(namespace: string): string {
	const segments = slugify(namespace)
		.split('-')
		.filter((segment) => segment.length > 0)
		.map((segment) => {
			if (segment === 'wpkernel') {
				return 'WPKernel';
			}

			if (segment === 'wpk') {
				return 'WPK';
			}

			return segment.charAt(0).toUpperCase() + segment.slice(1);
		});

	const base = segments.length > 0 ? segments.join('') : 'WPKernelProject';
	return `${base}\\\\`;
}

export function buildComposerPackageName(namespace: string): string {
	const slug = slugify(namespace);
	return `${slug}/${slug}`;
}

export function shouldPreferRegistryVersions({
	cliFlag,
	env,
}: {
	cliFlag: boolean;
	env: string | undefined;
}): boolean {
	if (cliFlag) {
		return true;
	}

	if (!env) {
		return false;
	}

	const normalised = env.trim().toLowerCase();
	return normalised === '1' || normalised === 'true';
}

export async function resolvePathAliasEntries(
	workspaceRoot: string
): Promise<Array<[string, string[]]>> {
	const entries: Array<[string, string[]]> = [['@/*', ['./src/*']]];

	const repoRoot = await findRepoRoot(workspaceRoot);
	if (!repoRoot) {
		return entries;
	}

	const repoEntries: Array<{
		alias: string;
		check: string[];
		target: string[];
	}> = [
		{
			alias: '@wpkernel/core',
			check: ['packages', 'core', 'src', 'index.ts'],
			target: ['packages', 'core', 'src', 'index.ts'],
		},
		{
			alias: '@wpkernel/core/*',
			check: ['packages', 'core', 'src'],
			target: ['packages', 'core', 'src', '*'],
		},
		{
			alias: '@wpkernel/ui',
			check: ['packages', 'ui', 'src', 'index.ts'],
			target: ['packages', 'ui', 'src', 'index.ts'],
		},
		{
			alias: '@wpkernel/ui/*',
			check: ['packages', 'ui', 'src'],
			target: ['packages', 'ui', 'src', '*'],
		},
		{
			alias: '@wpkernel/cli',
			check: ['packages', 'cli', 'src', 'index.ts'],
			target: ['packages', 'cli', 'src', 'index.ts'],
		},
		{
			alias: '@wpkernel/cli/*',
			check: ['packages', 'cli', 'src'],
			target: ['packages', 'cli', 'src', '*'],
		},
		{
			alias: '@wpkernel/e2e-utils',
			check: ['packages', 'e2e-utils', 'src', 'index.ts'],
			target: ['packages', 'e2e-utils', 'src', 'index.ts'],
		},
		{
			alias: '@wpkernel/e2e-utils/*',
			check: ['packages', 'e2e-utils', 'src'],
			target: ['packages', 'e2e-utils', 'src', '*'],
		},
		{
			alias: '@test-utils/*',
			check: ['tests', 'test-utils'],
			target: ['tests', 'test-utils', '*'],
		},
	];

	for (const entry of repoEntries) {
		const checkPath = path.join(repoRoot, ...entry.check);
		if (!(await pathExists(checkPath))) {
			continue;
		}

		const targetPath = path.join(repoRoot, ...entry.target);
		const relative = path.relative(workspaceRoot, targetPath);
		entries.push([entry.alias, [normaliseRelativePath(relative)]]);
	}

	return entries;
}

async function findRepoRoot(start: string): Promise<string | null> {
	let current = start;

	while (true) {
		if (await pathExists(path.join(current, 'pnpm-workspace.yaml'))) {
			return current;
		}

		const parent = path.dirname(current);
		if (parent === current) {
			return null;
		}

		current = parent;
	}
}

function normaliseRelativePath(value: string): string {
	const posixValue = value.split(path.sep).join('/');

	if (posixValue.startsWith('.') || posixValue.startsWith('/')) {
		return posixValue;
	}

	return `./${posixValue}`;
}

export function formatPathsForTemplate(
	entries: Array<[string, string[]]>
): string {
	if (entries.length === 0) {
		return '{\n                }';
	}

	const indent = '                ';
	const innerIndent = `${indent}        `;
	const ordered = [...entries].sort((a, b) => {
		if (a[0] === '@/*') {
			return -1;
		}
		if (b[0] === '@/*') {
			return 1;
		}
		return a[0].localeCompare(b[0]);
	});
	const lines: string[] = ['{'];

	ordered.forEach(([alias, targets], index) => {
		const serialisedTargets = JSON.stringify(targets);
		const suffix = index < ordered.length - 1 ? ',' : '';
		lines.push(`${innerIndent}"${alias}": ${serialisedTargets}${suffix}`);
	});

	lines.push(`${indent}}`);
	return lines.join('\n');
}

export function formatSummary({
	namespace,
	templateName,
	summaries,
}: {
	namespace: string;
	templateName: string;
	summaries: Array<{ path: string; status: ScaffoldStatus }>;
}): string {
	const lines = [
		`[wpk] init created ${templateName} scaffold for ${namespace}`,
	];

	for (const entry of summaries) {
		lines.push(`  ${entry.status} ${entry.path}`);
	}

	return `${lines.join('\n')}\n`;
}

export function parseStringOption(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}
