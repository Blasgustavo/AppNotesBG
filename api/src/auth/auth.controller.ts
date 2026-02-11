import { Controller, Post, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from '../core/firebase';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/me
   * Valida el token de Firebase y crea o actualiza el usuario en Firestore.
   * El frontend llama este endpoint en cada login.
   */
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: 'Login o registro del usuario autenticado con Firebase' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario devuelto correctamente' })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  async me(@Req() req: AuthenticatedRequest) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown';

    return this.authService.loginOrRegister(req.user, ipAddress);
  }
}
