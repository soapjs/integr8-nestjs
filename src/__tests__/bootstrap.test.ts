import { bootstrapNestJsIntegr8, bootstrapAndListen } from '../bootstrap';
import { NestFactory } from '@nestjs/core';
import { INestApplication, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { NestJSAdapter } from '../adapter';

// Mock NestJS dependencies
jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn(),
  },
  ModuleRef: jest.fn(),
}));

jest.mock('../adapter');
jest.mock('../test.middleware', () => ({
  createTestMiddleware: jest.fn(() => jest.fn((req: any, res: any, next: any) => next())),
}));

describe('Bootstrap Functions', () => {
  let mockApp: jest.Mocked<INestApplication>;
  let mockModuleRef: jest.Mocked<ModuleRef>;
  let mockAdapter: jest.Mocked<NestJSAdapter>;

  @Module({})
  class TestModule {}

  beforeEach(() => {
    mockAdapter = {
      setNestJSReferences: jest.fn(),
      initialize: jest.fn(),
      applyOverride: jest.fn(),
      teardown: jest.fn(),
      getOverride: jest.fn(),
      hasOverride: jest.fn(),
      removeOverride: jest.fn(),
      listOverrides: jest.fn(),
      getModuleRef: jest.fn(),
      getApplication: jest.fn(),
      name: 'nestjs',
    } as any;

    mockModuleRef = {
      get: jest.fn(),
      resolve: jest.fn(),
      create: jest.fn(),
    } as any;

    mockApp = {
      get: jest.fn((token: any) => {
        if (token === 'INTEGR8_ADAPTER') return mockAdapter;
        if (token === ModuleRef || token.name === 'ModuleRef') return mockModuleRef;
        return null;
      }) as any,
      use: jest.fn(),
      enableCors: jest.fn(),
      setGlobalPrefix: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
      init: jest.fn(),
      getHttpServer: jest.fn(),
    } as any;

    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);

    // Reset environment
    delete process.env.INTEGR8_MODE;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('bootstrapNestJsIntegr8', () => {
    it('should create NestJS application', async () => {
      const app = await bootstrapNestJsIntegr8(TestModule);

      expect(NestFactory.create).toHaveBeenCalledWith(TestModule);
      expect(app).toBe(mockApp);
    });

    it('should set INTEGR8_MODE environment variable', async () => {
      await bootstrapNestJsIntegr8(TestModule);

      expect(process.env.INTEGR8_MODE).toBe('true');
    });

    it('should enable CORS by default', async () => {
      await bootstrapNestJsIntegr8(TestModule);

      expect(mockApp.enableCors).toHaveBeenCalled();
    });

    it('should not enable CORS when cors is false', async () => {
      await bootstrapNestJsIntegr8(TestModule, { cors: false });

      expect(mockApp.enableCors).not.toHaveBeenCalled();
    });

    it('should set global prefix when provided', async () => {
      await bootstrapNestJsIntegr8(TestModule, {
        globalPrefix: 'api/v1',
      });

      expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('api/v1');
    });

    it('should not set global prefix when not provided', async () => {
      await bootstrapNestJsIntegr8(TestModule);

      expect(mockApp.setGlobalPrefix).not.toHaveBeenCalled();
    });

    it('should configure adapter with references', async () => {
      await bootstrapNestJsIntegr8(TestModule);

      expect(mockApp.get).toHaveBeenCalledWith('INTEGR8_ADAPTER');
      expect(mockApp.get).toHaveBeenCalledWith(ModuleRef);
      expect(mockAdapter.setNestJSReferences).toHaveBeenCalledWith(mockModuleRef, mockApp);
    });

    it('should handle missing adapter gracefully', async () => {
      mockApp.get = jest.fn(() => {
        throw new Error('Adapter not found');
      }) as any;

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(bootstrapNestJsIntegr8(TestModule)).resolves.toBe(mockApp);

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should add test middleware by default', async () => {
      await bootstrapNestJsIntegr8(TestModule);

      expect(mockApp.use).toHaveBeenCalled();
    });

    it('should not add test middleware when disabled', async () => {
      await bootstrapNestJsIntegr8(TestModule, {
        enableTestMiddleware: false,
      });

      expect(mockApp.use).not.toHaveBeenCalled();
    });

    it('should work with all options', async () => {
      await bootstrapNestJsIntegr8(TestModule, {
        enableTestMiddleware: true,
        cors: true,
        globalPrefix: 'api',
      });

      expect(mockApp.enableCors).toHaveBeenCalled();
      expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('api');
      expect(mockApp.use).toHaveBeenCalled();
    });
  });

  describe('bootstrapAndListen', () => {
    it('should bootstrap and start listening on default port', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const app = await bootstrapAndListen(TestModule);

      expect(NestFactory.create).toHaveBeenCalledWith(TestModule);
      expect(mockApp.listen).toHaveBeenCalledWith(3000);
      expect(app).toBe(mockApp);
      
      consoleLogSpy.mockRestore();
    });

    it('should bootstrap and start listening on custom port', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await bootstrapAndListen(TestModule, { port: 4000 });

      expect(mockApp.listen).toHaveBeenCalledWith(4000);
      
      consoleLogSpy.mockRestore();
    });

    it('should log the application URL', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await bootstrapAndListen(TestModule, { port: 5000 });

      expect(consoleLogSpy).toHaveBeenCalledWith('Application is running on: http://localhost:5000');
      
      consoleLogSpy.mockRestore();
    });

    it('should pass options to bootstrapNestJsIntegr8', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await bootstrapAndListen(TestModule, {
        port: 3001,
        enableTestMiddleware: false,
        cors: false,
        globalPrefix: 'v1',
      });

      expect(mockApp.enableCors).not.toHaveBeenCalled();
      expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('v1');
      expect(mockApp.use).not.toHaveBeenCalled();
      expect(mockApp.listen).toHaveBeenCalledWith(3001);
      
      consoleLogSpy.mockRestore();
    });

    it('should handle listen errors', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Port already in use');
      mockApp.listen = jest.fn().mockRejectedValue(error);

      await expect(bootstrapAndListen(TestModule)).rejects.toThrow('Port already in use');
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('Bootstrap Options Interface', () => {
    it('should accept valid BootstrapOptions', async () => {
      const options = {
        port: 3000,
        enableTestMiddleware: true,
        globalPrefix: 'api/v1',
        cors: true,
      };

      await expect(bootstrapNestJsIntegr8(TestModule, options)).resolves.toBe(mockApp);
    });

    it('should accept partial BootstrapOptions', async () => {
      await expect(
        bootstrapNestJsIntegr8(TestModule, { port: 3000 })
      ).resolves.toBe(mockApp);

      await expect(
        bootstrapNestJsIntegr8(TestModule, { cors: false })
      ).resolves.toBe(mockApp);

      await expect(
        bootstrapNestJsIntegr8(TestModule, { globalPrefix: 'api' })
      ).resolves.toBe(mockApp);
    });

    it('should accept no options', async () => {
      await expect(bootstrapNestJsIntegr8(TestModule)).resolves.toBe(mockApp);
    });
  });

  describe('Integration with Adapter', () => {
    it('should properly wire adapter with NestJS references', async () => {
      await bootstrapNestJsIntegr8(TestModule);

      expect(mockAdapter.setNestJSReferences).toHaveBeenCalledTimes(1);
      expect(mockAdapter.setNestJSReferences).toHaveBeenCalledWith(
        mockModuleRef,
        mockApp
      );
    });

    it('should handle adapter initialization failure gracefully', async () => {
      mockApp.get = jest.fn(() => {
        throw new Error('Provider not found');
      }) as any;

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(bootstrapNestJsIntegr8(TestModule)).resolves.toBe(mockApp);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Integr8 adapter not found')
      );

      consoleWarnSpy.mockRestore();
    });
  });
});

