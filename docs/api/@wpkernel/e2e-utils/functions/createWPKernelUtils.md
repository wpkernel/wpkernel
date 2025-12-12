[**@wpkernel/e2e-utils v0.12.4-beta.0**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / createWPKernelUtils

# Function: createWPKernelUtils()

```ts
function createWPKernelUtils(fixtures): WPKernelUtils;
```

Create WPkernel-aware E2E utilities

Single factory that produces resource, store, and event helpers
for testing WPKernel applications.

## Parameters

### fixtures

[`WordPressFixtures`](../type-aliases/WordPressFixtures.md)

WordPress E2E fixtures from test context

## Returns

[`WPKernelUtils`](../type-aliases/WPKernelUtils.md)

WPKernel utilities object with helper factories

## Example

```typescript
import { test, expect } from '@wpkernel/e2e-utils';

test('job workflow', async ({ page, admin, requestUtils, wpkernel }) =&gt; {
  const job = wpkernel.resource({ name: 'job', routes: {...} });
  await job.seed({ title: 'Engineer' });

  const jobStore = wpkernel.store('my-plugin/job');
  await jobStore.wait(s =&gt; s.getList());

  const recorder = await wpkernel.events({ pattern: /^my-plugin\.job\./ });
  expect(recorder.list()).toHaveLength(1);
});
```
