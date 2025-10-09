import { 
  BadRequestException, 
  Body, 
  Controller, 
  Get, 
  Param, 
  Post 
} from '@nestjs/common';
import { TestOverridesRegistry } from './test-overrides.registry';
import { TestOverridesPatchManager } from './test-overrides.patch-manager';
import { compileFunctionInSandbox } from './test-overrides.util';
import { PostOverrideBody } from './test-overrides.types';

/**
 * Controller providing API for setting overrides
 */
@Controller('/__integr8__')
export class TestOverridesController {
  constructor(
    private readonly registry: TestOverridesRegistry,
    private readonly patchManager: TestOverridesPatchManager,
  ) {}

  /**
   * List all active overrides
   */
  @Get('/overrides')
  list() {
    return {
      overrides: this.registry.list(),
      proxiedProviders: this.patchManager.getProxiedProviders(),
    };
  }

  /**
   * Reset all overrides
   * MUST BE BEFORE /:token route to avoid matching reset-all as token
   */
  @Post('/override/reset-all')
  resetAll() {
    this.registry.resetAll();
    return { ok: true };
  }

  /**
   * Set override for a specific token
   */
  @Post('/override/:token')
  set(@Param('token') token: string, @Body() body: PostOverrideBody) {
    if (!token) {
      throw new BadRequestException('Missing token');
    }

    // Reset override
    if ('reset' in body && body.reset) {
      this.registry.reset(token);
      return { ok: true, reset: true };
    }

    // Set method patches
    if ('methods' in body) {
      const patches: Record<string, Function> = {};
      for (const [methodName, spec] of Object.entries(body.methods)) {
        if (spec.type !== 'fn') {
          throw new BadRequestException(
            `Unsupported method patch type for ${methodName}`
          );
        }
        const fn = compileFunctionInSandbox(spec.body, spec.args ?? []);
        patches[methodName] = fn;
      }
      this.registry.setMethods(token, patches);
      return { 
        ok: true, 
        applied: { 
          token, 
          methods: Object.keys(body.methods) 
        } 
      };
    }

    // Set factory
    if ('factory' in body) {
      const factoryFn = compileFunctionInSandbox(
        body.factory.body, 
        body.factory.args ?? []
      );
      // Factory will be called directly (without class construction), must return plain object with methods
      this.registry.setFactory(token, () => factoryFn());
      return { 
        ok: true, 
        applied: { 
          token, 
          factory: true 
        } 
      };
    }

    throw new BadRequestException('Unsupported payload');
  }

  /**
   * Health check
   */
  @Get('/health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      integr8: true,
      overridesEnabled: true,
    };
  }
}

