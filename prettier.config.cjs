// prettier.config.cjs
const wpConfig = require('@wordpress/prettier-config');

module.exports = {
	...wpConfig,
	printWidth: 95, // or 90 if you want to be strict-but-not-stupid
};