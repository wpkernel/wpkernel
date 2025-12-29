[**@wpkernel/core v0.12.6-beta.3**](../README.md)

---

[@wpkernel/core](../README.md) / ActionJobs

# Type Alias: ActionJobs

```ts
type ActionJobs = object;
```

Background job orchestration interface for asynchronous work.

Actions use this interface to schedule and wait for background jobs (email sending,
data processing, webhook delivery). The actual job execution is handled by the runtime
job engine provided by the host application.

## Example

```typescript
async function SendWelcomeEmail(ctx, { userId }) {
	// Enqueue background job
	await ctx.jobs.enqueue('email.send', {
		to: user.email,
		template: 'welcome',
		userId,
	});

	// Or wait for job completion
	const result = await ctx.jobs.wait('email.send', payload, {
		timeoutMs: 30000,
		pollIntervalMs: 1000,
	});
}
```

## Properties

### enqueue()

```ts
enqueue: <TPayload>(jobName, payload) => Promise<void>;
```

#### Type Parameters

##### TPayload

`TPayload`

#### Parameters

##### jobName

`string`

##### payload

`TPayload`

#### Returns

`Promise`<`void`>

---

### wait()

```ts
wait: <TPayload, TResult>(jobName, payload, options?) => Promise<TResult>;
```

#### Type Parameters

##### TPayload

`TPayload`

##### TResult

`TResult`

#### Parameters

##### jobName

`string`

##### payload

`TPayload`

##### options?

[`WaitOptions`](WaitOptions.md)

#### Returns

`Promise`<`TResult`>
