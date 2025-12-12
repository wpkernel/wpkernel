[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / ConsoleTransport

# Class: ConsoleTransport

Console transport for browser and test environments.
Outputs logs in a simple, structured format: `["[namespace]", "message", context]`

## Extends

- `LoggerlessTransport`

## Constructors

### Constructor

```ts
new ConsoleTransport(level): ConsoleTransport;
```

#### Parameters

##### level

`LogLevelType`

#### Returns

`ConsoleTransport`

#### Overrides

```ts
LoggerlessTransport.constructor
```

## Methods

### shipToLogger()

```ts
shipToLogger(params): unknown[];
```

Sends the log data to the logger for transport

#### Parameters

##### params

`LogLayerTransportParams`

#### Returns

`unknown`[]

#### Overrides

```ts
LoggerlessTransport.shipToLogger
```
