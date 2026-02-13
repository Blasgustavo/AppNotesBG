import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import type { AuthenticatedRequest } from './firebase-auth.guard';

@Injectable()
export class ThrottlerGuardByUser extends ThrottlerGuard {
  private readonly logger = new Logger(ThrottlerGuardByUser.name);

  protected getTracker(req: Request): Promise<string> {
    const userId = (req as AuthenticatedRequest).user?.uid;
    if (userId) {
      return Promise.resolve(`user:${userId}`);
    }
    return super.getTracker(req);
  }
}
