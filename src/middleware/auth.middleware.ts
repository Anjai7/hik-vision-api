import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // If no secret key is configured, allow requests (open access mode)
  if (!config.API_SECRET_KEY) {
    return next();
  }

  // Allow health check without API key
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  const clientKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!clientKey || clientKey !== config.API_SECRET_KEY) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing API key. Include x-api-key header in your request.',
      },
    });
    return;
  }

  next();
}
