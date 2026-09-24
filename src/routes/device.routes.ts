import { Router, Request, Response, NextFunction } from 'express';
import { HikvisionClient, HikvisionDevice, HikvisionUsers, HikvisionEvents } from '../hikvision';
import { config } from '../config';

const router = Router();

const client = new HikvisionClient({
  host: config.HIKVISION_HOST,
  username: config.HIKVISION_USERNAME,
  password: config.HIKVISION_PASSWORD,
  verifyTls: config.HIKVISION_VERIFY_TLS,
  timeoutMs: config.HIKVISION_TIMEOUT,
});

const deviceService = new HikvisionDevice(client);
const usersService = new HikvisionUsers(client);
const eventsService = new HikvisionEvents(client);

/**
 * GET /api/device
 * Returns device metadata matching HikDevice interface
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const info = await deviceService.getDeviceInfo();
    res.json({
      success: true,
      data: {
        id: info.serialNumber || 'ds-k1t320mfwx-terminal',
        name: info.deviceName,
        host: config.HIKVISION_HOST,
        username: config.HIKVISION_USERNAME,
        model: info.model,
        firmware: info.firmwareVersion,
        serialNo: info.serialNumber,
        enabled: true,
        lastSeenAt: new Date().toISOString(),
        connection: {
          host: config.HIKVISION_HOST,
          username: config.HIKVISION_USERNAME,
          verifyTls: config.HIKVISION_VERIFY_TLS,
          timeoutMs: config.HIKVISION_TIMEOUT,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/device/status
 * Returns online status and latency
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await deviceService.testConnection();
    res.json({
      success: true,
      data: {
        online: status.online,
        latencyMs: status.latencyMs,
        model: status.deviceInfo?.model || 'DS-K1T320MFWX',
        firmware: status.deviceInfo?.firmwareVersion,
        serialNo: status.deviceInfo?.serialNumber,
        host: config.HIKVISION_HOST,
        error: status.error,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/device/test
 * Explicit test endpoint (called by React Native test buttons)
 */
router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = await deviceService.testConnection();
    res.json({
      success: status.online,
      data: {
        online: status.online,
        latencyMs: status.latencyMs,
        model: status.deviceInfo?.model || 'DS-K1T320MFWX',
        firmware: status.deviceInfo?.firmwareVersion,
        serialNo: status.deviceInfo?.serialNumber,
        error: status.error,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/device/sync
 * Sync both users and events on demand
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  try {
    const [users, events] = await Promise.all([
      usersService.fetchAllUsers(30).catch(() => []),
      eventsService.fetchAllEvents({ maxResults: 30 }).catch(() => []),
    ]);

    res.json({
      success: true,
      data: {
        usersCount: users.length,
        eventsCount: events.length,
        durationMs: Date.now() - start,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/device/open-door
 * Remote door unlock command
 */
router.post('/open-door', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doorNo = Number(req.body?.doorNo || 1);
    const result = await deviceService.openDoor(doorNo);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
