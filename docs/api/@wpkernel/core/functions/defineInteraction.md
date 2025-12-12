[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / defineInteraction

# Function: defineInteraction()

```ts
function defineInteraction<TEntity, TQuery, TStore, TActions>(options): DefinedInteraction<InteractivityStoreResult>;
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

`TStore` _extends_ `Record`<`string`, `unknown`> = `Record`<`string`, `unknown`>

### TActions

`TActions` _extends_ [`InteractionActionsRecord`](../type-aliases/InteractionActionsRecord.md) = [`InteractionActionsRecord`](../type-aliases/InteractionActionsRecord.md)

## Parameters

### options

[`DefineInteractionOptions`](../interfaces/DefineInteractionOptions.md)<`TEntity`, `TQuery`, `TStore`, `TActions`>

## Returns

[`DefinedInteraction`](../interfaces/DefinedInteraction.md)<[`InteractivityStoreResult`](../type-aliases/InteractivityStoreResult.md)>
