import app from './app';
import { config } from './config';
import { logger } from './utils/logger';

app.listen(config.PORT, () => {
  logger.info(`=======================================================`);
  logger.info(` Hikvision Standalone Backend API Started`);
  logger.info(` Port: ${config.PORT}`);
  logger.info(` Terminal Host: ${config.HIKVISION_HOST}`);
  logger.info(` Mode: ${config.NODE_ENV}`);
  logger.info(` Ready for React Native & Vercel deployment`);
  logger.info(`=======================================================`);
});
