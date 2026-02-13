import { Controller, Post, Req, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { getClientIp, getUserAgent } from '../core/request.utils';
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
   * Protegido por FirebaseAuthGuard global.
   */
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login o registro del usuario autenticado con Firebase',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario devuelto correctamente',
  })
  @ApiResponse({ status: 401, description: 'Token inválido o expirado' })
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.loginOrRegister(
      req.user,
      getClientIp(req),
      getUserAgent(req),
    );
  }
}
