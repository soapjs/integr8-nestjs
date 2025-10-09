# Examples - Integr8 NestJS

This directory contains **examples and documentation** for `@soapjs/integr8-nestjs`.

> ⚠️ **Note**: These are examples and guides, NOT automated tests. They are excluded from `npm test`.
> To test the examples, you need to run them manually.

## 📁 Examples

### 1. Simple App (`simple-app/`)

A minimal NestJS application demonstrating Integr8 adapter in action.

**Features:**
- Basic CRUD API for users
- Integr8TestModule integration
- Complete integration tests with overrides
- Tests for all middleware endpoints

**Files:**
- `app.module.ts` - Main application module with Integr8TestModule
- `users.module.ts`, `users.controller.ts`, `users.service.ts` - Simple users module
- `main.ts` - Bootstrap file using `bootstrapAndListen()`
- `users.integration.test.ts` - **Complete integration test suite**

### 2. Integration Test Example (`integration-test-example.ts`)

Comprehensive examples showing different testing scenarios:
- Basic override testing
- Repository overrides
- Guard overrides for authentication testing
- Direct adapter usage
- Multiple simultaneous overrides
- Error handling

## 🚀 Quick Start

### Running the Simple App Integration Tests

```bash
# From the root of integr8-nestjs project

# 1. Install dependencies (if not already done)
npm install

# 2. Run the integration tests
npm test -- examples/simple-app/users.integration.test.ts
```

## 📖 Key Concepts Demonstrated

### 1. Setting up Integr8 in NestJS App

```typescript
// app.module.ts
import { Integr8TestModule } from '@soapjs/integr8-nestjs';

@Module({
  imports: [
    Integr8TestModule,  // Add this!
    // ... your other modules
  ],
})
export class AppModule {}
```

### 2. Bootstrap with Integr8

```typescript
// main.ts
import { bootstrapAndListen } from '@soapjs/integr8-nestjs';

const app = await bootstrapAndListen(AppModule, {
  port: 3000,
  enableTestMiddleware: true,
  cors: true,
});
```

### 3. Using the Adapter in Tests

```typescript
// In your test file
let app: INestApplication;
let adapter: NestJSAdapter;

beforeAll(async () => {
  app = await bootstrapNestJsIntegr8(AppModule, {
    enableTestMiddleware: true,
  });
  await app.init();
  
  // Get the adapter
  adapter = app.get<NestJSAdapter>('INTEGR8_ADAPTER');
});
```

### 4. Applying Overrides

**Method 1: Using Adapter Directly**
```typescript
await adapter.applyOverride('service', 'UsersService', {
  findAll: () => [
    { id: 999, name: 'Mocked User', email: 'mocked@test.com' }
  ]
});
```

**Method 2: Using HTTP Endpoint**
```typescript
await request(app.getHttpServer())
  .post('/__integr8__/override')
  .send({
    type: 'service',
    name: 'UsersService',
    implementation: {
      findAll: () => [{ id: 999, name: 'Mocked User' }]
    }
  });
```

### 5. Checking Overrides

```typescript
// Check if override exists
const hasOverride = adapter.hasOverride('service', 'UsersService');

// Get override details
const override = adapter.getOverride('service', 'UsersService');

// List all overrides
const overrides = adapter.listOverrides();
```

### 6. Removing Overrides

```typescript
// Remove via adapter
await adapter.removeOverride('service', 'UsersService');

// Or via HTTP
await request(app.getHttpServer())
  .delete('/__integr8__/override/service/UsersService');
```

### 7. Cleanup

```typescript
afterEach(async () => {
  // Clean up after each test
  const overrides = adapter.listOverrides();
  for (const override of overrides) {
    await adapter.removeOverride(override.type, override.name);
  }
});

afterAll(async () => {
  // Full teardown
  await adapter.teardown();
  await app.close();
});
```

## 🧪 Test Examples

### Example 1: Testing with Service Override

```typescript
it('should return mocked users', async () => {
  // Apply override
  await adapter.applyOverride('service', 'UsersService', {
    findAll: () => [
      { id: 999, name: 'Mocked User', email: 'mocked@test.com' }
    ]
  });

  // Test with override active
  const response = await request(app.getHttpServer())
    .get('/users')
    .expect(200);

  expect(response.body[0].name).toBe('Mocked User');
});
```

