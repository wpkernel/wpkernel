[**@wpkernel/core v0.12.3-beta.2**](../README.md)

***

[@wpkernel/core](../README.md) / CapabilityAdapters

# Type Alias: CapabilityAdapters

```ts
type CapabilityAdapters = object;
```

Adapters that capability rules can leverage when evaluating capabilities.

Adapters provide standardized interfaces for capability checking across different
systems (WordPress core, REST APIs, custom backends). The capability runtime auto-detects
and injects wp.data.select('core').canUser() when available.

## Examples

```typescript
// Using WordPress adapter in capability rule
const capability = defineCapability({
  map: {
    'posts.edit': async (ctx, postId: number) =&gt; {
    // ctx.adapters.wp is auto-injected
    const result = await ctx.adapters.wp?.canUser('update', {
      kind: 'postType',
      name: 'post',
      id: postId
    });
    return result ?? false;
  }
});
```

```typescript
// Custom adapter for REST endpoint probing
const capability = defineCapability({
  map: rules,
  options: {
    adapters: {
      restProbe: async (key) =&gt; {
        const res = await fetch(`/wp-json/acme/v1/capabilities/${key}`);
        return res.ok;
      }
    }
  }
});

// Use in rule
'feature.enabled': async (ctx) =&gt; {
  return await ctx.adapters.restProbe?.('advanced-features') ?? false;
}
```

## Properties

### restProbe()?

```ts
optional restProbe: (key) =&gt; Promise&lt;boolean&gt;;
```

#### Parameters

##### key

`string`

#### Returns

`Promise`&lt;`boolean`&gt;

***

### wp?

```ts
optional wp: object;
```

#### canUser()

```ts
canUser: (action, resource) =&gt; boolean | Promise&lt;boolean&gt;;
```

##### Parameters

###### action

`"create"` | `"read"` | `"update"` | `"delete"`

###### resource

\{
`path`: `string`;
\} | \{
`kind`: `"postType"`;
`name`: `string`;
`id?`: `number`;
\}

##### Returns

`boolean` \| `Promise`&lt;`boolean`&gt;
