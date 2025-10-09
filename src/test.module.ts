import { Module, Global } from '@nestjs/common';
import { ModuleRef, REQUEST } from '@nestjs/core';
import { NestJSAdapter } from './adapter';

@Global()
@Module({
  providers: [
    {
      provide: 'INTEGR8_ADAPTER',
      useFactory: (moduleRef: ModuleRef) => {
        const adapter = new NestJSAdapter();
        // Note: The app reference needs to be set separately after module initialization
        // This is typically done in the bootstrap function
        return adapter;
      },
      inject: [ModuleRef]
    },
    NestJSAdapter
  ],
  exports: ['INTEGR8_ADAPTER', NestJSAdapter]
})
export class Integr8TestModule {}