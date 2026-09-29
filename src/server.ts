import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { scanEnforcerService } from './services/scanEnforcer.service';

app.listen(config.PORT, () => {
  logger.info(`=======================================================`);
  logger.info(` Hikvision Standalone Backend API Started`);
  logger.info(` Port: ${config.PORT}`);
  logger.info(` Terminal Host: ${config.HIKVISION_HOST}`);
  logger.info(` Mode: ${config.NODE_ENV}`);
  logger.info(` Ready for React Native & Vercel deployment`);
  logger.info(`=======================================================`);

  // Initial enforcement check
  scanEnforcerService.enforce().catch((err) => {
    logger.warn('[ScanEnforcer] Startup check error:', err?.message || err);
  });

  // Background interval: check every 8 seconds for new scan events to enforce 1-scan-per-day
  setInterval(() => {
    scanEnforcerService.enforce().catch((err) => {
      logger.warn('[ScanEnforcer] Polling loop error:', err?.message || err);
    });
  }, 8000);
});

