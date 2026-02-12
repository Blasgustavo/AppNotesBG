import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as admin from 'firebase-admin';
import { FIREBASE_ADMIN } from './firebase-admin.module';
import { IS_PUBLIC_KEY } from './public.decorator';

// Extiende Request para exponer el usuario decodificado en los controladores
export interface AuthenticatedRequest extends Request {
  user: admin.auth.DecodedIdToken;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_ADMIN) private readonly firebaseApp: admin.app.App,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Rutas marcadas con @Public() se saltan la validación
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const decoded = await this.firebaseApp.auth().verifyIdToken(token);
      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
