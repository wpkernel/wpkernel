# Test Patterns Guide

**Status**: 🔒 **Enforced by ESLint** - Violations will fail CI

## Core Principle

**Never manually mock WordPress globals or browser APIs in test files.**  
All stubs are centralized in `tests/setup-jest.ts` and utilities in `tests/test-utils/`.

---

## ✅ Correct Patterns

### WordPress Globals

```typescript
// ✅ CORRECT: Use pre-configured window.wp
import { ensureWpData } from '../../../tests/test-utils/wp';

const wpData = ensureWpData();
wpData.select.mockReturnValue({ getItems: () => [...] });
```

```typescript
// ✅ CORRECT: Mock wp.hooks through existing stub
window.wp!.hooks!.doAction = jest.fn();
```

### Namespace Detection

```typescript
// ✅ CORRECT: Use test utilities
import {
	setKernelPackage,
	setWpPluginData,
} from '../../../tests/test-utils/wp';

setKernelPackage({ name: '@acme/plugin' });
setWpPluginData({ name: 'acme-plugin', slug: 'acme' });
```

### BroadcastChannel

```typescript
// ✅ CORRECT: Use centralized mock from setup-jest.ts
const channel = new BroadcastChannel('test-channel');
channel.postMessage({ type: 'event', data: {} });

// Access messages sent to the channel
expect((channel as any).messages).toContainEqual({ type: 'event', data: {} });
```

```typescript
// ✅ CORRECT: Test unavailability (SSR scenarios)
const original = global.BroadcastChannel;
global.BroadcastChannel = undefined;
// ... test code ...
global.BroadcastChannel = original; // Restore
```

### Storage APIs

```typescript
// ✅ CORRECT: Use jsdom's built-in storage
sessionStorage.setItem('key', 'value');
localStorage.clear();
```

---

## ❌ Anti-Patterns (Will Fail Lint)

### Manual WordPress Mocking

```typescript
// ❌ WRONG: Manual wp global assignment
window.wp = { hooks: { doAction: jest.fn() } };

// ❌ WRONG: Type assertions for wp
(window as typeof window & { wp?: unknown }).wp = {};

// ❌ WRONG: Recreating wpData stub
global.window.wp = {
	data: {
		select: jest.fn(),
		dispatch: jest.fn(),
	},
};
```

### Manual BroadcastChannel Mocking

```typescript
// ❌ WRONG: Recreating BroadcastChannel implementation (already in setup-jest.ts)
(global as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel =
	class {
		messages = [];
		postMessage(msg) {
			this.messages.push(msg);
		}
	} as unknown as typeof BroadcastChannel;

// ✅ CORRECT: Setting to undefined/restoring is OK (testing unavailability)
global.BroadcastChannel = undefined; // OK
global.BroadcastChannel = originalBroadcastChannel; // OK (restoring)
```

### Manual Storage Mocking

```typescript
// ❌ WRONG: Custom storage implementation
global.sessionStorage = {
	getItem: jest.fn(),
	setItem: jest.fn(),
} as any;
```

---

## Common Scenarios

### Testing Policy Events

```typescript
// ✅ CORRECT
import { ensureWpData } from '../../../tests/test-utils/wp';

const doAction = jest.fn();
window.wp!.hooks!.doAction = doAction;

// Test your code...

expect(doAction).toHaveBeenCalledWith(
	'wpk.policy.denied',
	expect.objectContaining({ policyKey: 'test' })
);
```

### Testing Cross-Tab Communication

```typescript
// ✅ CORRECT: Use built-in BroadcastChannel
const channel = new BroadcastChannel('wpk.policy.events');
const listener = jest.fn();
channel.onmessage = listener;

// Test your code...

expect(listener).toHaveBeenCalled();
channel.close();
```

### Testing with @wordpress/data Selectors

```typescript
// ✅ CORRECT
import { ensureWpData } from '../../../tests/test-utils/wp';

const mockCanUser = jest.fn().mockReturnValue(true);
ensureWpData().select.mockReturnValue({
	canUser: mockCanUser,
});

// Test your code...

expect(mockCanUser).toHaveBeenCalledWith('update', 'posts', 123);
```

### Testing Unavailability Scenarios

```typescript
// ✅ CORRECT: Set to undefined (not delete)
it('handles missing wp', () => {
	(window as Window & { wp?: unknown }).wp = undefined;

	const result = getWPData();
	expect(result).toBeUndefined();
});

// ✅ CORRECT: Test BroadcastChannel unavailability (SSR)
it('handles missing BroadcastChannel', () => {
	const original = global.BroadcastChannel;
	global.BroadcastChannel = undefined;

	// Test code that should handle missing BroadcastChannel...

	global.BroadcastChannel = original;
});
```

---

## Why These Rules Exist

1. **Consistency**: All tests use the same mocks, reducing confusion
2. **Type Safety**: No `any` casts needed - global types handle everything
3. **Maintainability**: Centralized stubs mean one place to update
4. **Reliability**: Proper cleanup between tests prevents flaky behavior

---

## When You Need Something New

If the existing stubs don't cover your use case:

1. **First**: Check if jsdom already provides it (BroadcastChannel, storage APIs)
2. **Second**: Add to `tests/test-utils/wp.ts` as a reusable helper
3. **Third**: Update `tests/setup-jest.ts` if it needs global setup
4. **Last Resort**: File-local mocking (document why in comments)

---

## Related Files

- `tests/test-globals.d.ts` - TypeScript global types
- `tests/setup-jest.ts` - Jest global setup with wpData/wpHooks stubs, BroadcastChannel mock
- `tests/test-utils/wp.ts` - Reusable test utilities
- `eslint.config.js` - Enforcement rules (see `@kernel/no-manual-test-globals`)
- `eslint-rules/no-manual-test-globals.js` - Custom ESLint rule implementation
