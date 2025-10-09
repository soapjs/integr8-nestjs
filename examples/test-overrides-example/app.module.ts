import { Module } from '@nestjs/common';
import { TestOverridesModule } from '../../src/test-overrides/test-overrides.module';
import { UsersModule } from './users.module';

// Conditionally include TestOverridesModule only in test environment
const testModules = TestOverridesModule.isEnabled() ? [TestOverridesModule] : [];

@Module({
  imports: [
    ...testModules,
    UsersModule,
  ],
})
export class AppModule {}

