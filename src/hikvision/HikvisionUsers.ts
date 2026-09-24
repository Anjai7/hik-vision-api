import { HikvisionClient } from './HikvisionClient';
import { UserInfo, UserInfoSearchResponse } from './types';

export interface UserCountResult {
  userNumber: number;
  bindFingerprintUserNumber: number;
  bindFaceUserNumber: number;
  bindCardUserNumber: number;
  raw: unknown;
}

export interface SearchUsersOptions {
  position?: number;
  maxResults?: number;
  employeeNo?: string;
  searchId?: string;
}

export interface UserSearchResult {
  searchId: string;
  totalMatches: number;
  numOfMatches: number;
  users: UserInfo[];
  raw: unknown;
}

export class HikvisionUsers {
  constructor(private client: HikvisionClient) {}

  public async getUserCount(): Promise<UserCountResult> {
    const raw = await this.client.get<any>('/ISAPI/AccessControl/UserInfo/Count?format=json');
    const data = raw.UserInfoCount || raw;

    return {
      userNumber: Number(data.userNumber ?? 0),
      bindFingerprintUserNumber: Number(data.bindFingerprintUserNumber ?? 0),
      bindFaceUserNumber: Number(data.bindFaceUserNumber ?? 0),
      bindCardUserNumber: Number(data.bindCardUserNumber ?? 0),
      raw,
    };
  }

  public async searchUsers(options: SearchUsersOptions = {}): Promise<UserSearchResult> {
    const position = options.position ?? 0;
    const maxResults = options.maxResults ?? 30;
    const searchId = options.searchId || '1';

    const searchCond: Record<string, any> = {
      searchID: searchId,
      searchResultPosition: position,
      maxResults: maxResults,
    };

    if (options.employeeNo) {
      searchCond.EmployeeNoList = [{ employeeNo: options.employeeNo }];
    }

    const payload = {
      UserInfoSearchCond: searchCond,
    };

    const raw = await this.client.post<UserInfoSearchResponse>(
      '/ISAPI/AccessControl/UserInfo/Search?format=json',
      payload
    );

    const search = raw.UserInfoSearch || {};
    const users = Array.isArray(search.UserInfo) ? search.UserInfo : [];
    const totalMatches = Number(search.totalMatches ?? users.length);
    const numOfMatches = Number(search.numOfMatches ?? users.length);

    return {
      searchId: search.searchID || searchId,
      totalMatches,
      numOfMatches,
      users,
      raw,
    };
  }

  public async fetchAllUsers(batchSize = 30): Promise<UserInfo[]> {
    const allUsers: UserInfo[] = [];
    let position = 0;
    let total = Infinity;

    while (position < total) {
      const result = await this.searchUsers({
        position,
        maxResults: batchSize,
      });

      if (!result.users || result.users.length === 0) {
        break;
      }

      allUsers.push(...result.users);
      total = result.totalMatches;
      position += result.users.length;

      if (position >= total) {
        break;
      }
    }

    return allUsers;
  }
}
