import { Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { NestJSAdapter } from '@soapjs/integr8';

@Module({
  providers: [
    {
      provide: 'INTEGR8_ADAPTER',
      useFactory: (moduleRef: ModuleRef, app: any) => {
        const adapter = new NestJSAdapter();
        adapter.setNestJSReferences(moduleRef, app);
        return adapter;
      },
      inject: [ModuleRef, 'APP']
    }
  ],
  exports: ['INTEGR8_ADAPTER']
})
export class Integr8TestModule {}