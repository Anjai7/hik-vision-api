import { Router, Request, Response, NextFunction } from 'express';
import { HikvisionClient, HikvisionUsers } from '../hikvision';
import { config } from '../config';

const router = Router();

const client = new HikvisionClient({
  host: config.HIKVISION_HOST,
  username: config.HIKVISION_USERNAME,
  password: config.HIKVISION_PASSWORD,
  verifyTls: config.HIKVISION_VERIFY_TLS,
  timeoutMs: config.HIKVISION_TIMEOUT,
});

const usersService = new HikvisionUsers(client);

/**
 * GET /api/users
 * Returns list of users matching React Native HikUser interface
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const position = req.query.position ? parseInt(req.query.position as string, 10) : 0;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 30;
    const employeeNo = req.query.employeeNo as string | undefined;

    const result = await usersService.searchUsers({
      position,
      maxResults,
      employeeNo,
    });

    const formattedUsers = result.users.map((u) => ({
      id: u.employeeNo,
      employeeNo: u.employeeNo,
      name: u.name || 'Unnamed',
      userType: u.userType || 'normal',
      enabled: true,
      gender: u.gender || null,
      groupId: u.groupId ? Number(u.groupId) : 1,
      numOfFP: Number(u.numOfFP ?? 0),
      numOfFace: Number(u.numOfFace ?? 0),
      numOfCard: Number(u.numOfCard ?? 0),
      terminalSyncStatus: 'SYNCED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page: Math.floor(position / maxResults) + 1,
        limit: maxResults,
        total: result.totalMatches,
        totalPages: Math.ceil(result.totalMatches / maxResults) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users/sync
 * Sync users endpoint called by React Native app
 */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  try {
    const allUsers = await usersService.fetchAllUsers(30);
    res.json({
      success: true,
      data: {
        count: allUsers.length,
        durationMs: Date.now() - start,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/count
 * Biometric enrollment counts
 */
router.get('/count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const counts = await usersService.getUserCount();
    res.json({
      success: true,
      data: counts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:employeeNo
 * Single user details
 */
router.get('/:employeeNo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await usersService.searchUsers({
      employeeNo: req.params.employeeNo,
      maxResults: 1,
    });

    if (!result.users || result.users.length === 0) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: `User with employeeNo '${req.params.employeeNo}' not found on terminal`,
        },
      });
      return;
    }

    const u = result.users[0];
    res.json({
      success: true,
      data: {
        id: u.employeeNo,
        employeeNo: u.employeeNo,
        name: u.name,
        userType: u.userType || 'normal',
        enabled: true,
        numOfFP: Number(u.numOfFP ?? 0),
        numOfFace: Number(u.numOfFace ?? 0),
        numOfCard: Number(u.numOfCard ?? 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
