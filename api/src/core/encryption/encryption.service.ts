import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  scryptSync,
} from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface EncryptedData {
  iv: string;
  encryptedData: string;
  authTag: string;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly saltLength = 32;

  constructor(private readonly configService: ConfigService) {
    const masterKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY');
    if (!masterKey) {
      this.logger.warn(
        'ENCRYPTION_MASTER_KEY not set, using default (NOT FOR PRODUCTION)',
      );
      this.key = scryptSync(
        'appnotesbg-default-key-do-not-use-in-prod',
        'salt',
        32,
      );
    } else {
      this.key = createHash('sha256').update(masterKey).digest();
    }
  }

  onModuleInit() {
    this.logger.log('EncryptionService initialized');
  }

  encrypt(plaintext: string): EncryptedData {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex'),
    };
  }

  decrypt(encryptedData: EncryptedData): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  encryptWithUserKey(plaintext: string, userKey: string): EncryptedData {
    const salt = randomBytes(this.saltLength);
    const key = scryptSync(userKey, salt, 32);
    const iv = randomBytes(this.ivLength);

    const cipher = createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex'),
    };
  }

  decryptWithUserKey(encryptedData: EncryptedData, userKey: string): string {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const salt = Buffer.from(
      encryptedData.encryptedData.substring(0, 64),
      'hex',
    );
    const key = scryptSync(userKey, salt, 32);

    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const encryptedText = encryptedData.encryptedData.substring(64);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }
}
