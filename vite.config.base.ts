import { defineConfig, type UserConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';
// eslint-disable-next-line camelcase
import { wp_globals } from '@kucrut/vite-for-wp/utils';

/**
 * Create a Vite configuration for WP Kernel library packages
 *
 * @param packageName - The package name (e.g., '@geekist/wp-kernel')
 * @param entries     - Entry point mapping (e.g., { index: 'src/index.ts', http: 'src/http/index.ts' })
 * @return Vite configuration object
 */
export const createKernelLibConfig = (
	packageName: string,
	entries: Record<string, string>
): UserConfig =>
	defineConfig({
		build: {
			lib: {
				entry: Object.fromEntries(
					Object.entries(entries).map(([name, path]) => [
						name,
						resolve(process.cwd(), path),
					])
				),
				formats: ['es'], // ESM only
				fileName: (format, entryName) => `${entryName}.js`,
			},
			outDir: 'dist',
			sourcemap: true,
			emptyOutDir: true,
			rollupOptions: {
				// Don't bundle WordPress packages or React
				external: [
					...Object.keys(wp_globals()),
					'react',
					'react-dom',
					/^@geekist\/wp-kernel/, // Don't bundle other kernel packages
				],
				output: {
					exports: 'named',
					// Preserve module structure for proper .js extensions
					preserveModules: true,
					preserveModulesRoot: 'src',
					entryFileNames: '[name].js',
					banner: `/**
 * ${packageName}
 * @license EUPL-1.2
 */`,
				},
			},
		},
		plugins: [
			dts({
				// Generate TypeScript declarations
				include: [
					'src/**/*.ts',
					'src/**/*.tsx',
					'../../types/**/*.d.ts',
				],
				outDir: 'dist',
				rollupTypes: false, // Don't bundle types (avoids TS version mismatch warning)
			}),
		],
	});
