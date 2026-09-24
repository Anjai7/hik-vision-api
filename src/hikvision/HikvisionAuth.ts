import * as crypto from 'crypto';
import { DigestChallenge } from './types';

export class HikvisionAuth {
  private ncCount = 0;
  private currentChallenge: DigestChallenge | null = null;

  public parseChallenge(header: string): DigestChallenge | null {
    if (!header || !header.toLowerCase().startsWith('digest ')) {
      return null;
    }

    const challengeStr = header.substring(7);
    const challenge: Record<string, string> = {};

    const regex = /([a-zA-Z0-9_-]+)=(?:"([^"]*)"|([^,\s]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(challengeStr)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2] !== undefined ? match[2] : match[3];
      challenge[key] = value;
    }

    if (!challenge.realm || !challenge.nonce) {
      return null;
    }

    this.currentChallenge = {
      realm: challenge.realm,
      nonce: challenge.nonce,
      qop: challenge.qop,
      opaque: challenge.opaque,
      algorithm: challenge.algorithm || 'MD5',
      stale: challenge.stale?.toLowerCase() === 'true',
    };

    this.ncCount = 0;
    return this.currentChallenge;
  }

  public getChallenge(): DigestChallenge | null {
    return this.currentChallenge;
  }

  public resetChallenge(): void {
    this.currentChallenge = null;
    this.ncCount = 0;
  }

  public generateAuthorizationHeader(
    method: string,
    uri: string,
    username: string,
    password: string,
    challenge?: DigestChallenge
  ): string {
    const chal = challenge || this.currentChallenge;
    if (!chal) {
      throw new Error('No digest challenge available to generate Authorization header');
    }

    this.ncCount += 1;
    const nc = this.ncCount.toString(16).padStart(8, '0');
    const cnonce = crypto.randomBytes(16).toString('hex');

    const ha1 = crypto
      .createHash('md5')
      .update(`${username}:${chal.realm}:${password}`)
      .digest('hex');

    const ha2 = crypto
      .createHash('md5')
      .update(`${method.toUpperCase()}:${uri}`)
      .digest('hex');

    let response: string;
    const qop = chal.qop ? chal.qop.split(',')[0].trim() : undefined;

    if (qop) {
      response = crypto
        .createHash('md5')
        .update(`${ha1}:${chal.nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
        .digest('hex');
    } else {
      response = crypto
        .createHash('md5')
        .update(`${ha1}:${chal.nonce}:${ha2}`)
        .digest('hex');
    }

    const authFields: string[] = [
      `username="${username}"`,
      `realm="${chal.realm}"`,
      `nonce="${chal.nonce}"`,
      `uri="${uri}"`,
      `cnonce="${cnonce}"`,
      `nc=${nc}`,
      `response="${response}"`,
    ];

    if (qop) {
      authFields.push(`qop="${qop}"`);
    }

    if (chal.opaque && chal.opaque !== '""' && chal.opaque.trim() !== '') {
      authFields.push(`opaque="${chal.opaque.replace(/^"|"$/g, '')}"`);
    }

    return `Digest ${authFields.join(',')}`;
  }
}
