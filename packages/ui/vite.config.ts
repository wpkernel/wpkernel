import { createWPKLibConfig } from '../../vite.config.base';
import pkg from './package.json';

const dataviewsExternal = [
	/^@wordpress\/dataviews(\/.*)?$/,
	/^@wordpress\/dataviews$/,
];

const external = [
	...Object.keys(pkg.peerDependencies || {}),
	...dataviewsExternal,
	'@wordpress/data',
	'@wordpress/components',
	'@wordpress/element',
	'@wordpress/element/jsx-runtime',
];

export default createWPKLibConfig(
	'@wpkernel/ui',
	{
		index: 'src/index.ts',
		dataviews: 'src/dataviews/index.ts',
	},
	{
		external,
		// Keep console diagnostics in library builds while we debug DataViews wiring.
		dropConsoleInProd: false,
	}
);
