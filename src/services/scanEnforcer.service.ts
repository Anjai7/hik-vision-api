import { HikvisionClient, HikvisionEvents, HikvisionUsers, HikvisionDevice } from '../hikvision';
import { config } from '../config';
import { logger } from '../utils/logger';
import { scheduleConfigState } from './scheduleStore';

export class ScanEnforcerService {
  private client: HikvisionClient;
  private eventsService: HikvisionEvents;
  private usersService: HikvisionUsers;
  private deviceService: HikvisionDevice;
  private isEnforcing = false;

  constructor() {
    this.client = new HikvisionClient({
      host: config.HIKVISION_HOST,
      username: config.HIKVISION_USERNAME,
      password: config.HIKVISION_PASSWORD,
      verifyTls: config.HIKVISION_VERIFY_TLS,
      timeoutMs: config.HIKVISION_TIMEOUT,
    });
    this.eventsService = new HikvisionEvents(this.client);
    this.usersService = new HikvisionUsers(this.client);
    this.deviceService = new HikvisionDevice(this.client);
  }

  /**
   * Check recent events and enforce the 1-scan-per-day rule.
   * If an employee successfully authenticated today, advance their beginTime
   * to tomorrow 00:00:00 so the terminal hardware automatically rejects any
   * further attempts today with 'Invalid Time / Not in Validity Period'.
   */
  public async enforce(): Promise<{ enforcedUsers: string[] }> {
    if (this.isEnforcing) return { enforcedUsers: [] };
    if (!scheduleConfigState.oneScanPerDay) return { enforcedUsers: [] };

    this.isEnforcing = true;
    const enforcedUsers: string[] = [];

    try {
      // 1. Get current date in IST / local terminal timezone
      const now = new Date();
      const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

      // Tomorrow 00:00:00
      const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
      const tomorrowDatePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrow);
      const tomorrowMidnight = `${tomorrowDatePart}T00:00:00`;

      // 2. Fetch recent events from terminal (last 30)
      const result = await this.eventsService.searchEvents({ maxResults: 30 });
      const events = result.events || [];

      // 3. Find unique employees who had an Access Granted event today
      const failedMinors = [39, 76, 78, 33, 34, 37];
      const todaySuccessEvents = events.filter((ev) => {
        if (!ev.employeeNo || ev.employeeNo === 'N/A') return false;
        if (ev.major !== 5) return false;
        if (failedMinors.includes(ev.minor)) return false;
        return ev.deviceDate === datePart;
      });

      const employeesWhoScannedToday = Array.from(
        new Set(todaySuccessEvents.map((e) => String(e.employeeNo)))
      );

      for (const empNo of employeesWhoScannedToday) {
        try {
          const userRes = await this.usersService.searchUsers({ employeeNo: empNo, maxResults: 1 });
          const user = userRes.users?.[0];
          if (!user) continue;

          const userValid = user.Valid as any;
          const currentBeginTime = userValid?.beginTime || '';
          // If the user's beginTime is not yet set to tomorrow (or later), advance it
          if (!currentBeginTime || currentBeginTime < tomorrowMidnight) {
            const currentEndTime = userValid?.endTime || `${now.getFullYear() + 1}-12-31T23:59:59`;
            logger.info(
              `[ScanEnforcer] User ${empNo} (${user.name}) successfully authenticated today. Advancing beginTime to ${tomorrowMidnight} to enforce 1-scan-per-day.`
            );

            await this.usersService.updateAccessPeriod(
              empNo,
              tomorrowMidnight,
              currentEndTime,
              user.userType !== 'blackList'
            );
            enforcedUsers.push(empNo);
          }
        } catch (err: any) {
          logger.warn(`[ScanEnforcer] Error enforcing for user ${empNo}:`, err?.message || err);
        }
      }
    } catch (err: any) {
      logger.warn('[ScanEnforcer] Error during enforcement run:', err?.message || err);
    } finally {
      this.isEnforcing = false;
    }

    return { enforcedUsers };
  }

  /**
   * Reset all users' beginTime back to today (e.g. when toggling off 1-scan-per-day)
   */
  public async resetAllUsersToToday(): Promise<number> {
    const todayMidnight = `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())}T00:00:00`;
    let count = 0;
    try {
      const allUsers = await this.usersService.fetchAllUsers(50);
      for (const u of allUsers) {
        const uValid = u.Valid as any;
        if (uValid?.beginTime && uValid.beginTime > todayMidnight) {
          await this.usersService.updateAccessPeriod(
            String(u.employeeNo),
            todayMidnight,
            uValid.endTime || '2035-12-31T23:59:59',
            u.userType !== 'blackList'
          );
          count++;
        }
      }
      logger.info(`[ScanEnforcer] Reset ${count} user(s) beginTime back to today.`);
    } catch (err) {
      logger.warn('[ScanEnforcer] Error resetting users:', err);
    }
    return count;
  }
}

export const scanEnforcerService = new ScanEnforcerService();
