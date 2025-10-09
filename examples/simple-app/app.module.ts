import { Module } from '@nestjs/common';
import { Integr8TestModule } from '../../src/test.module';
import { UsersModule } from './users.module';

@Module({
  imports: [
    Integr8TestModule, // Import integr8 test module
    UsersModule,
  ],
})
export class AppModule {}

