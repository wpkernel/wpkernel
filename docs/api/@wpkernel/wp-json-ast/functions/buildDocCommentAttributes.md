[**@wpkernel/wp-json-ast v0.12.3-beta.1**](../README.md)

***

[@wpkernel/wp-json-ast](../README.md) / buildDocCommentAttributes

# Function: buildDocCommentAttributes()

```ts
function buildDocCommentAttributes(lines): Readonly&lt;Record&lt;string, unknown&gt;&gt; | undefined;
```

Builds doc comment attributes from a list of lines.

## Parameters

### lines

readonly (`string` \| `undefined`)[]

The lines to add to the doc comment.

## Returns

`Readonly`&lt;`Record`&lt;`string`, `unknown`&gt;&gt; \| `undefined`

PHP attributes, or undefined if there are no lines.
