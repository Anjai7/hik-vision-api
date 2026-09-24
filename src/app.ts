import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { apiKeyAuth } from './middleware/auth.middleware';
import { errorHandler } from './middleware/errorHandler';

import deviceRoutes from './routes/device.routes';
import usersRoutes from './routes/users.routes';
import attendanceRoutes from './routes/attendance.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();

// Security and CORS for mobile and web apps
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Rate limiter: 150 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please slow down.',
    },
  },
});
app.use('/api', apiLimiter);

// Optional API Key Protection (if API_SECRET_KEY is defined in .env)
app.use(apiKeyAuth);

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Health check endpoints
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    service: 'Hikvision Vercel API',
    terminalHost: config.HIKVISION_HOST,
    timestamp: new Date().toISOString(),
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API Routes
app.use('/api/device', deviceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error Handler
app.use(errorHandler);

export default app;
