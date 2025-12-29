[**@wpkernel/php-json-ast v0.12.6-beta.3**](../README.md)

---

[@wpkernel/php-json-ast](../README.md) / buildComment

# Function: buildComment()

```ts
function buildComment(text, location): PhpComment;
```

Builds a generic PHP comment node.

## Parameters

### text

`string`

The text content of the comment.

### location

[`PhpCommentLocation`](../interfaces/PhpCommentLocation.md) = `{}`

Optional location information for the comment.

## Returns

[`PhpComment`](../interfaces/PhpComment.md)

A `PhpComment` node.
