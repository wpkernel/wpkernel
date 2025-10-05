import path from 'path';

const SRC_SEGMENT = path.join('packages', 'kernel', 'src');
const ALLOWED_SEGMENTS = [path.join('packages', 'kernel', 'src', 'reporter')];

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow console usage in kernel core; use reporter instead.',
			recommended: false,
		},
		messages: {
			noConsole:
				'Use the reporter module instead of console. kernel core code must not call console APIs directly.',
		},
		schema: [],
	},

	create(context) {
		const filename = context.getFilename();
		if (!filename.includes(SRC_SEGMENT)) {
			return {};
		}

		if (ALLOWED_SEGMENTS.some((segment) => filename.includes(segment))) {
			return {};
		}

		if (filename.includes('__tests__')) {
			return {};
		}

		return {
			"MemberExpression[object.name='console']"(node) {
				context.report({
					node,
					messageId: 'noConsole',
				});
			},
		};
	},
};
