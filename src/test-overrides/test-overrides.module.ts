import { Global, MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { TestOverridesRegistry } from './test-overrides.registry';
import { TestOverridesPatchManager } from './test-overrides.patch-manager';
import { TestOverridesController } from './test-overrides.controller';
import { TestOverridesAuthMiddleware } from './test-overrides.middleware';

/**
 * Test Overrides Module
 * 
 * Provides runtime method/provider patching capabilities for testing.
 * Should only be enabled in test environments.
 * 
 * IMPORTANT: Import this module FIRST in your imports array to ensure
 * it initializes before other modules and can wrap all providers.
 * 
 * Features:
 * - Runtime method patching via Proxy pattern
 * - Full provider replacement via factory
 * - Secure code execution in VM sandbox
 * - HTTP API for applying overrides
 * - Authorization middleware
 * 
 * Usage:
 * Set environment variables:
 * - INTEGR8_OVERRIDES_ENABLED=1
 * - INTEGR8_OVERRIDES_TOKEN=your-secret-token
 * 
 * Then import this module FIRST in your AppModule:
 * @Module({
 *   imports: [
 *     TestOverridesModule,  // MUST BE FIRST!
 *     YourOtherModules,
 *   ]
 * })
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    TestOverridesRegistry,
    TestOverridesPatchManager,
  ],
  controllers: [TestOverridesController],
  exports: [TestOverridesRegistry, TestOverridesPatchManager],
})
export class TestOverridesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TestOverridesAuthMiddleware)
      .forRoutes(TestOverridesController);
  }

  /**
   * Helper to check if overrides are enabled
   */
  static isEnabled(): boolean {
    return process.env.INTEGR8_OVERRIDES_ENABLED === '1';
  }
}

