import { Adapter, AdapterConfig, createServiceLogger } from "@soapjs/integr8";
import { INestApplication, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

export class NestJSAdapter implements Adapter {
  public name = 'nestjs';
  private overrides: Map<string, any> = new Map();
  private originalProviders: Map<string, any> = new Map();
  private moduleRef?: ModuleRef;
  private app?: INestApplication;
  private logger: any;

  async initialize(config: AdapterConfig): Promise<void> {
    // Create logger for this adapter
    const serviceConfig = {
        category: 'service' as const,
        name: 'nestjs-adapter',
        type: 'service' as const,
        logging: config.config?.logging
    };
    this.logger = createServiceLogger(serviceConfig, 'nestjs-adapter');
    
    this.logger.info('Initializing NestJS adapter');
    
    // Adapter will receive ModuleRef and Application references via setNestJSReferences
  }

  async applyOverride(type: string, name: string, implementation: any): Promise<void> {
    const key = `${type}:${name}`;
    this.overrides.set(key, implementation);
    
    // Apply the override to NestJS
    await this.applyOverrideToNestJS(type, name, implementation);
    
    this.logger?.debug(`NestJS adapter applied override: ${key}`);
  }

  async teardown(): Promise<void> {
    this.logger?.info('Tearing down NestJS adapter');
    
    // Restore original providers
    for (const [key, originalProvider] of this.originalProviders.entries()) {
      const [type, name] = key.split(':');
      try {
        await this.restoreOriginalProvider(type, name, originalProvider);
      } catch (error) {
        this.logger?.warn(`Failed to restore ${key}: ${(error as Error).message}`);
      }
    }
    
    this.overrides.clear();
    this.originalProviders.clear();
  }

  private async applyOverrideToNestJS(type: string, name: string, implementation: any): Promise<void> {
    // Apply the override to NestJS based on type
    switch (type) {
      case 'middleware':
        await this.overrideMiddleware(name, implementation);
        break;
      case 'guard':
        await this.overrideGuard(name, implementation);
        break;
      case 'interceptor':
        await this.overrideInterceptor(name, implementation);
        break;
      case 'pipe':
        await this.overridePipe(name, implementation);
        break;
      case 'service':
        await this.overrideService(name, implementation);
        break;
      case 'provider':
        await this.overrideProvider(name, implementation);
        break;
      case 'controller':
        await this.overrideController(name, implementation);
        break;
      case 'repository':
        await this.overrideRepository(name, implementation);
        break;
      case 'dataSource':
        await this.overrideDataSource(name, implementation);
        break;
      default:
        this.logger?.warn(`NestJS adapter: Unknown override type '${type}'`);
    }
  }

  private async overrideMiddleware(name: string, implementation: any): Promise<void> {
    if (!this.app) {
      throw new Error('NestJS Application reference is not set');
    }
    
    this.logger?.debug(`Overriding middleware '${name}'`);
    // For middleware, we need to use app.use() dynamically
    // Store the override for future reference
    const key = `middleware:${name}`;
    this.originalProviders.set(key, null); // Middleware doesn't have a provider to restore
  }

  private async overrideGuard(name: string, implementation: any): Promise<void> {
    await this.overrideProvider(name, implementation);
  }

  private async overrideInterceptor(name: string, implementation: any): Promise<void> {
    await this.overrideProvider(name, implementation);
  }

  private async overridePipe(name: string, implementation: any): Promise<void> {
    await this.overrideProvider(name, implementation);
  }

  private async overrideService(name: string, implementation: any): Promise<void> {
    await this.overrideProvider(name, implementation);
  }

  private async overrideProvider(name: string, implementation: any): Promise<void> {
    if (!this.moduleRef) {
      throw new Error('NestJS ModuleRef is not set');
    }

    const key = `provider:${name}`;
    
    try {
      // Try to get the original provider
      const originalProvider = this.moduleRef.get(name, { strict: false });
      
      // Store original provider if not already stored
      if (!this.originalProviders.has(key)) {
        this.originalProviders.set(key, originalProvider);
      }

      // Convert string-based functions to actual functions
      const processedImplementation = this.processImplementation(implementation);
      
      // Replace methods directly on the original object for simple runtime override
      if (originalProvider && typeof originalProvider === 'object') {
        Object.keys(processedImplementation).forEach(methodName => {
          if (typeof processedImplementation[methodName] === 'function') {
            originalProvider[methodName] = processedImplementation[methodName];
          }
        });
      }

      this.logger?.debug(`Overriding provider '${name}' - methods replaced directly`);
      
      // Store the implementation for retrieval
      this.overrides.set(key, processedImplementation);
    } catch (error) {
      this.logger?.warn(`Could not override provider '${name}': ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Process implementation object - convert string functions to actual functions
   */
  private processImplementation(implementation: any): any {
    if (!implementation || typeof implementation !== 'object') {
      return implementation;
    }

    const processed: any = {};
    
    for (const [key, value] of Object.entries(implementation)) {
      if (typeof value === 'string') {
        try {
          // Try to evaluate string as function
          // This allows sending functions as strings via HTTP
          processed[key] = eval(`(${value})`);
        } catch (error) {
          // If eval fails, keep as string
          processed[key] = value;
        }
      } else if (typeof value === 'function') {
        // Already a function, keep it
        processed[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        processed[key] = this.processImplementation(value);
      } else {
        processed[key] = value;
      }
    }
    
    return processed;
  }

  private async overrideController(name: string, implementation: any): Promise<void> {
    await this.overrideProvider(name, implementation);
  }

  private async overrideRepository(name: string, implementation: any): Promise<void> {
    if (!this.moduleRef) {
      throw new Error('NestJS ModuleRef is not set');
    }

    const key = `repository:${name}`;
    
    try {
      // For TypeORM repositories, we need to handle them specially
      // Try to get the repository token
      const repositoryToken = `${name}Repository`;
      const originalRepository = this.moduleRef.get(repositoryToken, { strict: false });
      
      // Store original repository
      if (!this.originalProviders.has(key)) {
        this.originalProviders.set(key, originalRepository);
      }

      this.logger?.debug(`Overriding repository '${name}'`);
      this.overrides.set(key, implementation);
    } catch (error) {
      this.logger?.warn(`Could not override repository '${name}': ${(error as Error).message}`);
      // Try as a regular provider
      await this.overrideProvider(name, implementation);
    }
  }

  private async overrideDataSource(name: string, implementation: any): Promise<void> {
    await this.overrideProvider(name, implementation);
  }

  private async restoreOriginalProvider(type: string, name: string, originalProvider: any): Promise<void> {
    if (!originalProvider || !this.moduleRef) {
      return;
    }

    this.logger?.debug(`Restoring ${type} '${name}'`);
    // In a real implementation, this would restore the original provider
    // This is a limitation of NestJS's DI system in runtime
  }

  // Helper method to set ModuleRef and Application references
  setNestJSReferences(moduleRef: ModuleRef, app: INestApplication): void {
    this.moduleRef = moduleRef;
    this.app = app;
    this.logger?.debug('NestJS references set successfully');
  }

  // Helper method to get an override
  getOverride(type: string, name: string): any {
    const key = `${type}:${name}`;
    return this.overrides.get(key);
  }

  // Helper method to check if an override exists
  hasOverride(type: string, name: string): boolean {
    const key = `${type}:${name}`;
    return this.overrides.has(key);
  }

  // Helper method to remove an override
  async removeOverride(type: string, name: string): Promise<void> {
    const key = `${type}:${name}`;
    const override = this.overrides.get(key);
    
    if (override) {
      const originalProvider = this.originalProviders.get(key);
      await this.restoreOriginalProvider(type, name, originalProvider);
      
      this.overrides.delete(key);
      this.originalProviders.delete(key);
      
      this.logger?.debug(`Removed override: ${key}`);
    }
  }

  // Helper method to get ModuleRef (for advanced use cases)
  getModuleRef(): ModuleRef | undefined {
    return this.moduleRef;
  }

  // Helper method to get Application (for advanced use cases)
  getApplication(): INestApplication | undefined {
    return this.app;
  }

  // Helper method to list all active overrides
  listOverrides(): Array<{ type: string; name: string; hasImplementation: boolean }> {
    const overrides: Array<{ type: string; name: string; hasImplementation: boolean }> = [];
    
    for (const [key, implementation] of this.overrides.entries()) {
      const [type, name] = key.split(':');
      overrides.push({
        type,
        name,
        hasImplementation: !!implementation
      });
    }
    
    return overrides;
  }

  // Static method to create test module that can be added to existing NestJS apps
  static createTestModule() {
    return {
      imports: [],
      providers: [
        {
          provide: 'INTEGR8_OVERRIDE_SERVICE',
          useValue: {
            applyOverride: async (type: string, name: string, implementation: any) => {
              console.log(`Test override applied: ${type}:${name}`);
            }
          }
        }
      ],
      exports: ['INTEGR8_OVERRIDE_SERVICE']
    };
  }
}
