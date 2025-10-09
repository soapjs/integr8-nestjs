// Re-export everything from @soapjs/integr8
export * from '@soapjs/integr8';

// Export NestJS-specific functionality
export { bootstrapNestJsIntegr8, bootstrapAndListen, BootstrapOptions } from './bootstrap';
export { Integr8TestModule } from './test.module';
export { createTestMiddleware } from './test.middleware';
export { NestJSAdapter } from './adapter';

// Export Test Overrides Module (new Proxy-based runtime patching)
export { TestOverridesModule } from './test-overrides/test-overrides.module';
export { TestOverridesRegistry } from './test-overrides/test-overrides.registry';
export { TestOverridesPatchManager } from './test-overrides/test-overrides.patch-manager';
export type { 
  MethodPatch, 
  FactoryPatch, 
  OverrideRecord, 
  PostOverrideBody,
  OverrideListResponse 
} from './test-overrides/test-overrides.types';