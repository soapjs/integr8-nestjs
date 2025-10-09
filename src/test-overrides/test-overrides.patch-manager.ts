import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, ModuleRef } from '@nestjs/core';
import { TestOverridesRegistry } from './test-overrides.registry';
import { tokenToString } from './test-overrides.util';

type AnyObj = Record<string, any>;

/**
 * Wraps existing instances in Proxy to enable runtime method patching
 */
@Injectable()
export class TestOverridesPatchManager implements OnApplicationBootstrap {
  private readonly logger = new Logger(TestOverridesPatchManager.name);

  // Map "token" (string/class name) -> reference to original instance and proxy
  private proxies = new Map<string, { original: AnyObj; proxy: AnyObj }>();

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly registry: TestOverridesRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Starting to wrap providers for runtime patching...');
    
    // Wrap ALL providers (except controllers) in Proxy to allow patching methods after startup
    const wrappers = this.discovery.getProviders(); // InstanceWrapper<any>[]
    this.logger.debug(`Found ${wrappers.length} providers`);
    
    for (const w of wrappers) {
      // Skip elements without instance / controllers / internal
      if (!w?.instance || !w?.name || w.isAlias) {
        continue;
      }

      const token = tokenToString(w.token);
      
      // Avoid wrapping the registry and patch-manager themselves
      if (
        token.includes('TestOverridesRegistry') ||
        token.includes('TestOverridesPatchManager') ||
        token.includes('DiscoveryService') ||
        token.includes('ModuleRef')
      ) {
        continue;
      }

      if (this.proxies.has(token)) {
        continue;
      }

      const original = w.instance as AnyObj;
      
      // Patch methods directly on the instance (not replacing the whole instance)
      this.patchInstanceMethods(token, original);

      this.proxies.set(token, { original, proxy: original }); // Store reference
      this.logger.debug(`Patched methods on provider: ${token}`);
    }
    
    this.logger.log(`Successfully patched ${this.proxies.size} providers`);
  }

  /**
   * Patch methods directly on the instance instead of replacing it
   * This ensures controllers that already have the instance injected will use patched methods
   */
  private patchInstanceMethods(token: string, instance: AnyObj): void {
    // Get all methods of the instance
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(prototype)
      .filter(name => {
        if (name === 'constructor') return false;
        
        try {
          // Safely check if it's a function
          const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
          if (!descriptor) return false;
          
          // Skip getters/setters
          if (descriptor.get || descriptor.set) return false;
          
          // Check if it's a function on instance
          return typeof instance[name] === 'function';
        } catch {
          return false;
        }
      });

    this.logger.verbose(`Methods found on ${token}: ${methodNames.join(', ')}`);

    // Replace each method with a wrapper that checks registry first
    for (const methodName of methodNames) {
      const originalMethod = instance[methodName].bind(instance);
      
      instance[methodName] = (...args: any[]) => {
        // Check if there's an override
        const rec = this.registry.get(token);
        
        if (rec?.factory) {
          // Use factory
          const factoryInst = rec.factory();
          if (factoryInst && typeof factoryInst[methodName] === 'function') {
            return factoryInst[methodName](...args);
          }
        }
        
        if (rec?.methods?.has(methodName)) {
          // Use method patch
          const patched = rec.methods.get(methodName)!;
          return patched.apply(instance, args);
        }
        
        // Use original
        return originalMethod(...args);
      };
    }
  }

  private buildProxy(token: string, target: AnyObj): AnyObj {
    // "Lazy getter" for current implementation: factory > original
    const getCurrentImpl = () => {
      const rec = this.registry.get(token);
      if (rec?.factory) {
        try {
          return rec.factory();
        } catch (e) {
          // In case of factory error – fallback to original
          this.logger.warn(`Factory error for ${token}, using original`, e);
          return target;
        }
      }
      return target;
    };

    const handler: ProxyHandler<AnyObj> = {
      get: (t, prop, receiver) => {
        // Support reading symbols/etc.
        const key = String(prop);
        
        // If method patch exists, return patch function with correct this/args
        const rec = this.registry.get(token);
        
        if (rec?.methods?.has(key)) {
          const patched = rec.methods.get(key)!;
          // Bind "this" to original (or mock) instance
          return (...args: any[]) => patched.apply(getCurrentImpl(), args);
        }
        
        // Otherwise delegate to current implementation (factory or original)
        const impl = getCurrentImpl();
        const value = Reflect.get(impl, prop, receiver);
        
        // If it's a method, bind this to impl
        if (typeof value === 'function') {
          return (...args: any[]) => value.apply(impl, args);
        }
        return value;
      },
      
      set: (t, prop, value, receiver) => {
        const impl = getCurrentImpl();
        return Reflect.set(impl, prop, value, receiver);
      },
      
      has: (t, prop) => {
        const impl = getCurrentImpl();
        return prop in impl;
      },
      
      ownKeys: (t) => {
        const impl = getCurrentImpl();
        return Reflect.ownKeys(impl);
      },
      
      getOwnPropertyDescriptor: (t, prop) => {
        const impl = getCurrentImpl();
        return Object.getOwnPropertyDescriptor(impl, prop);
      },
    };

    return new Proxy(target, handler);
  }

  /**
   * Get list of proxied providers (for debugging)
   */
  getProxiedProviders(): string[] {
    return Array.from(this.proxies.keys());
  }
}

