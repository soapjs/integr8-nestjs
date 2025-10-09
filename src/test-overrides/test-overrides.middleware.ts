import { 
  Injectable, 
  NestMiddleware, 
  UnauthorizedException 
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Simple authorization middleware for test override endpoints
 */
@Injectable()
export class TestOverridesAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // 1) Hard environmental protection
    if (process.env.INTEGR8_OVERRIDES_ENABLED !== '1') {
      throw new UnauthorizedException('Overrides disabled');
    }
    
    // 2) Token from ENV (simplest approach)
    const hdr = req.headers['authorization'] || '';
    const token = hdr.toString().replace(/^Bearer\s+/i, '');
    const expected = process.env.INTEGR8_OVERRIDES_TOKEN || '';
    
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid token');
    }
    
    next();
  }
}

