import {
  Controller,
  Get,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /api/v1/audit/export
   * Exporta logs de auditoría para compliance.
   * Formato: JSON por defecto, CSV opcional.
   */
  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exportar logs de auditoría para compliance',
  })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'start_date', required: false })
  @ApiQuery({ name: 'end_date', required: false })
  @ApiResponse({
    status: 200,
    description: 'Logs de auditoría exportados',
  })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async export(
    @Query('format') format: 'json' | 'csv' = 'json',
    @Query('limit') limit?: number,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Req() req?: AuthenticatedRequest,
  ) {
    return this.auditService.exportLogs(
      req?.user?.uid,
      format,
      limit,
      startDate,
      endDate,
    );
  }
}
