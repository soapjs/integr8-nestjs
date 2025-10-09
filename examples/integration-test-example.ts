/**
 * Example Integration Test showing how to use Integr8 with NestJS adapter
 * This demonstrates the override mechanism in action
 */

import { 
  defineScenario, 
  setupEnvironment, 
  teardownEnvironment, 
  getEnvironmentContext 
} from '@soapjs/integr8';
import { NestJSAdapter } from '@soapjs/integr8-nestjs';

// ============================================
// Example 1: Basic Integration Test with Override
// ============================================

describe('Users API with Override', () => {
  // Setup environment before all tests
  beforeAll(async () => {
    const config = {
      services: [
        {
          name: 'app',
          type: 'service',
          mode: 'local',
          ports: [3000],
          command: 'npm run start:test',
          healthcheck: {
            command: '/__integr8__/health'
          },
          adapter: {
            type: 'nestjs',
            config: {
              enableTestMiddleware: true
            }
          }
        }
      ],
      testType: 'api',
      testDirectory: './tests',
      testFramework: 'jest'
    };

    await setupEnvironment(config);
  });

  // Cleanup after all tests
  afterAll(async () => {
    await teardownEnvironment();
  });

  test('should get users with real service', async () => {
    const { http } = getEnvironmentContext();
    
    const response = await http.get('/users');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('should get users with mocked service', async () => {
    const { http } = getEnvironmentContext();
    
    // Apply override via HTTP endpoint
    await http.post('/__integr8__/override', {
      type: 'service',
      name: 'UsersService',
      implementation: {
        findAll: () => Promise.resolve([
          { id: 999, name: 'Mocked User', email: 'mock@test.com' }
        ])
      }
    });
    
    // Now the service is overridden
    const response = await http.get('/users');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveLength(1);
    expect(response.data[0].name).toBe('Mocked User');
  });

  test('should list active overrides', async () => {
    const { http } = getEnvironmentContext();
    
    // Check what overrides are active
    const response = await http.get('/__integr8__/overrides');
    
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('count');
    expect(response.data).toHaveProperty('overrides');
    expect(Array.isArray(response.data.overrides)).toBe(true);
  });

  test('should remove override', async () => {
    const { http } = getEnvironmentContext();
    
    // Remove the override
    const response = await http.delete('/__integr8__/override/service/UsersService');
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Verify it's removed
    const listResponse = await http.get('/__integr8__/overrides');
    const hasUserServiceOverride = listResponse.data.overrides.some(
      (o: any) => o.type === 'service' && o.name === 'UsersService'
    );
    expect(hasUserServiceOverride).toBe(false);
  });
});

// ============================================
// Example 2: Testing with Repository Override
// ============================================

describe('Users API with Repository Override', () => {
  beforeAll(async () => {
    // Setup same as above
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  test('should override repository', async () => {
    const { http } = getEnvironmentContext();
    
    // Override repository
    await http.post('/__integr8__/override', {
      type: 'repository',
      name: 'User',
      implementation: {
        find: () => Promise.resolve([
          { id: 1, name: 'Repo Mock User', email: 'repo@test.com' }
        ]),
        findOne: (options: any) => Promise.resolve(
          { id: options.where.id, name: 'Repo Mock User', email: 'repo@test.com' }
        )
      }
    });
    
    const response = await http.get('/users');
    
    expect(response.status).toBe(200);
    expect(response.data[0].name).toBe('Repo Mock User');
  });
});

// ============================================
// Example 3: Testing with Guard Override
// ============================================

describe('Protected Routes with Guard Override', () => {
  beforeAll(async () => {
    // Setup same as above
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  test('should access protected route with guard override', async () => {
    const { http } = getEnvironmentContext();
    
    // Override authentication guard to always allow access
    await http.post('/__integr8__/override', {
      type: 'guard',
      name: 'AuthGuard',
      implementation: {
        canActivate: () => true
      }
    });
    
    // Now we can access protected routes without authentication
    const response = await http.get('/admin/users');
    
    expect(response.status).toBe(200);
  });

  test('should be blocked without guard override', async () => {
    const { http } = getEnvironmentContext();
    
    // Remove the guard override
    await http.delete('/__integr8__/override/guard/AuthGuard');
    
    // Now access should be denied
    const response = await http.get('/admin/users');
    
    expect(response.status).toBe(401); // or 403
  });
});

// ============================================
// Example 4: Using Adapter Directly in Tests
// ============================================

describe('Direct Adapter Usage', () => {
  let adapter: NestJSAdapter;

  beforeAll(async () => {
    const { app } = getEnvironmentContext();
    
    // Get the adapter instance from the application
    adapter = app.get('INTEGR8_ADAPTER');
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  test('should apply override directly via adapter', async () => {
    const { http } = getEnvironmentContext();
    
    // Use adapter directly instead of HTTP endpoint
    await adapter.applyOverride('service', 'UsersService', {
      findAll: () => Promise.resolve([
        { id: 123, name: 'Direct Override User', email: 'direct@test.com' }
      ])
    });
    
    const response = await http.get('/users');
    
    expect(response.status).toBe(200);
    expect(response.data[0].name).toBe('Direct Override User');
  });

  test('should check if override exists', () => {
    const hasOverride = adapter.hasOverride('service', 'UsersService');
    expect(hasOverride).toBe(true);
  });

  test('should get override details', () => {
    const override = adapter.getOverride('service', 'UsersService');
    expect(override).toBeDefined();
    expect(override).toHaveProperty('findAll');
  });

  test('should list all overrides', () => {
    const overrides = adapter.listOverrides();
    expect(overrides.length).toBeGreaterThan(0);
    expect(overrides[0]).toHaveProperty('type');
    expect(overrides[0]).toHaveProperty('name');
    expect(overrides[0]).toHaveProperty('hasImplementation');
  });
});

// ============================================
// Example 5: Testing with Multiple Overrides
// ============================================

describe('Multiple Overrides', () => {
  beforeAll(async () => {
    // Setup same as above
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  test('should work with multiple simultaneous overrides', async () => {
    const { http } = getEnvironmentContext();
    
    // Override service
    await http.post('/__integr8__/override', {
      type: 'service',
      name: 'UsersService',
      implementation: {
        findAll: () => Promise.resolve([{ id: 1, name: 'Service Mock' }])
      }
    });
    
    // Override guard
    await http.post('/__integr8__/override', {
      type: 'guard',
      name: 'AuthGuard',
      implementation: {
        canActivate: () => true
      }
    });
    
    // Override interceptor
    await http.post('/__integr8__/override', {
      type: 'interceptor',
      name: 'LoggingInterceptor',
      implementation: {
        intercept: (context: any, next: any) => {
          console.log('Mock interceptor');
          return next.handle();
        }
      }
    });
    
    // List all overrides
    const overridesResponse = await http.get('/__integr8__/overrides');
    expect(overridesResponse.data.count).toBeGreaterThanOrEqual(3);
    
    // Test that all work together
    const response = await http.get('/admin/users');
    expect(response.status).toBe(200);
  });

  test('should clean up all overrides', async () => {
    const { http } = getEnvironmentContext();
    
    // Get all overrides
    const listResponse = await http.get('/__integr8__/overrides');
    const overrides = listResponse.data.overrides;
    
    // Remove each one
    for (const override of overrides) {
      await http.delete(`/__integr8__/override/${override.type}/${override.name}`);
    }
    
    // Verify all are removed
    const finalListResponse = await http.get('/__integr8__/overrides');
    expect(finalListResponse.data.count).toBe(0);
  });
});

// ============================================
// Example 6: Testing Error Scenarios
// ============================================

describe('Override Error Handling', () => {
  beforeAll(async () => {
    // Setup same as above
  });

  afterAll(async () => {
    await teardownEnvironment();
  });

  test('should handle invalid override request', async () => {
    const { http } = getEnvironmentContext();
    
    // Missing required fields
    const response = await http.post('/__integr8__/override', {
      type: 'service'
      // missing name and implementation
    });
    
    expect(response.status).toBe(400);
    expect(response.data).toHaveProperty('error');
  });

  test('should handle non-existent override removal', async () => {
    const { http } = getEnvironmentContext();
    
    // Try to remove non-existent override
    const response = await http.delete('/__integr8__/override/service/NonExistent');
    
    // Should not throw error, just succeed
    expect(response.status).toBe(200);
  });
});

export {
  // Export for use in other test files
};

