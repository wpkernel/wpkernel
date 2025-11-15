// docs/.vitepress/config.ts
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import tabsMarkdownPlugin from '@red-asuka/vitepress-plugin-tabs';

// Fast mode for pre-commit hooks (MPA mode + no minification)
// Defaults to enabled locally unless DOCS_FAST=0/false.
const rawCI = process.env.CI;
const CI = Boolean(rawCI && !['0', 'false'].includes(rawCI.toLowerCase()));
const rawFast = process.env.DOCS_FAST?.toLowerCase();
const FAST =
	rawFast === '1' ||
	rawFast === 'true' ||
	(!CI && rawFast !== '0' && rawFast !== 'false');

const searchConfig = FAST
	? undefined
	: {
			provider: 'local' as const,
		};

const baseBuildOptions = {
	target: 'esnext' as const,
	cssTarget: 'esnext' as const,
	modulePreload: {
		polyfill: false as const,
	},
};

export default withMermaid(
	defineConfig({
		title: 'WPKernel',
		description:
			'A Rails-like, opinionated framework for building modern WordPress products',
		base: '/',
		lastUpdated: !FAST,
		sitemap: { hostname: 'https://wpkernel.dev' },

		srcExclude: ['internal/**'],

		// Keep wp-env localhost URLs valid (any port + path)
		ignoreDeadLinks: [
			/^https?:\/\/localhost(?::\d+)?(?:\/|$)/,
			/^https?:\/\/127\.0\.0\.1(?::\d+)?(?:\/|$)/,
			// Ignore links to internal documentation (excluded from processing)
			/\.\.\/\.\.\/internal\//,
			// Ignore links to generated API documentation index files
			/^\/api\/@wpkernel\/cli\/index$/,
			/^\/api\/@wpkernel\/pipeline\/index$/,
			/^\/api\/@wpkernel\/core\/index$/,
			/^\/api\/@wpkernel\/ui\/index$/,
			/^\/api\/@wpkernel\/test-utils\/index$/,
			/^\/api\/@wpkernel\/e2e-utils\/index$/,
			/^\/api\/@wpkernel\/create-wpk\/index$/,
		],

		// Fast path for pre-commit; set to true for PROD if you can live without SPA nav
		mpa: FAST, // <-- set to (FAST || PROD) if you want minimal JS in production too		// Big win: limit Shiki languages (reduces client+server bundle a lot)
		markdown: {
			theme: { light: 'github-light', dark: 'github-dark' },
			config(md) {
				md.use(tabsMarkdownPlugin);
			},
		},

		// Exclude heavy generated API pages from local search index (keeps render, shrinks search)
		transformPageData(page) {
			if (page.filePath?.includes('/docs/api/@wpkernel/')) {
				page.frontmatter ||= {};
				page.frontmatter.search = false;
			}
		},

		vite: {
			cacheDir: 'node_modules/.vite-docs',

			build: FAST
				? {
						...baseBuildOptions,
						minify: false,
						cssMinify: false,
						reportCompressedSize: false,
						sourcemap: false,
					}
				: {
						...baseBuildOptions,
						reportCompressedSize: false,
						// split the usual suspects so main stays slim
						rollupOptions: {
							output: {
								manualChunks(id) {
									if (id.includes('mermaid'))
										return 'mermaid';
									if (id.includes('shiki')) return 'shiki';
									if (
										id.includes('fuse') ||
										id.includes('mini-search')
									)
										return 'search';
									if (
										id.includes('/@vitepress/') ||
										id.includes('/vitepress/')
									)
										return 'vp';
									if (id.includes('/vue/')) return 'vue';
								},
							},
						},
						// warning threshold only (we're splitting sensibly above)
						chunkSizeWarningLimit: 2000,
					},

			resolve: { dedupe: ['vue'] },
			optimizeDeps: {
				include: ['mermaid'], // speeds dev HMR for pages with diagrams
			},
		},

		themeConfig: {
			logo: '/logo.png',
			editLink: {
				pattern:
					'https://github.com/wpkernel/wpkernel/edit/main/docs/:path',
				text: 'Edit this page on GitHub',
			},
			externalLinkIcon: true,

			nav: [
				{ text: 'Home', link: '/' },
				{ text: 'Getting Started', link: '/getting-started/' },
				{ text: 'Guide', link: '/guide/' },
				{ text: 'Packages', link: '/packages/' },
				{ text: 'Examples', link: '/examples/' },
				{ text: 'Reference', link: '/reference/contracts' },
				{ text: 'API', link: '/api/' },
				{ text: 'Contributing', link: '/contributing/' },
			],

			sidebar: {
				'/getting-started/': [
					{
						text: 'Getting Started',
						collapsed: false,
						items: [
							{ text: 'Introduction', link: '/getting-started/' },
							{
								text: 'Installation',
								link: '/getting-started/installation',
							},
							{
								text: 'Quick Start',
								link: '/getting-started/quick-start',
							},
						],
					},
					{
						text: 'Explore',
						collapsed: true,
						items: [
							{ text: 'Examples', link: '/examples/' },
							{
								text: 'Decision Matrix',
								link: '/reference/decision-matrix',
							},
							{ text: 'Roadmap', link: '/contributing/roadmap' },
						],
					},
				],
				'/packages/': [
					{
						text: 'Packages',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/packages/' },
							{ text: '@wpkernel/cli', link: '/packages/cli' },
							{ text: '@wpkernel/core', link: '/packages/core' },
							{
								text: '@wpkernel/create-wpk',
								link: '/packages/create-wpk',
							},
							{
								text: '@wpkernel/e2e-utils',
								link: '/packages/e2e-utils',
							},
							{
								text: '@wpkernel/php-json-ast',
								link: '/packages/php-json-ast',
							},
							{
								text: '@wpkernel/pipeline',
								link: '/packages/pipeline',
							},
							{
								text: '@wpkernel/test-utils',
								link: '/packages/test-utils',
							},
							{ text: '@wpkernel/ui', link: '/packages/ui' },
							{
								text: '@wpkernel/wp-json-ast',
								link: '/packages/wp-json-ast',
							},
						],
					},
				],
				'/guide/': [
					{
						text: 'Core Concepts',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/guide/' },
							{
								text: 'Philosophy & Architecture',
								link: '/guide/philosophy',
							},
							{
								text: 'Generated Artifacts',
								link: '/guide/generated-artifacts',
							},
							{ text: 'Resources', link: '/guide/resources' },
							{ text: 'Actions', link: '/guide/actions' },
							{ text: 'Events', link: '/guide/events' },
							{ text: 'Blocks', link: '/guide/blocks' },
							{
								text: 'Interactivity',
								link: '/guide/interactivity',
							},
							{ text: 'DataViews', link: '/guide/dataviews' },
							{ text: 'Jobs', link: '/guide/jobs' },
							{ text: 'Policy', link: '/guide/policy' },
						],
					},
					{
						text: 'Deep dives',
						collapsed: true,
						items: [
							{ text: 'Modes', link: '/guide/modes' },
							{ text: 'Prefetching', link: '/guide/prefetching' },
							{ text: 'Reporting', link: '/guide/reporting' },
							{ text: 'Data Utilities', link: '/guide/data' },
						],
					},
				],
				'/examples/': [
					{
						text: 'Examples',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/examples/' },
							{ text: 'Showcase', link: '/examples/showcase' },
							{
								text: 'Test the CLI',
								link: '/examples/test-the-cli',
							},
						],
					},
				],
				'/reference/': [
					{
						text: 'Reference',
						collapsed: false,
						items: [
							{ text: 'Contracts', link: '/reference/contracts' },
							{
								text: 'WPK Config',
								link: '/reference/wpk-config',
							},
							{
								text: 'Decision Matrix',
								link: '/reference/decision-matrix',
							},
							{
								text: 'CLI Commands',
								link: '/reference/cli-commands',
							},
						],
					},
				],
				'/api/': [
					{
						text: 'API Reference',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/api/' },
							{ text: 'Resources', link: '/api/resources' },
							{ text: 'Actions', link: '/api/actions' },
							{ text: 'Events', link: '/api/events' },
							{ text: 'Jobs', link: '/api/jobs' },
							{ text: 'Reporter', link: '/api/reporter' },
							{ text: 'Policy', link: '/api/policy' },
						],
					},
					{
						text: 'Typedoc output',
						collapsed: true,
						items: [
							{
								text: '@wpkernel/cli',
								link: '/api/@wpkernel/cli/',
							},
							{
								text: '@wpkernel/core',
								link: '/api/@wpkernel/core/',
							},
							{
								text: '@wpkernel/pipeline',
								link: '/api/@wpkernel/pipeline/',
							},
							{
								text: '@wpkernel/create-wpk',
								link: '/api/@wpkernel/create-wpk/',
							},
							{
								text: '@wpkernel/e2e-utils',
								link: '/api/@wpkernel/e2e-utils/',
							},
							{
								text: '@wpkernel/test-utils',
								link: '/api/@wpkernel/test-utils/',
							},
							{
								text: '@wpkernel/ui',
								link: '/api/@wpkernel/ui/',
							},
							{
								text: '@wpkernel/wp-json-ast',
								link: '/api/@wpkernel/wp-json-ast/',
							},
						],
					},
				],
				'/contributing/': [
					{
						text: 'Contributing',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/contributing/' },
							{ text: 'Roadmap', link: '/contributing/roadmap' },
							{
								text: 'Development Setup',
								link: '/contributing/setup',
							},
							{ text: 'Runbook', link: '/contributing/runbook' },
							{
								text: 'Coding Standards',
								link: '/contributing/standards',
							},
							{ text: 'Testing', link: '/contributing/testing' },
							{
								text: 'E2E Testing',
								link: '/contributing/e2e-testing',
							},
							{
								text: 'Pull Requests',
								link: '/contributing/pull-requests',
							},
						],
					},
				],
			},

			socialLinks: [
				{
					icon: 'github',
					link: 'https://github.com/wpkernel/wpkernel',
				},
				{
					icon: 'discord',
					link: 'https://discord.gg-kernel',
				},
			],
			...(searchConfig ? { search: searchConfig } : {}),
			footer: {
				message: 'Released under the EUPL-1.2 License.',
				copyright:
					'Made with ❤️ by <a href="https://geekist.co" target="_blank">Geekist</a>',
			},
		},
	})
);
