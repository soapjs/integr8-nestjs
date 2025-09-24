import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { Integr8TestModule } from './test.module';
import { createTestMiddleware } from './test.middleware';

export async function bootstrapNestJsIntegr8(
  AppModule: any,
  options?: {
    port?: number;
    enableTestMiddleware?: boolean;
    enableTestModule?: boolean;
  }
): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  
  // Set environment
  process.env.INTEGR8_MODE = 'true';
  

    app.select(Integr8TestModule);

  
  // Add test middleware
  if (options?.enableTestMiddleware !== false) {
    app.use('/__test__', createTestMiddleware());
  }
  
  return app;
}