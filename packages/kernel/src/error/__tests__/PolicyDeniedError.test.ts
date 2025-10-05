/**
 * Policy Denied Error tests
 */

import { PolicyDeniedError } from '../PolicyDeniedError';

describe('PolicyDeniedError', () => {
	it('creates error with correct properties', () => {
		const error = new PolicyDeniedError({
			namespace: 'my-plugin',
			policyKey: 'posts.edit',
			params: { postId: 123 },
		});

		expect(error).toBeInstanceOf(PolicyDeniedError);
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('PolicyDeniedError');
		expect(error.code).toBe('PolicyDenied');
		expect(error.policyKey).toBe('posts.edit');
		expect(error.namespace).toBe('my-plugin');
		expect(error.messageKey).toBe('policy.denied.my-plugin.posts.edit');
		expect(error.message).toBe('Policy "posts.edit" denied.');
	});

	it('includes params in context for object params', () => {
		const error = new PolicyDeniedError({
			namespace: 'acme',
			policyKey: 'content.delete',
			params: { contentId: 456, reason: 'insufficient-permissions' },
		});

		expect(error.context).toEqual({
			policyKey: 'content.delete',
			contentId: 456,
			reason: 'insufficient-permissions',
		});
	});

	it('wraps primitive params in value property', () => {
		const error = new PolicyDeniedError({
			namespace: 'acme',
			policyKey: 'tasks.assign',
			params: 'user-123',
		});

		expect(error.context).toEqual({
			policyKey: 'tasks.assign',
			value: 'user-123',
		});
	});

	it('handles undefined params', () => {
		const error = new PolicyDeniedError({
			namespace: 'acme',
			policyKey: 'admin.access',
		});

		expect(error.context).toEqual({
			policyKey: 'admin.access',
		});
	});

	it('accepts custom error message', () => {
		const error = new PolicyDeniedError({
			namespace: 'acme',
			policyKey: 'posts.publish',
			message: 'Custom denial message',
		});

		expect(error.message).toBe('Custom denial message');
		expect(error.messageKey).toBe('policy.denied.acme.posts.publish');
	});

	it('merges additional context', () => {
		const error = new PolicyDeniedError({
			namespace: 'acme',
			policyKey: 'workflow.approve',
			params: { workflowId: 789 },
			context: { timestamp: 1234567890, userRole: 'editor' },
		});

		expect(error.context).toEqual({
			policyKey: 'workflow.approve',
			workflowId: 789,
			timestamp: 1234567890,
			userRole: 'editor',
		});
	});

	it('instanceof checks work correctly', () => {
		const error = new PolicyDeniedError({
			namespace: 'test',
			policyKey: 'test.action',
		});

		expect(error instanceof PolicyDeniedError).toBe(true);
		expect(error instanceof Error).toBe(true);
	});
});
