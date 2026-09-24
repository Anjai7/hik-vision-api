import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Authentication Middleware:
 * Validates either a Supabase JWT Bearer token (sent by authenticated mobile app users)
 * or a valid x-api-key secret header.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Always permit public health check endpoints
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  // If authentication is disabled explicitly in environment
  if (config.REQUIRE_AUTH === false && !config.API_SECRET_KEY) {
    return next();
  }

  // 1. Check API Key header (x-api-key)
  const clientApiKey = (req.headers['x-api-key'] as string) || '';
  if (config.API_SECRET_KEY && clientApiKey && clientApiKey === config.API_SECRET_KEY) {
    return next();
  }

  // 2. Check Authorization header (Bearer <Supabase JWT token>)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    // Check if token itself matches the shared API secret key
    if (config.API_SECRET_KEY && token === config.API_SECRET_KEY) {
      return next();
    }

    // Verify Bearer token against Supabase Auth API
    if (config.SUPABASE_URL && config.SUPABASE_ANON_KEY && token) {
      try {
        const verifyRes = await fetch(`${config.SUPABASE_URL}/auth/v1/user`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: config.SUPABASE_ANON_KEY,
          },
        });

        if (verifyRes.ok) {
          const userData = await verifyRes.json();
          (req as any).user = userData;
          return next();
        } else {
          logger.warn(`Supabase token rejected: HTTP ${verifyRes.status}`);
        }
      } catch (err: any) {
        logger.error(`Supabase auth connection error: ${err?.message}`);
      }
    }
  }

  // Unauthorized access
  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign into the mobile app to access the Hikvision API.',
    },
  });
}
