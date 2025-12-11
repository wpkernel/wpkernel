[**@wpkernel/e2e-utils v0.12.3-beta.2**](../README.md)

***

[@wpkernel/e2e-utils](../README.md) / test

# Variable: test

```ts
const test: TestType&lt;PlaywrightTestArgs & PlaywrightTestOptions & object & object, PlaywrightWorkerArgs & PlaywrightWorkerOptions & object&gt;;
```

Extended test fixture with wpk utilities

Provides all WordPress E2E fixtures plus:
- `kernel`: Kernel utilities factory for resources, stores, and events

## Example

```typescript
import { test, expect } from '@wpkernel/e2e-utils';

test('job workflow', async ({ admin, kernel, page }) =&gt; {
  await admin.visitAdminPage('admin.php', 'page=my-plugin-jobs');

  const job = kernel.resource({ name: 'job', routes: {...} });
  await job.seed({ title: 'Engineer' });

  const jobStore = kernel.store('my-plugin/job');
  await jobStore.wait(s =&gt; s.getList());

  await expect(page.getByText('Engineer')).toBeVisible();
});
```
