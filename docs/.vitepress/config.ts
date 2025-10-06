import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

// Fast mode for pre-commit hooks (MPA mode + no minification)
// MPA is experimental but safe for pre-commit validation (CI uses full build)
const FAST = process.env.DOCS_FAST === '1';

// https://vitepress.dev/reference/site-config
export default withMermaid(
	defineConfig({
		title: 'WP Kernel',
		description:
			'A Rails-like, opinionated framework for building modern WordPress products',
		base: '/wp-kernel/',
		lastUpdated: true,
		sitemap: { hostname: 'https://thegeekist.github.io' },
		// Strict link checking always on so it still fails locally if links break
		ignoreDeadLinks: [
			// Ignore localhost URLs (environment-specific)
			/^http:\/\/localhost:\d+/,
		],

		// Fast path: no client hydration, less bundling (experimental but faster)
		// Only used in pre-commit for speed; CI uses full SPA build
		mpa: FAST,

		vite: {
			// Persist caches so repeated builds are faster
			cacheDir: 'node_modules/.vite-docs',
			// Minify is expensive; disable in fast mode for pre-commit speed
			build: FAST
				? {
						minify: false, // Skip terser/esbuild minification
						cssMinify: false, // Skip CSS minification
						reportCompressedSize: false, // Skip gzip size calculation
						sourcemap: false, // Skip sourcemap generation
					}
				: {},
		},

		themeConfig: {
			// https://vitepress.dev/reference/default-theme-config
			logo: '/logo.png',

			editLink: {
				pattern:
					'https://github.com/theGeekist/wp-kernel/edit/main/docs/:path',
				text: 'Edit this page on GitHub',
			},

			externalLinkIcon: true,

			nav: [
				{ text: 'Home', link: '/' },
				{ text: 'Getting Started', link: '/getting-started/' },
				{ text: 'Guide', link: '/guide/' },
				{ text: 'Packages', link: '/packages/' },
				{ text: 'API', link: '/api/' },
				{ text: 'Contributing', link: '/contributing/' },
			],

			sidebar: {
				'/getting-started/': [
					{
						text: 'Getting Started',
						collapsed: false,
						items: [
							{
								text: 'Introduction',
								link: '/getting-started/',
							},
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
						text: 'Next Steps',
						collapsed: true,
						items: [
							{
								text: 'Core Concepts',
								link: '/guide/',
							},
							{
								text: 'Repository Handbook',
								link: '/guide/repository-handbook',
							},
							{
								text: 'Showcase Plugin',
								link: '/guide/showcase',
							},
							{
								text: 'Roadmap',
								link: '/contributing/roadmap',
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
							{ text: 'Resources', link: '/guide/resources' },
							{ text: 'Actions', link: '/guide/actions' },
							{ text: 'Events', link: '/guide/events' },
							{
								text: 'Block Bindings',
								link: '/guide/block-bindings',
							},
							{
								text: 'Interactivity',
								link: '/guide/interactivity',
							},
							{ text: 'Jobs', link: '/guide/jobs' },
						],
					},
					{
						text: 'Advanced',
						collapsed: true,
						items: [
							{
								text: 'Resources Deep Dive',
								link: '/guide/resources-advanced',
							},
							{
								text: 'Modes (Static/Headless/WP)',
								link: '/guide/modes',
							},
							{
								text: 'Showcase Plugin',
								link: '/guide/showcase',
							},
						],
					},
				],
				'/packages/': [
					{
						text: 'Packages',
						collapsed: false,
						items: [
							{ text: 'Overview', link: '/packages/' },
							{
								text: '@geekist/wp-kernel',
								link: '/packages/kernel',
							},
							{
								text: '@geekist/wp-kernel-ui',
								link: '/packages/ui',
							},
							{
								text: '@geekist/wp-kernel-cli',
								link: '/packages/cli',
							},
							{
								text: '@geekist/wp-kernel-e2e-utils',
								link: '/packages/e2e-utils',
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
						],
					},
					{
						text: 'Generated Docs',
						collapsed: true,
						items: [
							{
								text: 'Resources',
								link: '/api/generated/resource/README',
							},
							{
								text: 'Errors',
								link: '/api/generated/errors/README',
							},
							{
								text: 'Transport',
								link: '/api/generated/transport/README',
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
					link: 'https://github.com/theGeekist/wp-kernel',
				},
			],

			search: {
				provider: 'local',
			},

			footer: {
				message: 'Released under the EUPL-1.2 License.',
				copyright:
					'Made with ❤️ by <a href="https://geekist.co" target="_blank" rel="noopener noreferrer">Geekist</a>',
			},
		},
	})
);
