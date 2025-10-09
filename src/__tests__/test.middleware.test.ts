import { createTestMiddleware } from '../test.middleware';
import { Request, Response, NextFunction } from 'express';
import { NestJSAdapter } from '../adapter';

describe('Test Middleware', () => {
  let middleware: ReturnType<typeof createTestMiddleware>;
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockAdapter: jest.Mocked<NestJSAdapter>;

  beforeEach(() => {
    mockAdapter = {
      applyOverride: jest.fn().mockResolvedValue(undefined),
      removeOverride: jest.fn().mockResolvedValue(undefined),
      listOverrides: jest.fn().mockReturnValue([]),
      setNestJSReferences: jest.fn(),
      initialize: jest.fn(),
      teardown: jest.fn(),
      getOverride: jest.fn(),
      hasOverride: jest.fn(),
      getModuleRef: jest.fn(),
      getApplication: jest.fn(),
      name: 'nestjs',
    } as any;

    mockReq = {
      path: '/',
      method: 'GET',
      body: {},
      app: {
        get: jest.fn().mockReturnValue(mockAdapter),
      },
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    middleware = createTestMiddleware();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Endpoint', () => {
    it('should respond to health check request', async () => {
      mockReq.path = '/__integr8__/health';
      mockReq.method = 'GET';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'ok',
        timestamp: expect.any(String),
        integr8: true,
        mode: true,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should include timestamp in ISO format', async () => {
      mockReq.path = '/__integr8__/health';
      mockReq.method = 'GET';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      const timestamp = jsonCall.timestamp;
      
      expect(() => new Date(timestamp)).not.toThrow();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });

    it('should reflect INTEGR8_MODE environment variable', async () => {
      mockReq.path = '/__integr8__/health';
      mockReq.method = 'GET';
      process.env.INTEGR8_MODE = 'false';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.mode).toBe(false);

      process.env.INTEGR8_MODE = 'true';
    });
  });

  describe('Apply Override Endpoint', () => {
    it('should apply override with valid request', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'POST';
      mockReq.body = {
        type: 'service',
        name: 'UserService',
        implementation: { findAll: jest.fn() },
      };

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdapter.applyOverride).toHaveBeenCalledWith(
        'service',
        'UserService',
        { findAll: expect.any(Function) }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Override applied: service:UserService',
      });
    });

    it('should return 400 when type is missing', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'POST';
      mockReq.body = {
        name: 'UserService',
        implementation: {},
      };

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid request',
        message: 'Request must include type, name, and implementation',
      });
      expect(mockAdapter.applyOverride).not.toHaveBeenCalled();
    });

    it('should return 400 when name is missing', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'POST';
      mockReq.body = {
        type: 'service',
        implementation: {},
      };

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockAdapter.applyOverride).not.toHaveBeenCalled();
    });

    it('should return 400 when implementation is missing', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'POST';
      mockReq.body = {
        type: 'service',
        name: 'UserService',
      };

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockAdapter.applyOverride).not.toHaveBeenCalled();
    });

    it('should return 500 when adapter throws error', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'POST';
      mockReq.body = {
        type: 'service',
        name: 'UserService',
        implementation: {},
      };

      mockAdapter.applyOverride.mockRejectedValue(new Error('Override failed'));

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Override failed',
      });
    });
  });

  describe('Remove Override Endpoint', () => {
    it('should remove override with valid request', async () => {
      mockReq.path = '/__integr8__/override/service/UserService';
      mockReq.method = 'DELETE';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdapter.removeOverride).toHaveBeenCalledWith('service', 'UserService');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Override removed: service:UserService',
      });
    });

    it('should handle different override types', async () => {
      const types = ['service', 'guard', 'interceptor', 'pipe', 'repository'];

      for (const type of types) {
        mockReq.path = `/__integr8__/override/${type}/TestName`;
        mockReq.method = 'DELETE';

        await middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockAdapter.removeOverride).toHaveBeenCalledWith(type, 'TestName');
      }
    });

    it('should return 500 when adapter throws error', async () => {
      mockReq.path = '/__integr8__/override/service/UserService';
      mockReq.method = 'DELETE';

      mockAdapter.removeOverride.mockRejectedValue(new Error('Remove failed'));

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Remove failed',
      });
    });
  });

  describe('List Overrides Endpoint', () => {
    it('should list all overrides', async () => {
      mockReq.path = '/__integr8__/overrides';
      mockReq.method = 'GET';

      const mockOverrides = [
        { type: 'service', name: 'UserService', hasImplementation: true },
        { type: 'guard', name: 'AuthGuard', hasImplementation: true },
      ];

      mockAdapter.listOverrides.mockReturnValue(mockOverrides);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdapter.listOverrides).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        count: 2,
        overrides: mockOverrides,
      });
    });

    it('should return empty list when no overrides', async () => {
      mockReq.path = '/__integr8__/overrides';
      mockReq.method = 'GET';

      mockAdapter.listOverrides.mockReturnValue([]);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        count: 0,
        overrides: [],
      });
    });
  });

  describe('Adapter Availability', () => {
    it('should return 503 when adapter is not available', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'POST';
      mockReq.app = {
        get: jest.fn().mockReturnValue(null),
      } as any;

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Integr8 adapter not available',
        message: 'Make sure Integr8TestModule is imported in your application',
      });
    });

    it('should handle missing app.get method', async () => {
      mockReq.path = '/__integr8__/health';
      mockReq.method = 'GET';
      mockReq.app = undefined;

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Health check should work even without adapter
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ok' })
      );
    });
  });

  describe('Unknown Endpoints', () => {
    it('should return 404 for unknown integr8 endpoint', async () => {
      mockReq.path = '/__integr8__/unknown';
      mockReq.method = 'GET';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not found',
        message: 'Unknown Integr8 endpoint',
      });
    });

    it('should call next() for non-integr8 paths', async () => {
      mockReq.path = '/api/users';
      mockReq.method = 'GET';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should call next() for root path', async () => {
      mockReq.path = '/';
      mockReq.method = 'GET';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('HTTP Method Validation', () => {
    it('should only handle GET for health endpoint', async () => {
      mockReq.path = '/__integr8__/health';
      mockReq.method = 'POST';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should only handle POST for override endpoint', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'GET';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should only handle DELETE for remove override endpoint', async () => {
      mockReq.path = '/__integr8__/override/service/TestService';
      mockReq.method = 'GET';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should only handle GET for list overrides endpoint', async () => {
      mockReq.path = '/__integr8__/overrides';
      mockReq.method = 'POST';

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('Error Handling', () => {
    it('should catch and return errors with proper format', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'POST';
      mockReq.body = {
        type: 'service',
        name: 'UserService',
        implementation: {},
      };

      const error = new Error('Test error');
      mockAdapter.applyOverride.mockRejectedValue(error);

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'Test error',
      });
    });

    it('should handle non-Error objects', async () => {
      mockReq.path = '/__integr8__/override';
      mockReq.method = 'POST';
      mockReq.body = {
        type: 'service',
        name: 'UserService',
        implementation: {},
      };

      mockAdapter.applyOverride.mockRejectedValue('String error');

      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});

