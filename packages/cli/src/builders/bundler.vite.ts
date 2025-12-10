import path from 'node:path';
import { VITE_CONFIG_FILENAME } from './bundler.constants';
import type { RollupDriverConfig } from './types';

function toRelativeImport(from: string, target: string): string {
	const relative = path.posix
		.relative(path.posix.dirname(from), target)
		.replace(/\\/g, '/');
	if (relative.startsWith('./') || relative.startsWith('../')) {
		return relative;
	}

	return `./${relative}`;
}

export function buildViteConfigSource(options: {
	readonly bundlerConfigPath: string;
	readonly driverConfig: RollupDriverConfig;
}): string {
	const importPath = toRelativeImport(
		VITE_CONFIG_FILENAME,
		options.bundlerConfigPath
	);

	return [
		"import { defineConfig, type UserConfig } from 'vite';",
		"import { v4wp } from '@kucrut/vite-for-wp';",
		"import fs from 'node:fs';",
		"import path from 'node:path';",
		`import bundlerConfig from '${importPath}';`,
		'',
		"const isProduction = process.env.NODE_ENV === 'production';",
		'const sourceMapConfig = isProduction',
		'  ? bundlerConfig.sourcemap?.production ?? false',
		'  : bundlerConfig.sourcemap?.development ?? true;',
		"const assetFilename = path.basename(bundlerConfig.assetManifest?.path ?? 'index.asset.json');",
		"const assetSource = path.resolve(process.cwd(), '.wpk', 'bundler', 'assets', assetFilename);",
		'const assetTarget = path.resolve(process.cwd(), bundlerConfig.assetManifest?.path ?? ' +
			"'build/index.asset.json');",
		'',
		'const emitBundlerAssetManifest = () => ({',
		"  name: 'wpkernel-emit-asset-manifest',",
		'  generateBundle() {',
		'    if (!fs.existsSync(assetSource)) {',
		'      this.warn(`WPKernel asset manifest not found at ${assetSource}`);',
		'      return;',
		'    }',
		'    fs.mkdirSync(path.dirname(assetTarget), { recursive: true });',
		'    fs.copyFileSync(assetSource, assetTarget);',
		'  },',
		'});',
		'',
		'export default defineConfig((): UserConfig => ({',
		'  plugins: [',
		'    v4wp({',
		'      input: bundlerConfig.input,',
		'      outDir: bundlerConfig.outputDir,',
		'    }),',
		'    emitBundlerAssetManifest(),',
		'  ],',
		'  build: {',
		'    sourcemap: sourceMapConfig,',
		'    rollupOptions: {',
		'      external: bundlerConfig.external,',
		'      output: {',
		"        entryFileNames: '[name].js',",
		'        format: bundlerConfig.format,',
		'        globals: bundlerConfig.globals,',
		'      },',
		'      onwarn(warning, warn) {',
		"        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && typeof warning.message === 'string' && warning.message.includes('\"use client\"')) {",
		'          return;',
		'        }',
		'        warn(warning);',
		'      },',
		'    },',
		'  },',
		'  esbuild: {',
		"    jsxFactory: 'wp.element.createElement',",
		"    jsxFragment: 'wp.element.Fragment',",
		'  },',
		'  optimizeDeps: bundlerConfig.optimizeDeps,',
		'  resolve: { alias: bundlerConfig.alias },',
		'}));',
		'',
	].join('\n');
}
