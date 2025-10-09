import { NestFactory } from '@nestjs/core';
import { INestApplication, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Integr8TestModule } from './test.module';
import { createTestMiddleware } from './test.middleware';
import { NestJSAdapter } from './adapter';

export interface BootstrapOptions {
  port?: number;
  enableTestMiddleware?: boolean;
  globalPrefix?: string;
  cors?: boolean;
}

/**
 * Bootstrap a NestJS application with Integr8 testing capabilities
 * 
 * @param AppModule - The root application module
 * @param options - Bootstrap configuration options
 * @returns The configured INestApplication instance
 */
export async function bootstrapNestJsIntegr8(
  AppModule: Type<any>,
  options?: BootstrapOptions
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  
  // Set environment variable to indicate Integr8 mode
  process.env.INTEGR8_MODE = 'true';
  
  // Configure CORS if requested
  if (options?.cors !== false) {
    app.enableCors();
  }

  // Set global prefix if provided
  if (options?.globalPrefix) {
    app.setGlobalPrefix(options.globalPrefix);
  }

  // Get the adapter instance and set up references
  try {
    const adapter = app.get<NestJSAdapter>('INTEGR8_ADAPTER');
    const moduleRef = app.get(ModuleRef);
    
    if (adapter && moduleRef) {
      adapter.setNestJSReferences(moduleRef, app);
    }
  } catch (error) {
    // If adapter is not available, it means Integr8TestModule wasn't imported
    console.warn('Integr8 adapter not found. Make sure to import Integr8TestModule in your AppModule.');
  }
  
  // Add test middleware for handling test overrides
  if (options?.enableTestMiddleware !== false) {
    app.use(createTestMiddleware());
  }
  
  return app;
}

/**
 * Bootstrap and start a NestJS application with Integr8 testing capabilities
 * 
 * @param AppModule - The root application module
 * @param options - Bootstrap configuration options
 * @returns The running INestApplication instance
 */
export async function bootstrapAndListen(
  AppModule: Type<any>,
  options?: BootstrapOptions & { port?: number }
): Promise<INestApplication> {
  const app = await bootstrapNestJsIntegr8(AppModule, options);
  
  const port = options?.port || 3000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}`);
  
  return app;
}