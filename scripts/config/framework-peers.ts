export type FrameworkPeerKind = 'wordpress' | 'react' | 'internal' | 'tooling';

export interface FrameworkPeerSpec {
	readonly kind: FrameworkPeerKind;
	readonly peerRange: string;
	readonly devRange?: string;
	readonly bundle?: boolean;
}

export const FRAMEWORK_PEERS = {
	'@wordpress/api-fetch': {
		kind: 'wordpress',
		peerRange: '>=7.32.0',
		devRange: '^7.32.0',
	},
	'@wordpress/components': {
		kind: 'wordpress',
		peerRange: '>=30.5.0',
		devRange: '^30.5.0',
	},
	'@wordpress/data': {
		kind: 'wordpress',
		peerRange: '>=10.32.0',
		devRange: '^10.32.0',
	},
	'@wordpress/dataviews': {
		kind: 'wordpress',
		peerRange: '>=9.1.0',
		devRange: '^9.1.0',
	},
	'@wordpress/element': {
		kind: 'wordpress',
		peerRange: '>=6.32.0',
		devRange: '^6.32.0',
	},
	'@wordpress/hooks': {
		kind: 'wordpress',
		peerRange: '>=4.32.0',
		devRange: '^4.32.0',
	},
	'@wordpress/interactivity': {
		kind: 'wordpress',
		peerRange: '>=6.34.0',
		devRange: '^6.34.0',
	},
	'@wordpress/i18n': {
		kind: 'wordpress',
		peerRange: '>=6.5.0',
		devRange: '^6.5.0',
	},
	react: {
		kind: 'react',
		peerRange: '>=18.0.0',
		devRange: '^18.3.1',
	},
	'react-dom': {
		kind: 'react',
		peerRange: '>=18.0.0',
		devRange: '^18.3.1',
	},
	'@wpkernel/core': {
		kind: 'internal',
		peerRange: 'workspace:*',
	},
	'@wpkernel/php-json-ast': {
		kind: 'internal',
		peerRange: 'workspace:*',
		bundle: true,
	},
	'@wpkernel/test-utils': {
		kind: 'internal',
		peerRange: 'workspace:*',
		devRange: 'workspace:*',
	},
	'@wpkernel/ui': {
		kind: 'internal',
		peerRange: 'workspace:*',
	},
	'@wpkernel/pipeline': {
		kind: 'internal',
		peerRange: 'workspace:*',
	},
	'ts-morph': {
		kind: 'tooling',
		peerRange: '>=27.0.0',
		devRange: '^27.0.2',
	},
	typescript: {
		kind: 'tooling',
		peerRange: '>=5.0.0',
		devRange: '^5.9.3',
	},
} satisfies Record<string, FrameworkPeerSpec>;

export type FrameworkPeerMap = typeof FRAMEWORK_PEERS;
export type FrameworkPeerName = keyof FrameworkPeerMap;

const FRAMEWORK_PEER_NAMES = Object.keys(
	FRAMEWORK_PEERS
) as FrameworkPeerName[];

export const WORDPRESS_FRAMEWORK_PEERS = FRAMEWORK_PEER_NAMES.filter(
	(name) => FRAMEWORK_PEERS[name].kind === 'wordpress'
);

export const REACT_FRAMEWORK_PEERS = FRAMEWORK_PEER_NAMES.filter(
	(name) => FRAMEWORK_PEERS[name].kind === 'react'
);

export const INTERNAL_FRAMEWORK_PEERS = FRAMEWORK_PEER_NAMES.filter(
	(name) => FRAMEWORK_PEERS[name].kind === 'internal'
);
