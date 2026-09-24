const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'pwd',
  'authorization',
  'auth',
  'digest',
  'secret',
  'token',
]);

function sanitize(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    return data.replace(/([pP]assword|[aA]uthorization)=[^&,\s]+/g, '$1=[REDACTED]');
  }
  if (Array.isArray(data)) return data.map(sanitize);
  if (typeof data === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitize(value);
      }
    }
    return sanitizedObj;
  }
  return data;
}

export const logger = {
  info: (message: string, meta?: any) => {
    const metaStr = meta !== undefined ? ` ${JSON.stringify(sanitize(meta))}` : '';
    console.log(`[INFO] [${new Date().toISOString()}] ${message}${metaStr}`);
  },
  warn: (message: string, meta?: any) => {
    const metaStr = meta !== undefined ? ` ${JSON.stringify(sanitize(meta))}` : '';
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}${metaStr}`);
  },
  error: (message: string, meta?: any) => {
    const metaStr = meta !== undefined ? ` ${JSON.stringify(sanitize(meta))}` : '';
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}${metaStr}`);
  },
};
