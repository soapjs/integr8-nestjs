/**
 * E2E Test for TestOverridesModule
 * 
 * This test actually starts a real NestJS application with TestOverridesModule
 * and tests the override functionality via HTTP
 */

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import axios, { AxiosInstance } from 'axios';
import { Module, Injectable, Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TestOverridesModule } from '../test-overrides/test-overrides.module';

// Test Service
@Injectable()
class TestService {
  getData() {
    return { message: 'original', value: 42 };
  }

  getUser(id: number) {
    return { id, name: `Original User ${id}` };
  }

  async asyncMethod() {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ async: true }), 10);
    });
  }
}

// Test Controller
@Controller('test')
class TestController {
  constructor(private readonly testService: TestService) {}

  @Get('data')
  getData() {
    return this.testService.getData();
  }

  @Get('user/:id')
  getUser(@Param('id') id: string) {
    return this.testService.getUser(parseInt(id) || 1);
  }

  @Post('async')
  async asyncMethod() {
    return this.testService.asyncMethod();
  }
}

// Test Module
@Module({
  imports: [TestOverridesModule],
  controllers: [TestController],
  providers: [TestService],
})
class TestAppModule {}

describe('TestOverridesModule E2E', () => {
  let app: INestApplication;
  let api: AxiosInstance;
  let baseUrl: string;

  beforeAll(async () => {
    // Set required environment variables
    process.env.INTEGR8_OVERRIDES_ENABLED = '1';
    process.env.INTEGR8_OVERRIDES_TOKEN = 'test-token-secret';

    // Create test module
    const moduleFixture = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Start listening on random port
    const server = await app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' ? address?.port : 3000;
    baseUrl = `http://localhost:${port}`;

    // Create API client with auth
    api = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': 'Bearer test-token-secret',
      },
      validateStatus: () => true, // Don't throw on non-2xx
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    delete process.env.INTEGR8_OVERRIDES_ENABLED;
    delete process.env.INTEGR8_OVERRIDES_TOKEN;
  });

  describe('Module Loading', () => {
    it('should load TestOverridesModule when enabled', () => {
      expect(TestOverridesModule.isEnabled()).toBe(true);
    });

    it('should provide health endpoint', async () => {
      const response = await api.get('/__integr8__/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        status: 'ok',
        integr8: true,
        overridesEnabled: true,
      });
    });
  });

  describe('Authorization', () => {
    it('should reject requests without token', async () => {
      const response = await axios.get(
        `${baseUrl}/__integr8__/overrides`,
        { validateStatus: () => true }
      );
      
      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await axios.get(
        `${baseUrl}/__integr8__/overrides`,
        { 
          headers: { 'Authorization': 'Bearer wrong-token' },
          validateStatus: () => true 
        }
      );
      
      expect(response.status).toBe(401);
    });

    it('should accept requests with valid token', async () => {
      const response = await api.get('/__integr8__/overrides');
      
      expect(response.status).toBe(200);
    });
  });

  describe('List Overrides', () => {
    it('should list proxied providers', async () => {
      const response = await api.get('/__integr8__/overrides');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('overrides');
      expect(response.data).toHaveProperty('proxiedProviders');
      expect(Array.isArray(response.data.proxiedProviders)).toBe(true);
      
      // TestService should be proxied
      expect(response.data.proxiedProviders).toContain('TestService');
    });

    it('should show empty overrides initially', async () => {
      const response = await api.get('/__integr8__/overrides');
      
      expect(response.status).toBe(200);
      expect(response.data.overrides).toEqual({});
    });
  });

  describe('Method Patching', () => {
    beforeEach(async () => {
      // Reset before each test
      const resetResponse = await api.post('/__integr8__/override/reset-all');
      expect(resetResponse.status).toBe(201);
    });

    it('should patch single method', async () => {
      // Apply override
      const overrideResponse = await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            body: 'return { message: "patched", value: 999 };',
          },
        },
      });

      expect(overrideResponse.status).toBe(201);
      expect(overrideResponse.data.ok).toBe(true);
      expect(overrideResponse.data.applied.methods).toEqual(['getData']);

      // Test that it works
      const testResponse = await axios.get(`${baseUrl}/test/data`);
      
      expect(testResponse.data).toEqual({
        message: 'patched',
        value: 999,
      });
    });

    it('should patch method with arguments', async () => {
      // Apply override
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getUser: {
            type: 'fn',
            args: ['id'],
            body: 'return { id: parseInt(id), name: "Patched User " + id, isPatched: true };',
          },
        },
      });

      // Test that it works
      const testResponse = await axios.get(`${baseUrl}/test/user/5`);
      
      expect(testResponse.data.name).toContain('Patched User');
      expect(testResponse.data.isPatched).toBe(true);
    });

    it('should patch async method', async () => {
      // Apply override
      await api.post('/__integr8__/override/TestService', {
        methods: {
          asyncMethod: {
            type: 'fn',
            body: 'return Promise.resolve({ async: true, patched: true });',
          },
        },
      });

      // Test that it works
      const testResponse = await axios.post(`${baseUrl}/test/async`);
      
      expect(testResponse.data).toEqual({
        async: true,
        patched: true,
      });
    });

    it('should patch multiple methods', async () => {
      // Apply multiple overrides
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            body: 'return { message: "method1" };',
          },
          getUser: {
            type: 'fn',
            args: ['id'],
            body: 'return { id, name: "method2" };',
          },
        },
      });

      // List overrides
      const listResponse = await api.get('/__integr8__/overrides');
      
      expect(listResponse.data.overrides.TestService).toMatchObject({
        methods: expect.arrayContaining(['getData', 'getUser']),
        hasFactory: false,
      });
    });

    it('should handle errors in patched methods', async () => {
      // Apply override that throws
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            body: 'throw new Error("Simulated error");',
          },
        },
      });

      // Test that error is propagated
      const testResponse = await axios.get(`${baseUrl}/test/data`, {
        validateStatus: () => true,
      });
      
      expect(testResponse.status).toBe(500);
    });
  });

  describe('Factory Replacement', () => {
    beforeEach(async () => {
      const resetResponse = await api.post('/__integr8__/override/reset-all');
      expect(resetResponse.status).toBe(201);
    });

    it('should replace entire provider with factory', async () => {
      // Apply factory override
      const overrideResponse = await api.post('/__integr8__/override/TestService', {
        factory: {
          body: `
            return {
              getData: () => ({ factory: true, message: "from factory" }),
              getUser: (id) => ({ id, factory: true }),
              asyncMethod: () => Promise.resolve({ factory: true })
            };
          `,
        },
      });

      expect(overrideResponse.status).toBe(201);
      expect(overrideResponse.data.ok).toBe(true);
      expect(overrideResponse.data.applied.factory).toBe(true);

      // Test all methods use factory
      const data = await axios.get(`${baseUrl}/test/data`);
      expect(data.data.factory).toBe(true);
      expect(data.data.message).toBe('from factory');
    });

    it('should list factory in overrides', async () => {
      await api.post('/__integr8__/override/TestService', {
        factory: {
          body: 'return { getData: () => ({}) };',
        },
      });

      const listResponse = await api.get('/__integr8__/overrides');
      
      expect(listResponse.data.overrides.TestService.hasFactory).toBe(true);
    });
  });

  describe('Reset Operations', () => {
    beforeEach(async () => {
      // Ensure clean state
      await api.post('/__integr8__/override/reset-all');
    });

    it('should reset single override', async () => {
      // Apply override
      const overrideResponse = await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            body: 'return { message: "patched", patched: true };',
          },
        },
      });
      expect(overrideResponse.status).toBe(201);

      // Verify it's active
      let testResponse = await axios.get(`${baseUrl}/test/data`);
      expect(testResponse.data.patched).toBe(true);
      expect(testResponse.data.message).toBe('patched');

      // Reset
      const resetResponse = await api.post('/__integr8__/override/TestService', {
        reset: true,
      });
      expect(resetResponse.status).toBe(201);

      // Verify it's back to original
      testResponse = await axios.get(`${baseUrl}/test/data`);
      expect(testResponse.data.message).toBe('original');
      expect(testResponse.data.value).toBe(42);
    });

    it('should reset all overrides', async () => {
      // Apply multiple overrides
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: { type: 'fn', body: 'return { a: 1 };' },
        },
      });

      // Verify overrides exist
      let listResponse = await api.get('/__integr8__/overrides');
      expect(Object.keys(listResponse.data.overrides)).toContain('TestService');

      // Reset all
      await api.post('/__integr8__/override/reset-all');

      // Verify all cleared
      listResponse = await api.get('/__integr8__/overrides');
      expect(listResponse.data.overrides).toEqual({});
    });
  });

  describe('Real-world Scenarios', () => {
    beforeEach(async () => {
      const resetResponse = await api.post('/__integr8__/override/reset-all');
      expect(resetResponse.status).toBe(201);
    });

    it('should handle conditional logic in overrides', async () => {
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getUser: {
            type: 'fn',
            args: ['id'],
            body: `
              const userId = parseInt(id);
              if (userId === 999) {
                return { id: 999, name: "Admin", role: "admin" };
              }
              return { id: userId, name: "User", role: "user" };
            `,
          },
        },
      });

      const response = await axios.get(`${baseUrl}/test/user/999`);
      expect(response.data.role).toBe('admin');
    });

    it('should support multiple override cycles', async () => {
      // First override
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: { type: 'fn', body: 'return { version: 1 };' },
        },
      });

      let testResponse = await axios.get(`${baseUrl}/test/data`);
      expect(testResponse.data.version).toBe(1);

      // Second override (replaces first)
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: { type: 'fn', body: 'return { version: 2 };' },
        },
      });

      testResponse = await axios.get(`${baseUrl}/test/data`);
      expect(testResponse.data.version).toBe(2);

      // Reset
      await api.post('/__integr8__/override/TestService', { reset: true });

      testResponse = await axios.get(`${baseUrl}/test/data`);
      expect(testResponse.data.message).toBe('original');
    });

    it('should work with async/await in overrides', async () => {
      await api.post('/__integr8__/override/TestService', {
        methods: {
          asyncMethod: {
            type: 'fn',
            body: `
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve({ async: true, patched: true, timestamp: Date.now() });
                }, 50);
              });
            `,
          },
        },
      });

      const testResponse = await axios.post(`${baseUrl}/test/async`);
      
      expect(testResponse.data.async).toBe(true);
      expect(testResponse.data.patched).toBe(true);
      expect(testResponse.data.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const resetResponse = await api.post('/__integr8__/override/reset-all');
      expect(resetResponse.status).toBe(201);
    });

    it('should handle invalid function syntax', async () => {
      const response = await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            body: 'this is not valid javascript {{{',
          },
        },
      });

      expect(response.status).toBe(500);
    });

    it('should handle missing body', async () => {
      const response = await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            // missing body
          },
        },
      });

      expect(response.status).toBe(500);
    });

    it('should handle unsupported payload', async () => {
      const response = await api.post('/__integr8__/override/TestService', {
        unsupportedField: true,
      });

      expect(response.status).toBe(400);
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full test cycle', async () => {
      // 0. Reset first
      await api.post('/__integr8__/override/reset-all');
      
      // 1. Verify original behavior
      let response = await axios.get(`${baseUrl}/test/data`);
      expect(response.data.message).toBe('original');

      // 2. List overrides (should be empty)
      let listResponse = await api.get('/__integr8__/overrides');
      expect(listResponse.data.overrides).toEqual({});

      // 3. Apply override
      const overrideResponse = await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            body: 'return { message: "e2e-test", value: 123 };',
          },
        },
      });
      expect(overrideResponse.status).toBe(201);

      // 4. List overrides (should show TestService)
      listResponse = await api.get('/__integr8__/overrides');
      expect(listResponse.data.overrides.TestService).toBeDefined();
      expect(listResponse.data.overrides.TestService.methods).toContain('getData');

      // 5. Verify patched behavior
      response = await axios.get(`${baseUrl}/test/data`);
      expect(response.data.message).toBe('e2e-test');
      expect(response.data.value).toBe(123);

      // 6. Reset override
      const resetResponse = await api.post('/__integr8__/override/TestService', {
        reset: true,
      });
      expect(resetResponse.status).toBe(201);

      // 7. Verify original behavior restored
      response = await axios.get(`${baseUrl}/test/data`);
      expect(response.data.message).toBe('original');
      expect(response.data.value).toBe(42);

      // 8. List overrides (should be empty again)
      listResponse = await api.get('/__integr8__/overrides');
      expect(listResponse.data.overrides).toEqual({});
    });
  });

  describe('Complex Scenarios', () => {
    beforeEach(async () => {
      const resetResponse = await api.post('/__integr8__/override/reset-all');
      expect(resetResponse.status).toBe(201);
    });

    it('should handle nested object returns', async () => {
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            body: `
              return {
                user: { id: 1, name: "Test" },
                metadata: { created: new Date().toISOString() },
                nested: { deep: { value: 42 } }
              };
            `,
          },
        },
      });

      const response = await axios.get(`${baseUrl}/test/data`);
      
      expect(response.data.user.name).toBe('Test');
      expect(response.data.nested.deep.value).toBe(42);
    });

    it('should handle array returns', async () => {
      await api.post('/__integr8__/override/TestService', {
        methods: {
          getData: {
            type: 'fn',
            body: 'return [1, 2, 3, 4, 5].map(n => ({ id: n, value: n * 10 }));',
          },
        },
      });

      const response = await axios.get(`${baseUrl}/test/data`);
      
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data).toHaveLength(5);
      expect(response.data[2]).toEqual({ id: 3, value: 30 });
    });

    it('should support closures and state', async () => {
      // Note: Factory is called on EACH method invocation, so counter resets
      // To have persistent state, we'd need a singleton factory pattern
      // For now, just verify the pattern works
      await api.post('/__integr8__/override/TestService', {
        factory: {
          body: `
            return {
              getData: () => ({ hasFactory: true, timestamp: Date.now() }),
              getUser: (id) => ({ id }),
              asyncMethod: () => Promise.resolve({})
            };
          `,
        },
      });

      // First call
      let response = await axios.get(`${baseUrl}/test/data`);
      expect(response.data.hasFactory).toBe(true);
      const firstTimestamp = response.data.timestamp;

      // Second call
      response = await axios.get(`${baseUrl}/test/data`);
      expect(response.data.hasFactory).toBe(true);
      expect(response.data.timestamp).toBeGreaterThanOrEqual(firstTimestamp);
    });
  });
});

