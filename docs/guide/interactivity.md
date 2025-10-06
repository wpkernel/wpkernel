# Interactivity API

> **Status**: 🚧 This page will be expanded in Sprint 1+

Add front-end behavior to blocks without custom JavaScript.

Use for client-side interactions that don't need React. Always route writes through Actions.

## Quick Reference

```typescript
import { defineInteraction } from '@geekist/wp-kernel/interactivity';
import { CreateTestimonial } from '@/actions/Testimonial/Create';

export const useTestimonialForm = defineInteraction('wpk/testimonial-form', {
	state: () => ({ saving: false, error: null }),
	actions: {
		async submit(formData) {
			this.state.saving = true;
			this.state.error = null;

			try {
				// ✓ Route through Action
				await CreateTestimonial({ data: formData });
			} catch (e) {
				this.state.error = e.message;
			} finally {
				this.state.saving = false;
			}
		},
	},
});
```

## See Also

- [WordPress Interactivity API](https://developer.wordpress.org/block-editor/reference-guides/interactivity-api/)
- [Actions Guide](/guide/actions) - Calling actions from interactivity
