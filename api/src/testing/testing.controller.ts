import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { PerformanceTestingService } from '../core/testing/performance-testing.service';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('testing')
@ApiBearerAuth()
@Controller('testing')
export class TestingController {
  constructor(private readonly performanceService: PerformanceTestingService) {}

  private ip(req: AuthenticatedRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown'
    );
  }

  /** POST /api/v1/testing/performance — ejecutar tests de rendimiento */
  @Post('performance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar tests de rendimiento de Firestore',
    description:
      'Mide el rendimiento de queries críticas antes y después de índices',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultados de tests de rendimiento',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Endpoint solo para desarrollo' })
  async runPerformanceTests(@Req() req: AuthenticatedRequest) {
    // Solo permitir en entorno de desarrollo
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Performance testing only available in development');
    }

    return this.performanceService.runPerformanceTests(req.user.uid);
  }

  /** GET /api/v1/testing/indexes-status — verificar estado de índices */
  @Get('indexes-status')
  @ApiOperation({
    summary: 'Verificar estado de índices Firestore',
    description: 'Verifica qué índices están disponibles y su estado',
  })
  @ApiResponse({ status: 200, description: 'Estado de los índices' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getIndexesStatus(@Req() req: AuthenticatedRequest) {
    // Esta implementación requeriría Firebase Admin SDK para listar índices
    // Por ahora retornamos información básica
    return {
      message: 'Indexes status check',
      environment: process.env.NODE_ENV,
      projectId: process.env.FIREBASE_PROJECT_ID || 'appnotesbg-app',
      requiredIndexes: [
        'user_id+updated_at',
        'user_id+tags+updated_at',
        'user_id+is_pinned+updated_at',
        'notebook_id+updated_at',
        'user_id+sync_status',
        'user_id+word_count',
        'user_id+is_template',
        'sharing.public_slug+sharing.public_access_expires',
        'note_id+version',
        'user_id+timestamp (note_history)',
        'resource_type+resource_id+timestamp (audit_logs)',
        'user_id+created_at (attachments)',
        'file_hash (attachments)',
        'note_id+created_at (attachments)',
        'user_id+parent_notebook_id (notebooks)',
        'user_id+is_favorite+sort_order (notebooks)',
        'invited_email+status (invitations)',
        'invitation_token (invitations)',
        'expires_at (invitations)',
      ],
      note: 'Use Firebase Console or gcloud CLI to verify actual index status',
    };
  }
}
