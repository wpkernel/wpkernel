import path from 'node:path';
import {
	resolveResourceImport,
	buildModuleSpecifier,
	findWorkspaceModule,
	MODULE_SOURCE_EXTENSIONS,
} from '../imports';
import { makeWorkspaceMock } from '@cli-tests/workspace.test-support';

const workspaceMock = () => {
	const workspace = makeWorkspaceMock({
		resolve: (...parts: string[]) => path.resolve(process.cwd(), ...parts),
	});
	workspace.exists = jest.fn(async () => false);
	return workspace;
};

describe('imports (branches)', () => {
	describe('resolveResourceImport', () => {
		it('finds applied resource', async () => {
			const workspace = workspaceMock();
			(workspace.exists as jest.Mock).mockImplementation(
				async (p: string) =>
					p.includes('applied/res') && p.endsWith('.ts')
			);

			const result = await resolveResourceImport({
				workspace,
				from: 'src/index.ts',
				resourceKey: 'res',
				generatedResourcesDir: 'generated',
				appliedResourcesDir: 'applied',
			} as any);

			expect(result).toBe('../applied/res');
		});

		it('finds generated resource', async () => {
			const workspace = workspaceMock();
			(workspace.exists as jest.Mock).mockImplementation(
				async (p: string) =>
					p.includes('generated/res') && p.endsWith('.ts')
			);

			const result = await resolveResourceImport({
				workspace,
				from: 'src/index.ts',
				resourceKey: 'res',
				generatedResourcesDir: 'generated',
				appliedResourcesDir: 'applied',
			} as any);

			expect(result).toBe('../generated/res');
		});

		it('falls back to alias', async () => {
			const workspace = workspaceMock();
			(workspace.exists as jest.Mock).mockResolvedValue(false);

			const result = await resolveResourceImport({
				workspace,
				from: 'src/index.ts',
				resourceKey: 'res',
				generatedResourcesDir: 'generated',
				appliedResourcesDir: 'applied',
			} as any);

			expect(result).toBe('@/resources/res');
		});
	});

	describe('buildModuleSpecifier', () => {
		it('handles paths outside workspace (alias fallback)', () => {
			const workspace = workspaceMock();
			// Mock resolve to simulate outside path
			const root = path.resolve(process.cwd());
			const target = path.resolve(root, '../outside/file.ts');

			// When target is outside root, path.relative starts with ..
			const result = buildModuleSpecifier({
				workspace,
				from: 'src/index.ts',
				target,
			});

			// ../outside/file -> @/outside/file
			expect(result).toMatch(/^@\//);
			expect(result).not.toContain('..');
		});

		it('handles root alias', () => {
			const workspace = workspaceMock();
			const root = path.resolve(process.cwd());
			const target = path.resolve(root, '../file.ts'); // effectively root if we strip ..? No wait.

			// path.relative(root, target) -> ../file.ts
			// aliasTarget -> file.ts -> @/file.ts

			const result = buildModuleSpecifier({
				workspace,
				from: 'src/index.ts',
				target,
			});
			expect(result).toBe('@/file');
		});
	});

	describe('findWorkspaceModule', () => {
		it('returns null if no module found', async () => {
			const workspace = workspaceMock();
			const result = await findWorkspaceModule(workspace, 'some/path');
			expect(result).toBeNull();
		});

		it('returns first matching extension', async () => {
			const workspace = workspaceMock();
			(workspace.exists as jest.Mock).mockImplementation(
				async (p: string) => p.endsWith('.tsx')
			);

			const result = await findWorkspaceModule(workspace, 'some/path');
			expect(result).toBe('some/path.tsx');
		});
	});

	describe('stripExtension', () => {
		// Indirectly testing stripExtension via buildModuleSpecifier
		it('removes all supported extensions', () => {
			const workspace = workspaceMock();
			const root = path.resolve(process.cwd());

			MODULE_SOURCE_EXTENSIONS.forEach((ext) => {
				const target = path.join(root, `test${ext}`);
				const result = buildModuleSpecifier({
					workspace,
					from: 'index.ts',
					target,
				});
				expect(result).toBe('./test');
			});
		});

		it('leaves path as is if no extension matches', () => {
			const workspace = workspaceMock();
			const root = path.resolve(process.cwd());
			const target = path.join(root, 'test.txt');
			const result = buildModuleSpecifier({
				workspace,
				from: 'index.ts',
				target,
			});
			expect(result).toBe('./test.txt');
		});
	});
});
