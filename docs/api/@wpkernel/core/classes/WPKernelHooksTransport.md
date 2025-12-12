[**@wpkernel/core v0.12.5-beta.0**](../README.md)

***

[@wpkernel/core](../README.md) / WPKernelHooksTransport

# Class: WPKernelHooksTransport

## Extends

- `LoggerlessTransport`

## Constructors

### Constructor

```ts
new WPKernelHooksTransport(level): WPKernelHooksTransport;
```

#### Parameters

##### level

`LogLevelType`

#### Returns

`WPKernelHooksTransport`

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
