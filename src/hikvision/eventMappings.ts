export interface EventCodeDefinition {
  major: number;
  minor: number;
  category: string;
  description: string;
  verified: boolean;
}

export const KNOWN_EVENT_CODES: Record<string, EventCodeDefinition> = {
  '5:38': {
    major: 5,
    minor: 38,
    category: 'Access Control',
    description: 'Authentication Passed / Access Granted',
    verified: true,
  },
  '5:39': {
    major: 5,
    minor: 39,
    category: 'Access Control',
    description: 'Authentication Failed / Access Denied',
    verified: true,
  },
  '5:21': {
    major: 5,
    minor: 21,
    category: 'Access Control',
    description: 'Door Unlocked',
    verified: true,
  },
  '5:22': {
    major: 5,
    minor: 22,
    category: 'Access Control',
    description: 'Door Locked',
    verified: true,
  },
  '5:1': {
    major: 5,
    minor: 1,
    category: 'Access Control',
    description: 'Door Unlocked',
    verified: true,
  },
  '5:2': {
    major: 5,
    minor: 2,
    category: 'Access Control',
    description: 'Door Locked',
    verified: true,
  },
  '5:75': {
    major: 5,
    minor: 75,
    category: 'Access Control',
    description: 'Face Verification Passed',
    verified: true,
  },
  '5:76': {
    major: 5,
    minor: 76,
    category: 'Access Control',
    description: 'Face Verification Failed',
    verified: true,
  },
};

export function getNeutralEventDescription(major: number, minor: number, verifyMode?: string): {
  category: string;
  description: string;
  verifyModeLabel: string;
  codeDisplay: string;
} {
  const key = `${major}:${minor}`;
  const known = KNOWN_EVENT_CODES[key];

  const category = known ? known.category : major === 5 ? 'Access Control' : `Major ${major}`;
  const description = known ? known.description : `Raw Event (Major: ${major}, Minor: ${minor})`;

  const verifyModeMap: Record<string, string> = {
    faceOrFpOrCardOrPw: 'Face / Fingerprint / Card / Password',
    fp: 'Fingerprint',
    face: 'Face',
    card: 'Card',
    pw: 'Password',
    faceAndFp: 'Face + Fingerprint',
    cardAndFp: 'Card + Fingerprint',
    invalid: 'System / Device',
  };

  const verifyModeLabel = verifyMode ? verifyModeMap[verifyMode] || verifyMode : 'Unspecified';

  return {
    category,
    description,
    verifyModeLabel,
    codeDisplay: `[${major}, ${minor}]`,
  };
}
