/**
 * ESLint Rule: no-manual-test-globals
 *
 * Enforces usage of centralized test utilities instead of manual mocking
 * of WordPress globals, BroadcastChannel, and browser APIs.
 *
 * @file Prevent manual mocking of globals in test files
 * @author WP Kernel Team
 */

export default {
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce usage of centralized test utilities',
			category: 'Best Practices',
			recommended: true,
			url: 'https://github.com/theGeekist/wp-kernel/blob/main/tests/TEST_PATTERNS.md',
		},
		messages: {
			manualWpGlobal:
				'Do not manually assign window.wp or global.wp at the top level. Use window.wp! from setup-jest.ts or test-utils helpers.',
			manualStorage:
				"Do not manually mock sessionStorage/localStorage. Use jsdom's built-in implementations.",
			deleteWpGlobal:
				"Do not delete window.wp manually. It's reset by setup-jest.ts afterEach.",
			deleteGlobalBroadcastChannel:
				'Do not delete global.BroadcastChannel. It is provided by setup-jest.ts.',
			manualGlobalBroadcastChannel:
				'Do not manually mock global.BroadcastChannel. It is provided by setup-jest.ts.',
		},
		fixable: null,
		schema: [],
	},

	create(context) {
		// Only apply to test files
		const filename = context.getFilename();
		if (
			!filename.includes('__tests__') &&
			!filename.endsWith('.test.ts') &&
			!filename.endsWith('.test.tsx')
		) {
			return {};
		}

		return {
			// Catch: global.wp = { ... } (but allow window.wp for test-specific mocking)
			'AssignmentExpression[left.object.name="global"][left.property.name="wp"]'(
				node
			) {
				context.report({
					node,
					messageId: 'manualWpGlobal',
				});
			},

			// Catch: global.BroadcastChannel = class { ... }
			// But ALLOW:
			//   - global.BroadcastChannel = undefined (testing absence/SSR)
			//   - global.BroadcastChannel = originalBroadcastChannel (restoring)
			// (setup-jest.ts provides the mock centrally)
			'AssignmentExpression[left.object.name="global"][left.property.name="BroadcastChannel"]'(
				node
			) {
				// Allow setting to undefined (testing SSR/unavailability)
				if (
					node.right.type === 'Identifier' &&
					node.right.name === 'undefined'
				) {
					return;
				}

				// Allow setting to a variable (restoring original value)
				if (node.right.type === 'Identifier') {
					return;
				}

				context.report({
					node,
					messageId: 'manualGlobalBroadcastChannel',
				});
			},

			// Catch type casts for global.BroadcastChannel (unless setting to undefined/variable)
			'AssignmentExpression > TSAsExpression[expression.name="global"]'(
				node
			) {
				const parent = node.parent;
				if (
					parent.type === 'AssignmentExpression' &&
					parent.left.type === 'MemberExpression' &&
					parent.left.property.name === 'BroadcastChannel'
				) {
					// Allow setting to undefined or a variable
					if (parent.right.type === 'Identifier') {
						return;
					}

					context.report({
						node: parent,
						messageId: 'manualGlobalBroadcastChannel',
					});
				}
			}, // Catch: global.sessionStorage = { ... }
			// Catch: global.localStorage = { ... }
			'AssignmentExpression[left.object.name="global"][left.property.name=/^(sessionStorage|localStorage)$/]'(
				node
			) {
				context.report({
					node,
					messageId: 'manualStorage',
				});
			},

			// Catch: delete window.wp or delete (window as ...).wp
			'UnaryExpression[operator="delete"]'(node) {
				const arg = node.argument;

				// Direct: delete window.wp
				if (
					arg.type === 'MemberExpression' &&
					arg.object.name === 'window' &&
					arg.property.name === 'wp'
				) {
					context.report({
						node,
						messageId: 'deleteWpGlobal',
					});
				}

				// Cast: delete (window as ...).wp
				if (
					arg.type === 'MemberExpression' &&
					arg.object.type === 'TSAsExpression' &&
					arg.object.expression.name === 'window' &&
					arg.property.name === 'wp'
				) {
					context.report({
						node,
						messageId: 'deleteWpGlobal',
					});
				}

				// delete (global as { BroadcastChannel?: ... }).BroadcastChannel
				if (
					arg.type === 'MemberExpression' &&
					arg.property.name === 'BroadcastChannel'
				) {
					const objName =
						arg.object.type === 'Identifier'
							? arg.object.name
							: null;
					const isTSAs =
						arg.object.type === 'TSAsExpression' &&
						arg.object.expression.name === 'global';

					if (objName === 'global' || isTSAs) {
						context.report({
							node,
							messageId: 'deleteGlobalBroadcastChannel',
						});
					}
				}
			},
		};
	},
};
