import type { CapabilityHelpers } from '@wpkernel/core/capability';

export type CapabilityConfig = {};
export type CapabilityKey = keyof CapabilityConfig;
export type CapabilityRuntime = CapabilityHelpers<CapabilityConfig>;

export declare const capabilities: CapabilityHelpers<CapabilityConfig>;
