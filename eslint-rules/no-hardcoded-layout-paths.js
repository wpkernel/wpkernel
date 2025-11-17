/**
 * ESLint Rule: no-hardcoded-layout-paths
 *
 * Prevents hardcoded generated/apply paths such as ".wpk/..." or ".generated/..."
 * in source and test files. Path expectations should flow from the layout manifest
 * (via layout.resolve or a shared helper) so manifest edits do not break code or tests.
 *
 * @file Enforce layout-driven paths
 * @author WPKernel Team
 */

import path from 'path';

const DEFAULT_PATTERNS = [
	/\.wpk\//,
	/\.generated\//,
	/\.wpk\\\\/, // Windows
	/\.generated\\\\/,
];

const TEST_FILE_SUFFIXES = ['.test.ts', '.test.tsx', '.spec.ts', '.test.js'];

function isTestFile(filename) {
	return (
		filename.includes('__tests__') ||
		TEST_FILE_SUFFIXES.some((suffix) => filename.endsWith(suffix))
	);
}

function shouldIgnoreFile(filename) {
	// Allow the manifest itself and custom rules to contain literals.
	if (filename.includes('layout.manifest.json')) {
		return true;
	}

	if (filename.includes(`${path.sep}eslint-rules${path.sep}`)) {
		return true;
	}

	return false;
}

function literalText(node) {
	if (node.type === 'Literal' && typeof node.value === 'string') {
		return node.value;
	}

	if (node.type === 'TemplateLiteral' && node.quasis.length > 0) {
		return node.quasis.map((q) => q.value.raw).join('');
	}

	return null;
}

function containsHardcodedPath(text) {
	return DEFAULT_PATTERNS.some((regex) => regex.test(text));
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow hardcoded .wpk/.generated paths; use layout.resolve or shared helpers.',
			recommended: false,
		},
		schema: [],
		messages: {},
	},

	create(context) {
		const filename = context.getFilename();
		const advice = isTestFile(filename)
			? 'Use layout.resolve(...) from loadTestLayout() or the shared test helper derived from layout.manifest.json.'
			: 'Use layout.resolve(...) from the IR fragment (ir.layout) or loadLayoutFromWorkspace to derive paths from layout.manifest.json.';
		if (shouldIgnoreFile(filename)) {
			return {};
		}

		// Tests are included intentionally to push them toward helpers; suppress
		// by adding file-level eslint-disable if truly needed.
		const checkNode = (node) => {
			const text = literalText(node);
			if (!text) {
				return;
			}

			if (!containsHardcodedPath(text)) {
				return;
			}

			context.report({
				node,
				message: `Avoid hardcoded path "${text}". ${advice}`,
			});
		};

		return {
			Literal: checkNode,
			TemplateLiteral: checkNode,
		};
	},
};
