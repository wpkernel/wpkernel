[**@wpkernel/core v0.12.5-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / createActionMiddleware

# Function: createActionMiddleware()

```ts
function createActionMiddleware<TState>(): ReduxMiddleware<TState>;
```

Create a Redux-compatible middleware that intercepts and executes WPKernel actions.

This middleware enables actions to be dispatched through Redux/`@wordpress/data` stores.
When an action envelope is dispatched, the middleware:

1. Intercepts the envelope before it reaches reducers
2. Extracts the action function and arguments
3. Executes the action (triggering lifecycle events, cache invalidation, etc.)
4. Returns the action's result (bypassing the reducer)

Standard Redux actions pass through untouched, ensuring compatibility with existing
store logic.

## Type Parameters

### TState

`TState` = `unknown`

Redux store state type

## Returns

[`ReduxMiddleware`](../type-aliases/ReduxMiddleware.md)<`TState`>

Redux middleware function

## Example

```typescript
// With Redux
import { createStore, applyMiddleware } from 'redux';

const actionMiddleware = createActionMiddleware();
const store = createStore(rootReducer, applyMiddleware(actionMiddleware));

// With @wordpress/data
import { register } from '@wordpress/data';

const actionMiddleware = createActionMiddleware();
register({
	reducer: rootReducer,
	actions: {},
	selectors: {},
	controls: {},
	__experimentalUseMiddleware: () => [actionMiddleware],
});

// Dispatching actions
import { invokeAction } from '@wpkernel/core';
import { CreatePost } from './actions/CreatePost';

const envelope = invokeAction(CreatePost, { title: 'Hello', content: '...' });
const result = await store.dispatch(envelope); // Returns post object
```