### Example 2: Testing Without Override

```typescript
it('should return real users without override', async () => {
  // No override applied - uses real service
  const response = await request(app.getHttpServer())
    .get('/users')
    .expect(200);

  expect(response.body[0].name).toBe('John Doe');
});
```

### Example 3: Testing Middleware Endpoints

```typescript
it('should return health status', () => {
  return request(app.getHttpServer())
    .get('/__integr8__/health')
    .expect(200)
    .expect((res) => {
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('integr8', true);
    });
});
```

## 🎯 What Gets Tested

The integration tests verify:

✅ **Override Mechanism**
- Service overrides work correctly
- Repository overrides (if using TypeORM)
- Guard overrides for authentication testing
- Multiple simultaneous overrides

✅ **Middleware Endpoints**
- `GET /__integr8__/health` - Health check
- `POST /__integr8__/override` - Apply override
- `DELETE /__integr8__/override/:type/:name` - Remove override
- `GET /__integr8__/overrides` - List overrides

✅ **Adapter Methods**
- `applyOverride()` - Works correctly
- `hasOverride()` - Checks existence
- `getOverride()` - Returns implementation
- `listOverrides()` - Lists all active
- `removeOverride()` - Removes specific override
- `teardown()` - Cleans up everything

✅ **Real vs Mocked**
- Tests work with real services
- Tests work with mocked services
- Can switch between real and mocked mid-test

## 🔍 Verifying the Examples Work

### Run Integration Tests

```bash
# Run all integration tests in examples
npm test -- examples/

# Run specific test file
npm test -- examples/simple-app/users.integration.test.ts

# Run with coverage
npm run test:cov -- examples/
```

### Expected Output

```
PASS examples/simple-app/users.integration.test.ts
  Users Integration Tests (with Integr8 Adapter)
    GET /users - Without Override
      ✓ should return default users (XXms)
    GET /users - With Service Override
      ✓ should return mocked users when service is overridden (XXms)
      ✓ should return different mocked data with different override (XXms)
    ...
    
Tests: XX passed, XX total
```

## 📊 Coverage

The integration tests provide coverage for:
- Real API endpoints
- Override mechanism
- Middleware functionality
- Adapter integration with NestJS
- Error handling

## 🐛 Troubleshooting

### Tests Fail: "INTEGR8_ADAPTER not found"

**Solution:** Make sure `Integr8TestModule` is imported in your `AppModule`:
```typescript
@Module({
  imports: [
    Integr8TestModule,  // Add this
    // ...
  ],
})
```

### Tests Fail: "Cannot read property 'findAll' of undefined"

**Solution:** The override implementation might not match the actual service interface. Make sure your mock implements the same methods:
```typescript
await adapter.applyOverride('service', 'UsersService', {
  findAll: () => [...],    // ✓ Correct
  findOne: (id) => {...},  // ✓ Correct
});
```

### Overrides Don't Work

**Solution:** Check that:
1. The service name matches exactly (case-sensitive)
2. The override type is correct ('service', 'repository', etc.)
3. The adapter is initialized properly

### Test Pollution Between Tests

**Solution:** Clean up after each test:
```typescript
afterEach(async () => {
  const overrides = adapter.listOverrides();
  for (const override of overrides) {
    await adapter.removeOverride(override.type, override.name);
  }
});
```

## 📚 Next Steps

1. **Review** `simple-app/users.integration.test.ts` for complete examples
2. **Run** the tests to see them in action
3. **Adapt** the examples to your own application
4. **Extend** with your own override scenarios

## 🤝 Contributing Examples

Have a great example? Contributions welcome!

1. Create a new directory under `examples/`
2. Add your example code
3. Include a README explaining the example
4. Add integration tests
5. Submit a PR

## 📖 Additional Resources

- [Main README](../README.md)
- [Unit Tests Documentation](../src/__tests__/README.md)
- [Integr8 Core Documentation](https://github.com/soapjs/integr8)
- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)

---

**Note:** These examples demonstrate testing capabilities. In production, use the override mechanism only for testing purposes!

