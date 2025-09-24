# @soapjs/integr8-nestjs

[![npm version](https://badge.fury.io/js/@soapjs%2Fintegr8-nestjs.svg)](https://badge.fury.io/js/@soapjs%2Fintegr8-nestjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful NestJS extension for [@soapjs/integr8](https://www.npmjs.com/package/@soapjs/integr8) that provides seamless integration testing capabilities for NestJS applications. This package enables you to create comprehensive integration tests with database isolation, service mocking, and authentication overrides.

> ⚠️ **Work in Progress** - Currently in development towards v1.0.0.

## Features

- **NestJS Integration**: Seamless integration with NestJS applications and modules
- **Database Isolation**: Automatic database setup and teardown with savepoint-based isolation
- **Service Mocking**: Override services, repositories, controllers, and providers during testing
- **Authentication Testing**: Mock authentication guards, users, and permissions
- **Test Middleware**: Built-in test middleware for runtime overrides
- **TypeORM Support**: Full TypeORM integration with entity management
- **Health Checks**: Automatic health check endpoints for service monitoring
- **Parallel Testing**: Support for parallel test execution with schema isolation

## Installation

```bash
npm install @soapjs/integr8-nestjs
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install @nestjs/core @nestjs/common @nestjs/platform-express
```

### CLI Compatibility

This package extends `@soapjs/integr8` with NestJS-specific features. All standard integr8 CLI commands continue to work:

#### Environment Management
```bash
# Start environment
npx integr8 up

# Fast start (skip health checks)
npx integr8 up --fast

# Stop environment
npx integr8 down
```
#### Test Execution
```bash
# Run all tests
npx integr8 run

# Run specific tests
npx integr8 run --pattern "users.*"

# Watch mode
npx integr8 run --watch

# CI mode (up + run + down)
npx integr8 ci
```
#### Test Generation
```bash
# Generate from routes
npx integr8 generate --command "npx soap list-routes" --scenarios

# Add single endpoint
npx integr8 add-endpoint "GET /users/:id" --scenarios
```

## Quick Start

### 1. Create Bootstrap File

Create a bootstrap file for your test environment:

```typescript
// integr8.bootstrap.ts
import { bootstrapNestJsIntegr8 } from '@soapjs/integr8-nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await bootstrapNestJsIntegr8(AppModule, {
    enableTestMiddleware: true,
    enableTestModule: true
  });
  
  await app.listen(3000);
  console.log('🚀 Integr8 test server running on port 3000');
}

bootstrap();
```

### 2. Update Package Scripts

Add the bootstrap command to your `package.json`:

```json
{
  "scripts": {
    "start:integr8": "nest start integr8.bootstrap.ts",
    "test:integr8": "jest --config jest.integr8.config.js"
  }
}
```

### 3. Configure Integr8

Create your integr8 configuration file:

```javascript
// integr8.api.config.js
module.exports = {
  services: [
    {
      name: 'app',
      type: 'service',
      mode: 'local',
      ports: [3000],
      command: 'npm run start:integr8',
      healthcheck: {
        command: '/health'
      },
      containerName: 'app',
      dependsOn: ['postgres'],
      logging: true,
      adapter: {
        type: 'nestjs',
        config: {
          enableTestModule: true,
          enableTestMiddleware: true,
          enableTestGuard: true,
          enableTestInterceptor: true,
          enableTestPipe: true,
        }
      }
    },
    {
      name: 'postgres',
      type: 'postgres',
      mode: 'container',
      containerName: 'my-app-postgres',
      environment: {
        POSTGRES_DB: 'myapp',
        POSTGRES_USER: 'myuser',
        POSTGRES_PASSWORD: 'mypassword'
      },
      dbStrategy: 'savepoint',
      seed: {
        "command": "npm run seed:default",
        "strategy": "per-file",
        "restoreStrategy": "rollback"
      },
      envMapping: {
        "host": "DB_HOST",
        "port": "DB_PORT",
        "username": "DB_USERNAME",
        "password": "DB_PASSWORD",
        "database": "DB_NAME",
        "url": "DATABASE_URL"
      }
    }
  ],
  testType: 'api',
  testDirectory: 'integr8/api',
  testFramework: 'jest',
  urlPrefix: 'api/v1'
};
```

### 4. Write Your First Test

```typescript
import { setupEnvironment, teardownEnvironment, getEnvironmentContext } from '@soapjs/integr8';

// Global setup
beforeAll(async () => {
  const configModule = require('../../integr8.api.config.js');
  const config = configModule.default || configModule;
  
  await setupEnvironment(config);
});

// Global teardown
afterAll(async () => {
  await teardownEnvironment();
});

describe('GET /health', () => {
  test('should return 200', async () => {
    const ctx = getEnvironmentContext();
    const response = await ctx.http.get('/health');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'ok');
    expect(response.data).toHaveProperty('integr8', true);
  });
});
```

## API Reference

### `bootstrapNestJsIntegr8(AppModule, options?)`

Bootstraps a NestJS application with integr8 testing capabilities.

**Parameters:**
- `AppModule`: Your NestJS application module
- `options` (optional):
  - `port?: number` - Port to run the application on
  - `enableTestMiddleware?: boolean` - Enable test middleware (default: true)
  - `enableTestModule?: boolean` - Enable integr8 test module (default: true)

**Returns:** `Promise<INestApplication>`

### `Integr8TestModule`

A NestJS module that provides integr8 adapter functionality.

**Exports:**
- `INTEGR8_ADAPTER` - The integr8 adapter instance

### `createTestMiddleware()`

Creates middleware for test overrides and health checks.

**Endpoints:**
- `POST /__test__/override` - Apply runtime overrides
- `GET /__test__/health` - Health check endpoint

## Testing Features

### Authentication Overrides

```typescript
describe('Authentication Tests', () => {
  test('should work with admin override', async ({ http, override }) => {
    await override.auth('auth-guard').asAdmin();
    
    const response = await http.get('/admin/users');
    expect(response.status).toBe(200);
  });
  
  test('should work with custom user', async ({ http, override }) => {
    await override.auth('auth-guard').withUsers({ 
      id: 123, 
      role: 'manager',
      department: 'sales' 
    });
    
    const response = await http.get('/users/profile');
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('id', 123);
  });
  
  test('should work with permissions', async ({ http, override }) => {
    await override.auth('auth-guard')
      .withUsers({ id: 456 })
      .withPermissions(['read', 'write']);
    
    const response = await http.get('/protected-resource');
    expect(response.status).toBe(200);
  });
});
```

### Service Mocking

```typescript
describe('Service Mocking', () => {
  test('should mock service methods', async ({ http, override }) => {
    await override.service('UserService').withMock((userService) => ({
      findAll: () => Promise.resolve([{ id: 1, name: 'Test User' }]),
      findById: (id: number) => Promise.resolve({ id, name: 'Test User' })
    }));
    
    const response = await http.get('/users');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
    expect(response.data[0]).toHaveProperty('name', 'Test User');
  });
});
```

### Repository Mocking

```typescript
describe('Repository Mocking', () => {
  test('should mock repository methods', async ({ http, override }) => {
    await override.repository('UserRepository').withMock((userRepo) => ({
      find: () => Promise.resolve([{ id: 1, name: 'Mock User' }]),
      findOne: (id: number) => Promise.resolve({ id, name: 'Mock User' })
    }));
    
    const response = await http.get('/users');
    expect(response.status).toBe(200);
    expect(response.data[0]).toHaveProperty('name', 'Mock User');
  });
});
```

### Provider Overrides

```typescript
describe('Provider Overrides', () => {
  test('should override email service', async ({ http, override }) => {
    await override.provider('EmailService').withMock((emailService) => ({
      sendEmail: (to: string, subject: string) => {
        console.log(`Mock email sent to ${to}: ${subject}`);
        return Promise.resolve(true);
      }
    }));
    
    const response = await http.post('/send-email', {
      to: 'test@example.com',
      subject: 'Test Email'
    });
    expect(response.status).toBe(200);
  });
});
```

### Interceptor and Pipe Mocking

```typescript
describe('Interceptor and Pipe Mocking', () => {
  test('should mock interceptor', async ({ http, override }) => {
    await override.interceptor('LoggingInterceptor').withMock((interceptor) => ({
      intercept: (context: any, next: any) => {
        console.log('Mock interceptor: Request intercepted');
        return next.handle();
      }
    }));
    
    const response = await http.get('/users');
    expect(response.status).toBe(200);
  });
  
  test('should mock pipe', async ({ http, override }) => {
    await override.pipe('ValidationPipe').withMock((pipe) => ({
      transform: (value: any, metadata: any) => {
        console.log('Mock pipe: Value transformed');
        return value;
      }
    }));
    
    const response = await http.post('/users', {
      name: 'Test User',
      email: 'test@example.com'
    });
    expect(response.status).toBe(201);
  });
});
```

### Controller Overrides

```typescript
describe('Controller Overrides', () => {
  test('should override controller methods', async ({ http, override }) => {
    await override.controller('UsersController').withMock((controller) => ({
      findAll: () => Promise.resolve([{ id: 1, name: 'Controller Mock User' }]),
      create: (userData: any) => Promise.resolve({ id: 2, ...userData })
    }));
    
    const response = await http.get('/users');
    expect(response.status).toBe(200);
    expect(response.data[0]).toHaveProperty('name', 'Controller Mock User');
  });
});
```

### Data Source Mocking

```typescript
describe('Data Source Mocking', () => {
  test('should mock database queries', async ({ http, override }) => {
    await override.dataSource('default').withMock((dataSource) => ({
      query: (sql: string, params?: any[]) => {
        console.log(`Mock query: ${sql}`);
        return Promise.resolve([{ id: 1, name: 'Mock DB User' }]);
      }
    }));
    
    const response = await http.get('/users');
    expect(response.status).toBe(200);
    expect(response.data[0]).toHaveProperty('name', 'Mock DB User');
  });
});
```

### Mixed Overrides

```typescript
describe('Mixed Overrides', () => {
  test('should combine multiple overrides', async ({ http, override }) => {
    // Override multiple components
    await override.auth('auth-guard').asAdmin();
    await override.service('UserService').withMock((service) => ({
      findAll: () => Promise.resolve([{ id: 1, name: 'Mixed Mock User' }])
    }));
    await override.repository('UserRepository').withMock((repo) => ({
      find: () => Promise.resolve([{ id: 1, name: 'Repository Mock User' }])
    }));
    
    const response = await http.get('/users');
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
  });
});
```

## Database Configuration

### TypeORM Integration

```typescript
// integr8.config.ts
import { 
  createConfig, 
  createPostgresService, 
  createAppService, 
  createTypeORMAdapter,
  createHealthCheckConfig
} from '@soapjs/integr8-nestjs';

export default createConfig({
  services: [
    createPostgresService('postgres', {
      environment: {
        POSTGRES_DB: 'testdb',
        POSTGRES_USER: 'testuser',
        POSTGRES_PASSWORD: 'testpass',
      },
      dbStrategy: 'savepoint',
      parallelIsolation: 'schema',
      adapter: createTypeORMAdapter({
        synchronize: false,
        logging: false,
        entities: ['./src/**/*.entity.ts']
      })
    }),
    createAppService('app', {
      command: 'npm run start:integr8',
      healthcheck: createHealthCheckConfig('/health', {
        interval: 1000,
        timeout: 30000,
        retries: 3
      }),
      ports: [3000],
      environment: {
        NODE_ENV: 'test',
        PORT: '3000',
      },
      dependsOn: ['postgres']
    })
  ],
  testType: 'api',
  testDirectory: './tests',
  testFramework: 'jest'
});
```

### Database Seeding

```javascript
// integr8.api.config.js
module.exports = {
  services: [
    {
      name: 'postgres',
      type: 'postgres',
      // ... other config
      seed: {
        "command": "npm run seed:default",
        "strategy": "per-file",
        "restoreStrategy": "rollback"
      }
    }
  ]
};
```

## Authentication Profiles

### OAuth2 Profile

```typescript
test('should work with OAuth2 profile', async ({ http, override }) => {
  await override.auth('auth-guard').withProfile('admin');
  
  const response = await http.get('/admin/users');
  expect(response.status).toBe(200);
});
```

### JWT Profile

```typescript
test('should work with JWT profile', async ({ http, override }) => {
  await override.auth('auth-guard').withProfile('user');
  
  const response = await http.get('/users/profile');
  expect(response.status).toBe(200);
});
```

### API Key Profile

```typescript
test('should work with API key profile', async ({ http, override }) => {
  await override.auth('auth-guard').withProfile('api');
  
  const response = await http.get('/api/data');
  expect(response.status).toBe(200);
});
```

## Health Checks

The package automatically provides health check endpoints:

```typescript
// GET /health
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "integr8": true
}

// GET /__test__/health
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "integr8": true
}
```

## Advanced Configuration

### Custom Test Scenarios

```typescript
import { createTestScenario } from '@soapjs/integr8-nestjs';

export default createConfig({
  // ... other config
  testScenarios: [
    createTestScenario('should return 200 for health check', 200),
    createTestScenario('should handle NestJS endpoints', 200),
    createTestScenario('should work with authentication', 200)
  ]
});
```

### Test Mode Configuration

```typescript
import { createTestModeConfig } from '@soapjs/integr8-nestjs';

export default createConfig({
  // ... other config
  testMode: createTestModeConfig({
    controlPort: 3001,
    overrideEndpoint: '/__test__/override',
    enableFakeTimers: true
  })
});
```

## Best Practices

1. **Use Database Isolation**: Always use savepoint-based isolation for parallel tests
2. **Mock External Services**: Mock external APIs and services to ensure test reliability
3. **Clean Test Data**: Use proper seeding and cleanup strategies
4. **Authentication Testing**: Test different user roles and permissions
5. **Error Handling**: Test both success and error scenarios
6. **Performance**: Use parallel test execution when possible

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure test ports don't conflict with development ports
2. **Database Connections**: Check database connection strings and credentials
3. **Module Dependencies**: Ensure all required modules are properly imported
4. **Environment Variables**: Verify all required environment variables are set

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=integr8:* npm test
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Related Packages

- [@soapjs/integr8](https://www.npmjs.com/package/@soapjs/integr8) - Core integr8 testing framework
- [@soapjs/soap](https://www.npmjs.com/package/@soapjs/soap) - SOAP framework for Node.js

## Support
**Radoslaw Kamysz**  
Email: radoslaw.kamysz@gmail.com

---

Made with ❤️ by the [SoapJS](https://soapjs.com) team