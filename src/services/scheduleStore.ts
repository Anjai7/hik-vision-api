export interface ScheduleConfig {
  enabled: boolean;
  mode: 'dual' | 'morning' | 'evening' | '24/7' | 'custom';
  templateNo: number;
  templateName: string;
  morningBeginTime: string;
  morningEndTime: string;
  eveningBeginTime: string;
  eveningEndTime: string;
  beginTime: string;
  endTime: string;
  oneScanPerDay: boolean;
}

export let scheduleConfigState: ScheduleConfig = {
  enabled: true,
  mode: 'dual',
  templateNo: 2,
  templateName: 'Two Shifts: Morning (6-11 AM) & Evening (5-10 PM)',
  morningBeginTime: '06:00',
  morningEndTime: '11:00',
  eveningBeginTime: '17:00',
  eveningEndTime: '22:00',
  beginTime: '06:00',
  endTime: '22:00',
  oneScanPerDay: true,
};

export function setScheduleConfig(newConfig: Partial<ScheduleConfig>) {
  scheduleConfigState = {
    ...scheduleConfigState,
    ...newConfig,
  };
  return scheduleConfigState;
}
