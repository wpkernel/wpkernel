import type { DefaultTheme } from 'vitepress';

export const configSidebar: DefaultTheme.SidebarItem[] = [
	{
		text: 'Config',
		collapsed: false,
		items: [
			{ text: 'Guide', link: '/reference/config/' },
			{ text: 'Meta', link: '/reference/config/meta' },
			{ text: 'Directories', link: '/reference/config/directories' },
			{ text: 'Schemas', link: '/reference/config/schemas' },
			{ text: 'Resources', link: '/reference/config/resources' },
			{ text: 'Blocks', link: '/reference/config/blocks' },
			{ text: 'UI', link: '/reference/config/ui' },
			{ text: 'Adapters', link: '/reference/config/adapters' },
			{ text: 'Readiness', link: '/reference/config/readiness' },
		],
	},
];
