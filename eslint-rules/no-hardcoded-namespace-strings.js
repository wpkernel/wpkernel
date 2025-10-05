/**
 * ESLint Rule: no-hardcoded-namespace-strings
 *
 * Enforces usage of WPK_NAMESPACE, WPK_EVENTS, and WPK_SUBSYSTEM_NAMESPACES constants
 * instead of hardcoded namespace strings like 'wpk', 'wpk.action.start', 'kernel.policy', etc.
 *
 * This prevents namespace drift and ensures a single source of truth for all
 * framework namespace identifiers.
 *
 * @file Prevent hardcoded namespace strings outside namespace/constants.ts
 * @author WP Kernel Team
 */

import path from 'path';

// Allowed file: where namespace constants are defined
const CONSTANTS_FILE = path.join(
	'packages',
	'kernel',
	'src',
	'namespace',
	'constants.ts'
);

// Patterns that indicate hardcoded namespace strings
const NAMESPACE_PATTERNS = {
	// Event names (public API)
	EVENT_NAMES: [
		'wpk.action.start',
		'wpk.action.complete',
		'wpk.action.error',
		'wpk.resource.request',
		'wpk.resource.response',
		'wpk.resource.error',
		'wpk.cache.invalidated',
	],

	// Subsystem namespaces
	SUBSYSTEM_NAMESPACES: [
		'wpk.policy',
		'wpk.policy.cache',
		'wpk.cache',
		'wpk.actions',
		'wpk.namespace',
		'wpk.reporter',
		'kernel.policy', // Legacy, should use wpk.policy
	],

	// Infrastructure/channel names
	INFRASTRUCTURE: [
		'wpk.actions', // BroadcastChannel
		'wpk.policy.cache',
		'wpk.policy.events',
	],

	// Namespace prefix patterns (for string operations)
	PREFIX_PATTERNS: ['wpk/', 'wpk.', 'kernel.'],
};

// Flatten all patterns for checking
const ALL_HARDCODED_STRINGS = [
	...NAMESPACE_PATTERNS.EVENT_NAMES,
	...NAMESPACE_PATTERNS.SUBSYSTEM_NAMESPACES,
	...NAMESPACE_PATTERNS.INFRASTRUCTURE,
];

/**
 * Check if a string literal contains a hardcoded namespace
 * @param {string} value - The string value to check
 * @return {boolean} True if value contains a hardcoded namespace
 */
function containsHardcodedNamespace(value) {
	// Exact matches
	if (ALL_HARDCODED_STRINGS.includes(value)) {
		return true;
	}

	// Check for prefix patterns in string operations
	// e.g., "wpk/" in moduleId.startsWith('wpk/')
	for (const prefix of NAMESPACE_PATTERNS.PREFIX_PATTERNS) {
		if (value === prefix || value.startsWith(prefix)) {
			return true;
		}
	}

	return false;
}

/**
 * Get the appropriate constant suggestion based on the hardcoded string
 * @param {string} value - The hardcoded string value
 * @return {string} Suggestion for the correct constant to use
 */
function getConstantSuggestion(value) {
	// Event names
	if (NAMESPACE_PATTERNS.EVENT_NAMES.includes(value)) {
		const constantName = value
			.replace('wpk.', '')
			.replace(/\./g, '_')
			.toUpperCase();
		return `WPK_EVENTS.${constantName}`;
	}

	// Subsystem namespaces
	if (NAMESPACE_PATTERNS.SUBSYSTEM_NAMESPACES.includes(value)) {
		if (value === 'kernel.policy') {
			return 'WPK_SUBSYSTEM_NAMESPACES.POLICY (changed from kernel.policy to wpk.policy)';
		}
		const constantName = value
			.replace('wpk.', '')
			.replace(/\./g, '_')
			.toUpperCase();
		return `WPK_SUBSYSTEM_NAMESPACES.${constantName}`;
	}

	// Infrastructure
	if (value === 'wpk.actions') {
		return 'WPK_INFRASTRUCTURE.ACTIONS_CHANNEL';
	}

	// Prefix patterns
	if (value === 'wpk/') {
		return '`${WPK_NAMESPACE}/` or WPK_NAMESPACE constant';
	}
	if (value === 'wpk.') {
		return '`${WPK_NAMESPACE}.` or WPK_NAMESPACE constant';
	}
	if (value === 'wpk') {
		return 'WPK_NAMESPACE';
	}
	if (value === 'kernel.') {
		return 'WPK_SUBSYSTEM_NAMESPACES constants';
	}

	return 'appropriate constant from namespace/constants.ts';
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce usage of namespace constants instead of hardcoded strings',
			category: 'Best Practices',
			recommended: true,
			url: 'https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/namespace/constants.ts',
		},
		messages: {
			hardcodedNamespace:
				'Hardcoded namespace string "{{value}}" found. Use {{suggestion}} from namespace/constants.ts instead.',
			hardcodedNamespaceGeneric:
				'Hardcoded namespace string "{{value}}" found. Import and use constants from namespace/constants.ts to prevent namespace drift.',
		},
		fixable: null, // Could add auto-fix in the future
		schema: [],
	},

	create(context) {
		const filename = context.getFilename();

		// Skip the constants file itself
		if (filename.includes(CONSTANTS_FILE)) {
			return {};
		}

		// Skip ESLint rule files (they define the patterns)
		if (filename.includes('eslint-rules')) {
			return {};
		}

		// Skip test files
		if (
			filename.includes('__tests__') ||
			filename.endsWith('.test.ts') ||
			filename.endsWith('.test.tsx') ||
			filename.endsWith('.spec.ts')
		) {
			return {};
		}

		// Skip documentation files (JSDoc examples showing API usage)
		// But DO check actual e2e-utils implementation code
		if (
			filename.includes(path.join('docs', 'api')) ||
			filename.includes('README.md') ||
			filename.includes('CHANGELOG.md') ||
			filename.endsWith('.md')
		) {
			return {};
		}

		return {
			// Check string literals
			Literal(node) {
				// Only check string literals
				if (typeof node.value !== 'string') {
					return;
				}

				// Skip if this is a JSDoc comment or appears to be in a comment context
				// (ESLint doesn't parse comments as nodes, but we can check parent context)
				const sourceCode = context.getSourceCode();
				const comments = sourceCode.getAllComments();

				// Check if this literal is within a comment range
				for (const comment of comments) {
					if (
						node.range[0] >= comment.range[0] &&
						node.range[1] <= comment.range[1]
					) {
						return; // Skip - it's in a comment
					}
				}

				// Check for hardcoded namespace
				if (containsHardcodedNamespace(node.value)) {
					const suggestion = getConstantSuggestion(node.value);

					context.report({
						node,
						messageId: 'hardcodedNamespace',
						data: {
							value: node.value,
							suggestion,
						},
					});
				}
			},

			// Check template literals (e.g., `wpk/${something}`)
			TemplateLiteral(node) {
				// Check quasis (static parts of template literal)
				for (const quasi of node.quasis) {
					const value = quasi.value.raw;

					// Check for namespace prefixes
					for (const prefix of NAMESPACE_PATTERNS.PREFIX_PATTERNS) {
						if (value.includes(prefix)) {
							const suggestion = getConstantSuggestion(prefix);

							context.report({
								node: quasi,
								messageId: 'hardcodedNamespace',
								data: {
									value: prefix,
									suggestion,
								},
							});
							break; // Only report once per quasi
						}
					}
				}
			},
		};
	},
};
