[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / defineInteraction

# Function: defineInteraction()

```ts
function defineInteraction&lt;TEntity, TQuery, TStore, TActions&gt;(options): DefinedInteraction&lt;InteractivityStoreResult&gt;;
```

Define an interactivity store that bridges a resource and optional actions to
the WordPress interactivity runtime.

The helper automatically derives a namespaced store key, registers the
provided store configuration with WordPress, and synchronizes the resource
cache when server state is available.

```typescript
import { defineInteraction } from '@wpkernel/core/interactivity';
import { testimonial } from '@/resources/testimonial';
import { ApproveTestimonial } from '@/actions/ApproveTestimonial';

const TestimonialReview = defineInteraction({
  resource: testimonial,
  feature: 'review',
  actions: {
    approve: ApproveTestimonial,
  },
});

await TestimonialReview.store.actions.approve({ id: 101 });
```

## Type Parameters

### TEntity

`TEntity`

### TQuery

`TQuery`

### TStore

`TStore` *extends* `Record`&lt;`string`, `unknown`&gt; = `Record`&lt;`string`, `unknown`&gt;

### TActions

`TActions` *extends* [`InteractionActionsRecord`](../type-aliases/InteractionActionsRecord.md) = [`InteractionActionsRecord`](../type-aliases/InteractionActionsRecord.md)

## Parameters

### options

[`DefineInteractionOptions`](../interfaces/DefineInteractionOptions.md)&lt;`TEntity`, `TQuery`, `TStore`, `TActions`&gt;

## Returns

[`DefinedInteraction`](../interfaces/DefinedInteraction.md)&lt;[`InteractivityStoreResult`](../type-aliases/InteractivityStoreResult.md)&gt;
