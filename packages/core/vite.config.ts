import { createWPKLibConfig } from '../../vite.config.base';
import pkg from './package.json';

const external = [
	...Object.keys(pkg.peerDependencies || {}),
	'@wordpress/dataviews',
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
	'loglayer',
	'@loglayer/shared',
	'@loglayer/transport',
];

export default createWPKLibConfig(
	'@wpkernel/core',
	{
		index: 'src/index.ts',
		http: 'src/http/index.ts',
		resource: 'src/resource/index.ts',
		error: 'src/error/index.ts',
		actions: 'src/actions/index.ts',
		data: 'src/data/index.ts',
		events: 'src/events/index.ts',
		capability: 'src/capability/index.ts',
		reporter: 'src/reporter/index.ts',
		interactivity: 'src/interactivity/index.ts',
		namespace: 'src/namespace/index.ts',
		contracts: 'src/contracts/index.ts',
		pipeline: 'src/pipeline/index.ts',
	},
	{
		external,
		dropConsoleInProd: false,
	}
);
