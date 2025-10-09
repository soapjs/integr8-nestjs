import { bootstrapAndListen } from '../../src/bootstrap';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await bootstrapAndListen(AppModule, {
    port: 3000,
    enableTestMiddleware: true,
    cors: true,
  });

  return app;
}

bootstrap();

