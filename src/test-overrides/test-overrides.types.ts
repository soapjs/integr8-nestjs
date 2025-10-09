/**
 * Types for Test Overrides Module
 */

export type MethodPatch = {
  type: 'fn';
  // Function signature - informational only, validated at runtime
  args?: string[];
  // Function body: pure JS, no access to require/process (sandbox)
  body: string;
};

export type FactoryPatch = {
  // Optional args (e.g. for DI inside mock - still no require access)
  args?: string[];
  // Must return an object implementing methods used at runtime
  body: string;
};

export type OverrideRecord = {
  methods?: Map<string, Function>;
  factory?: () => any; // Creates a full "mock instance"
};

export type PostOverrideBody =
  | { reset: true }
  | { methods: Record<string, MethodPatch> }
  | { factory: FactoryPatch };

export type OverrideListResponse = Record<string, {
  methods: string[];
  hasFactory: boolean;
}>;

