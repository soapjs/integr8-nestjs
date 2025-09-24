import { ModuleRef } from '@nestjs/core';

export function createTestMiddleware() {
  return (req: any, res: any, next: any) => {
    if (req.path === '/override') {
      try {
        const moduleRef = req.app.get(ModuleRef);
        const adapter = req.app.get('INTEGR8_ADAPTER');
        
        const { type, name, implementation } = req.body;
        adapter.applyOverride(type, name, implementation);
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    } else if (req.path === '/health') {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        integr8: true
      });
    } else {
      next();
    }
  };
}