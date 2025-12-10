import { EventEmitter } from 'node:events';
import type { ChildProcess, PromiseWithChild } from 'node:child_process';
import type { QuickstartDependencies } from '../../src/dx/readiness/helpers';

export type QuickstartDepsMock = QuickstartDependencies & {
	readonly mkdtemp: jest.MockedFunction<QuickstartDependencies['mkdtemp']>;
	readonly rm: jest.MockedFunction<QuickstartDependencies['rm']>;
	readonly exec: jest.MockedFunction<QuickstartDependencies['exec']>;
	readonly access: jest.MockedFunction<QuickstartDependencies['access']>;
	readonly resolve: jest.MockedFunction<QuickstartDependencies['resolve']>;
};

export function makePromiseWithChild<T>(value: T): PromiseWithChild<T> {
	const promise = Promise.resolve(value) as PromiseWithChild<T>;
	promise.child = new EventEmitter() as unknown as ChildProcess;
	return promise;
}

export function makeRejectedPromiseWithChild<T = never>(
	error: unknown
): PromiseWithChild<T> {
	const promise = Promise.reject(error) as PromiseWithChild<T>;
	promise.child = new EventEmitter() as unknown as ChildProcess;
	return promise;
}

export function createQuickstartDepsMock(): QuickstartDepsMock {
	const mkdtemp = jest.fn(
		async (prefix: string) => `${prefix}/wpk-quickstart-mock`
	) as unknown as jest.MockedFunction<QuickstartDependencies['mkdtemp']>;

	const rm = jest.fn(
		async (..._args: Parameters<QuickstartDependencies['rm']>) => {}
	) as jest.MockedFunction<QuickstartDependencies['rm']>;

	const exec = jest.fn(
		(..._args: Parameters<QuickstartDependencies['exec']>) =>
			makePromiseWithChild({
				stdout: 'ok',
				stderr: '',
			})
	) as unknown as jest.MockedFunction<QuickstartDependencies['exec']>;

	const access = jest.fn(
		async (..._args: Parameters<QuickstartDependencies['access']>) => {}
	) as jest.MockedFunction<QuickstartDependencies['access']>;

	const resolve = jest.fn(
		(..._args: Parameters<QuickstartDependencies['resolve']>) =>
			'/mock/node_modules/tsx'
	) as jest.MockedFunction<QuickstartDependencies['resolve']>;

	return { mkdtemp, rm, exec, access, resolve };
}
