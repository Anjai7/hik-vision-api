import { HikvisionClient } from './HikvisionClient';

export interface ParsedDeviceInfo {
  deviceName: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  macAddress?: string;
  deviceType?: string;
  raw: unknown;
}

export class HikvisionDevice {
  constructor(private client: HikvisionClient) {}

  public async getDeviceInfo(): Promise<ParsedDeviceInfo> {
    const raw = await this.client.get<any>('/ISAPI/System/deviceInfo?format=json');

    if (typeof raw === 'string') {
      return this.parseXmlDeviceInfo(raw);
    }

    const info = raw.DeviceInfo || raw;
    return {
      deviceName: info.deviceName || 'Access Controller',
      model: info.model || 'DS-K1T320MFWX',
      serialNumber: info.serialNumber || 'Unknown Serial',
      firmwareVersion: info.firmwareVersion
        ? `${info.firmwareVersion} ${info.firmwareReleasedDate || ''}`.trim()
        : 'Unknown Firmware',
      macAddress: info.macAddress,
      deviceType: info.deviceType,
      raw,
    };
  }

  private parseXmlDeviceInfo(xml: string): ParsedDeviceInfo {
    const extract = (tag: string): string => {
      const match = new RegExp(`<${tag}>([^<]+)<\/${tag}>`, 'i').exec(xml);
      return match ? match[1].trim() : '';
    };

    return {
      deviceName: extract('deviceName') || 'Access Controller',
      model: extract('model') || 'DS-K1T320MFWX',
      serialNumber: extract('serialNumber') || 'Unknown Serial',
      firmwareVersion: `${extract('firmwareVersion')} ${extract('firmwareReleasedDate')}`.trim() || 'Unknown Firmware',
      macAddress: extract('macAddress') || undefined,
      deviceType: extract('deviceType') || undefined,
      raw: { xml },
    };
  }

  public async testConnection(): Promise<{
    online: boolean;
    latencyMs: number;
    deviceInfo?: ParsedDeviceInfo;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const deviceInfo = await this.getDeviceInfo();
      return {
        online: true,
        latencyMs: Date.now() - startTime,
        deviceInfo,
      };
    } catch (error: any) {
      return {
        online: false,
        latencyMs: Date.now() - startTime,
        error: error.message || 'Failed to connect to Hikvision terminal',
      };
    }
  }

  /**
   * Remote door open command (Commonly used by React Native gym/office apps)
   */
  public async openDoor(doorNo = 1): Promise<{ success: boolean; message: string }> {
    try {
      const xmlPayload = '<RemoteControlDoor><cmd>open</cmd></RemoteControlDoor>';
      await this.client.put(
        `/ISAPI/AccessControl/RemoteControl/door/${doorNo}`,
        xmlPayload
      );
      return {
        success: true,
        message: `Door ${doorNo} unlocked successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || `Failed to unlock door ${doorNo}`,
      };
    }
  }

  /**
   * Get current terminal schedule configuration
   */
  public async getSchedule(): Promise<{
    enabled: boolean;
    templateNo: number;
    templateName: string;
    beginTime: string;
    endTime: string;
  }> {
    try {
      const tpl = await this.client.get<any>('/ISAPI/AccessControl/UserRightPlanTemplate/2?format=json');
      const week = await this.client.get<any>('/ISAPI/AccessControl/UserRightWeekPlanCfg/2?format=json');
      const tplObj = tpl?.UserRightPlanTemplate;
      const weekList = week?.UserRightWeekPlanCfg?.WeekPlanCfg || [];
      const firstSegment = weekList[0]?.TimeSegment;
      return {
        enabled: Boolean(tplObj?.enable),
        templateNo: 2,
        templateName: tplObj?.templateName || 'Evening (5 PM - 10 PM)',
        beginTime: firstSegment?.beginTime?.slice(0, 5) || '17:00',
        endTime: firstSegment?.endTime?.slice(0, 5) || '22:00',
      };
    } catch {
      return {
        enabled: false,
        templateNo: 1,
        templateName: 'All Day (24/7)',
        beginTime: '00:00',
        endTime: '24:00',
      };
    }
  }

  /**
   * Program terminal hardware time schedule (WeekPlan 2 & PlanTemplate 2)
   */
  public async setSchedule(params: {
    enabled: boolean;
    templateName?: string;
    beginTime: string; // e.g. "17:00"
    endTime: string;   // e.g. "22:00"
  }): Promise<any> {
    const bTime = params.beginTime.length === 5 ? `${params.beginTime}:00` : params.beginTime;
    const eTime = params.endTime.length === 5 ? `${params.endTime}:00` : params.endTime;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const weekPlanCfg = {
      UserRightWeekPlanCfg: {
        enable: params.enabled,
        WeekPlanCfg: days.map((week) => ({
          week,
          id: 1,
          enable: params.enabled,
          TimeSegment: {
            beginTime: bTime,
            endTime: eTime,
          },
        })),
      },
    };

    await this.client.put('/ISAPI/AccessControl/UserRightWeekPlanCfg/2?format=json', weekPlanCfg);

    const templateCfg = {
      UserRightPlanTemplate: {
        enable: params.enabled,
        templateName: params.templateName || (params.enabled ? `Access Hours (${bTime.slice(0, 5)} - ${eTime.slice(0, 5)})` : 'All Day (24/7)'),
        weekPlanNo: 2,
        holidayGroupNo: '',
      },
    };

    return this.client.put('/ISAPI/AccessControl/UserRightPlanTemplate/2?format=json', templateCfg);
  }
}
