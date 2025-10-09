import { NestJSAdapter } from '../adapter';
import { AdapterConfig } from '@soapjs/integr8';
import { INestApplication } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

// Mock the integr8 logger
jest.mock('@soapjs/integr8', () => ({
  ...jest.requireActual('@soapjs/integr8'),
  createServiceLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('NestJSAdapter', () => {
  let adapter: NestJSAdapter;
  let mockModuleRef: jest.Mocked<ModuleRef>;
  let mockApp: jest.Mocked<INestApplication>;

  beforeEach(async () => {
    adapter = new NestJSAdapter();
    
    // Initialize the adapter to set up logger
    await adapter.initialize({ type: 'nestjs' });
    
    mockModuleRef = {
      get: jest.fn(),
      resolve: jest.fn(),
      create: jest.fn(),
    } as any;

    mockApp = {
      get: jest.fn(),
      use: jest.fn(),
      listen: jest.fn(),
      close: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize the adapter with config', async () => {
      const config: AdapterConfig = {
        type: 'nestjs',
        config: {
          logging: true,
        },
      };

      await adapter.initialize(config);

      expect(adapter.name).toBe('nestjs');
    });

    it('should initialize without config', async () => {
      const config: AdapterConfig = {
        type: 'nestjs',
      };

      await expect(adapter.initialize(config)).resolves.not.toThrow();
    });
  });

  describe('setNestJSReferences', () => {
    it('should set ModuleRef and Application references', () => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);

      expect(adapter.getModuleRef()).toBe(mockModuleRef);
      expect(adapter.getApplication()).toBe(mockApp);
    });
  });

  describe('applyOverride', () => {
    beforeEach(() => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
    });

    it('should apply middleware override', async () => {
      const implementation = jest.fn();

      await adapter.applyOverride('middleware', 'TestMiddleware', implementation);

      expect(adapter.hasOverride('middleware', 'TestMiddleware')).toBe(true);
    });

    it('should apply service override', async () => {
      const mockService = { method: jest.fn() };
      mockModuleRef.get.mockReturnValue(mockService);

      await adapter.applyOverride('service', 'TestService', { method: jest.fn() });

      expect(adapter.hasOverride('service', 'TestService')).toBe(true);
    });

    it('should apply guard override', async () => {
      const mockGuard = { canActivate: jest.fn() };
      mockModuleRef.get.mockReturnValue(mockGuard);

      await adapter.applyOverride('guard', 'TestGuard', mockGuard);

      expect(adapter.hasOverride('guard', 'TestGuard')).toBe(true);
    });

    it('should apply interceptor override', async () => {
      const mockInterceptor = { intercept: jest.fn() };
      mockModuleRef.get.mockReturnValue(mockInterceptor);

      await adapter.applyOverride('interceptor', 'TestInterceptor', mockInterceptor);

      expect(adapter.hasOverride('interceptor', 'TestInterceptor')).toBe(true);
    });

    it('should apply pipe override', async () => {
      const mockPipe = { transform: jest.fn() };
      mockModuleRef.get.mockReturnValue(mockPipe);

      await adapter.applyOverride('pipe', 'TestPipe', mockPipe);

      expect(adapter.hasOverride('pipe', 'TestPipe')).toBe(true);
    });

    it('should apply controller override', async () => {
      const mockController = { method: jest.fn() };
      mockModuleRef.get.mockReturnValue(mockController);

      await adapter.applyOverride('controller', 'TestController', mockController);

      expect(adapter.hasOverride('controller', 'TestController')).toBe(true);
    });

    it('should apply repository override', async () => {
      const mockRepo = { find: jest.fn() };
      mockModuleRef.get.mockReturnValue(mockRepo);

      await adapter.applyOverride('repository', 'User', mockRepo);

      expect(adapter.hasOverride('repository', 'User')).toBe(true);
    });

    it('should apply data source override', async () => {
      const mockDataSource = { query: jest.fn() };
      mockModuleRef.get.mockReturnValue(mockDataSource);

      await adapter.applyOverride('dataSource', 'default', mockDataSource);

      expect(adapter.hasOverride('dataSource', 'default')).toBe(true);
    });

    it('should handle unknown override type', async () => {
      await adapter.applyOverride('unknown', 'Test', {});

      // Should not throw, just log warning
      expect(adapter.hasOverride('unknown', 'Test')).toBe(true);
    });

    it('should throw error when ModuleRef is not set for provider override', async () => {
      const adapterWithoutRefs = new NestJSAdapter();

      await expect(
        adapterWithoutRefs.applyOverride('service', 'TestService', {})
      ).rejects.toThrow('NestJS ModuleRef is not set');
    });

    it('should throw error when App is not set for middleware override', async () => {
      const adapterWithoutRefs = new NestJSAdapter();

      await expect(
        adapterWithoutRefs.applyOverride('middleware', 'TestMiddleware', {})
      ).rejects.toThrow('NestJS Application reference is not set');
    });
  });

  describe('getOverride', () => {
    beforeEach(() => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
    });

    it('should return override if it exists', async () => {
      const implementation = { method: jest.fn() };
      mockModuleRef.get.mockReturnValue({});

      await adapter.applyOverride('service', 'TestService', implementation);

      const override = adapter.getOverride('service', 'TestService');
      expect(override).toBe(implementation);
    });

    it('should return undefined if override does not exist', () => {
      const override = adapter.getOverride('service', 'NonExistent');
      expect(override).toBeUndefined();
    });
  });

  describe('hasOverride', () => {
    beforeEach(() => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
    });

    it('should return true if override exists', async () => {
      mockModuleRef.get.mockReturnValue({});
      await adapter.applyOverride('service', 'TestService', {});

      expect(adapter.hasOverride('service', 'TestService')).toBe(true);
    });

    it('should return false if override does not exist', () => {
      expect(adapter.hasOverride('service', 'NonExistent')).toBe(false);
    });
  });

  describe('removeOverride', () => {
    beforeEach(() => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
    });

    it('should remove existing override', async () => {
      mockModuleRef.get.mockReturnValue({});
      await adapter.applyOverride('service', 'TestService', {});

      expect(adapter.hasOverride('service', 'TestService')).toBe(true);

      await adapter.removeOverride('service', 'TestService');

      expect(adapter.hasOverride('service', 'TestService')).toBe(false);
    });

    it('should not throw when removing non-existent override', async () => {
      await expect(
        adapter.removeOverride('service', 'NonExistent')
      ).resolves.not.toThrow();
    });
  });

  describe('listOverrides', () => {
    beforeEach(() => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
    });

    it('should return empty array when no overrides', () => {
      const overrides = adapter.listOverrides();
      expect(overrides).toEqual([]);
    });

    it('should list all active overrides', async () => {
      mockModuleRef.get.mockReturnValue({});

      await adapter.applyOverride('service', 'TestService', { method: jest.fn() });
      await adapter.applyOverride('guard', 'TestGuard', { canActivate: jest.fn() });

      const overrides = adapter.listOverrides();

      // Each override may create multiple entries (service -> service + provider)
      expect(overrides.length).toBeGreaterThanOrEqual(2);
      expect(overrides.some(o => o.type === 'service' && o.name === 'TestService')).toBe(true);
      expect(overrides.some(o => o.type === 'guard' && o.name === 'TestGuard')).toBe(true);
    });
  });

  describe('teardown', () => {
    beforeEach(() => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
    });

    it('should clear all overrides', async () => {
      mockModuleRef.get.mockReturnValue({});
      await adapter.applyOverride('service', 'TestService', {});
      await adapter.applyOverride('guard', 'TestGuard', {});

      expect(adapter.listOverrides().length).toBeGreaterThan(0);

      await adapter.teardown();

      expect(adapter.listOverrides()).toHaveLength(0);
    });

    it('should handle teardown with no overrides', async () => {
      await expect(adapter.teardown()).resolves.not.toThrow();
    });
  });

  describe('getModuleRef', () => {
    it('should return undefined when not set', () => {
      expect(adapter.getModuleRef()).toBeUndefined();
    });

    it('should return ModuleRef when set', () => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
      expect(adapter.getModuleRef()).toBe(mockModuleRef);
    });
  });

  describe('getApplication', () => {
    it('should return undefined when not set', () => {
      expect(adapter.getApplication()).toBeUndefined();
    });

    it('should return Application when set', () => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
      expect(adapter.getApplication()).toBe(mockApp);
    });
  });

  describe('createTestModule', () => {
    it('should return test module configuration', () => {
      const testModule = NestJSAdapter.createTestModule();

      expect(testModule).toHaveProperty('imports');
      expect(testModule).toHaveProperty('providers');
      expect(testModule).toHaveProperty('exports');
      expect(testModule.providers).toHaveLength(1);
      expect(testModule.providers[0]).toHaveProperty('provide', 'INTEGR8_OVERRIDE_SERVICE');
    });

    it('should have working override service', async () => {
      const testModule = NestJSAdapter.createTestModule();
      const service = testModule.providers[0].useValue;

      await expect(
        service.applyOverride('test', 'Test', {})
      ).resolves.not.toThrow();
    });
  });

  describe('repository override with fallback', () => {
    beforeEach(() => {
      adapter.setNestJSReferences(mockModuleRef, mockApp);
    });

    it('should fallback to provider override when repository token not found', async () => {
      mockModuleRef.get
        .mockImplementationOnce(() => {
          throw new Error('Repository not found');
        })
        .mockReturnValueOnce({});

      await adapter.applyOverride('repository', 'User', { find: jest.fn() });

      expect(adapter.hasOverride('repository', 'User')).toBe(true);
    });
  });
});

