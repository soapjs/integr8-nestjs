import { Request, Response, NextFunction } from 'express';
import { NestJSAdapter } from './adapter';

/**
 * Creates middleware for handling Integr8 test operations
 * Provides endpoints for:
 * - Health checks (/__integr8__/health)
 * - Applying overrides (/__integr8__/override)
 * - Removing overrides (/__integr8__/override/:type/:name)
 */
export function createTestMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only handle paths starting with /__integr8__
    if (!req.path.startsWith('/__integr8__')) {
      return next();
    }

    try {
      // Health check endpoint
      if (req.path === '/__integr8__/health' && req.method === 'GET') {
        return res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          integr8: true,
          mode: process.env.INTEGR8_MODE === 'true'
        });
      }

      // Get adapter instance
      const adapter = (req as any).app?.get?.('INTEGR8_ADAPTER') as NestJSAdapter;
      
      if (!adapter) {
        return res.status(503).json({
          error: 'Integr8 adapter not available',
          message: 'Make sure Integr8TestModule is imported in your application'
        });
      }

      // Apply override endpoint
      if (req.path === '/__integr8__/override' && req.method === 'POST') {
        const { type, name, implementation } = req.body;

        if (!type || !name || !implementation) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Request must include type, name, and implementation'
          });
        }

        await adapter.applyOverride(type, name, implementation);

        return res.json({
          success: true,
          message: `Override applied: ${type}:${name}`
        });
      }

      // Remove override endpoint
      if (req.path.match(/^\/__integr8__\/override\/[^/]+\/[^/]+$/) && req.method === 'DELETE') {
        const parts = req.path.split('/');
        const type = parts[3];
        const name = parts[4];

        await adapter.removeOverride(type, name);

        return res.json({
          success: true,
          message: `Override removed: ${type}:${name}`
        });
      }

      // List overrides endpoint
      if (req.path === '/__integr8__/overrides' && req.method === 'GET') {
        const overrides = adapter.listOverrides();
        return res.json({
          count: overrides.length,
          overrides
        });
      }

      // Unknown endpoint
      return res.status(404).json({
        error: 'Not found',
        message: 'Unknown Integr8 endpoint'
      });

    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  };
}