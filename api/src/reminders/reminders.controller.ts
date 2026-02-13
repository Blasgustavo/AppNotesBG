import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import {
  CreateReminderDto,
  UpdateReminderDto,
  QueryRemindersDto,
  MarkAsSentDto,
  BatchRemindersDto,
  NotificationPreferencesDto,
} from './dto/reminders.dto';
import { getClientIp } from '../core/request.utils';
import { plainToInstance } from 'class-transformer';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('reminders')
@ApiBearerAuth()
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  /** GET /api/v1/reminders — lista de recordatorios del usuario */
  @Get()
  @ApiOperation({
    summary: 'Listar recordatorios',
    description: 'Obtiene todos los recordatorios del usuario con filtros',
  })
  @ApiQuery({ name: 'status', enum: ['pending', 'sent', 'expired'] })
  @ApiQuery({ name: 'note_id', required: false })
  @ApiQuery({ name: 'include_completed', required: false })
  @ApiQuery({ name: 'only_expired', required: false })
  @ApiQuery({
    name: 'time_filter',
    enum: ['past', 'upcoming', 'today', 'custom'],
  })
  @ApiQuery({
    name: 'sort_order',
    enum: ['reminder_at', 'created_at', 'message', 'updated_at'],
  })
  @ApiQuery({ name: 'sort_direction', enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, description: 'Lista de recordatorios' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(
    @Query() query: QueryRemindersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.remindersService.findAll(req.user.uid);
  }

  /** GET /api/v1/reminders/:id — obtener recordatorio específico */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener recordatorio específico',
    description: 'Retorna los detalles de un recordatorio',
  })
  @ApiParam({ name: 'id', description: 'ID del recordatorio' })
  @ApiResponse({ status: 200, description: 'Detalles del recordatorio' })
  @ApiResponse({ status: 404, description: 'Recordatorio no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.remindersService.findOne(id, req.user.uid);
  }

  /** POST /api/v1/reminders — crear nuevo recordatorio */
  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo recordatorio',
    description: 'Crea un nuevo recordatorio para una nota',
  })
  @ApiResponse({ status: 201, description: 'Recordatorio creado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o límite excedido',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  async create(
    @Body() dto: CreateReminderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.remindersService.create(
      req.user.uid,
      dto.note_id,
      dto,
      getClientIp(req),
    );
  }

  /** PATCH /api/v1/reminders/:id — actualizar recordatorio */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un recordatorio existente',
    description: 'Modifica un recordatorio existente',
  })
  @ApiParam({ name: 'id', description: 'ID del recordatorio' })
  @ApiResponse({
    status: 200,
    description: 'Recordatorio actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Recordatorio no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.remindersService.update(
      id,
      req.user.uid,
      dto,
      getClientIp(req),
    );
  }

  /** DELETE /api/v1/reminders/:id — eliminar recordatorio */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un recordatorio',
    description: 'Elimina permanentemente un recordatorio',
  })
  @ApiParam({ name: 'id', description: 'ID del recordatorio' })
  @ApiResponse({
    status: 204,
    description: 'Recordatorio eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Recordatorio no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar un recordatorio ya enviado',
  })
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.remindersService.remove(id, req.user.uid);
  }

  /** POST /api/v1/reminders/:id/mark-sent — marcar como enviado */
  @Post(':id/mark-sent')
  @ApiOperation({
    summary: 'Marcar recordatorio como enviado',
    description:
      'Marca un recordatorio como enviado y programa el siguiente si es recurrente',
  })
  @ApiParam({ name: 'id', description: 'ID del recordatorio' })
  @ApiResponse({
    status: 200,
    description: 'Recordatorio marcado como enviado',
  })
  @ApiResponse({ status: 404, description: 'Recordatorio no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async markAsSent(
    @Param('id') id: string,
    @Body() dto: MarkAsSentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.remindersService.markAsSent(id, req.user.uid);
    return { message: 'Reminder marked as sent' };
  }

  /** GET /api/v1/reminders/by-status — listar por estado (pending/sent/expired) */
  @Get('by-status')
  @ApiOperation({
    summary: 'Obtener mis recordatorios expirados',
    description:
      'Retorna recordatorios expirados del usuario autenticado (no enviados)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recordatorios expirados del usuario',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getExpired(@Req() req: AuthenticatedRequest) {
    // Solo retorna recordatorios del usuario autenticado — nunca datos de otros usuarios
    return this.remindersService.findExpired(req.user.uid);
  }

  /** GET /api/v1/reminders/pending — recordatorios pendientes del usuario autenticado */
  @Get('pending-list')
  @ApiOperation({
    summary: 'Obtener mis recordatorios pendientes',
    description: 'Retorna recordatorios pendientes del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Recordatorios pendientes del usuario',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getPending(@Req() req: AuthenticatedRequest) {
    // Solo retorna recordatorios del usuario autenticado — nunca datos de otros usuarios
    return this.remindersService.findPendingByUser(req.user.uid);
  }

  /** POST /api/v1/reminders/batch — operaciones batch */
  @Post('batch')
  @ApiOperation({
    summary: 'Operaciones batch con recordatorios',
    description: 'Operaciones múltiples sobre recordatorios',
  })
  @ApiResponse({ status: 200, description: 'Operaciones batch completadas' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async batchOperations(
    @Body() dto: BatchRemindersDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const results: any[] = [];

    for (const action of dto.actions || []) {
      const { type, reminder_id, data } = action;

      switch (type) {
        case 'mark_sent':
          if (reminder_id) {
            await this.remindersService.markAsSent(reminder_id, req.user.uid);
            results.push({ success: true, type: 'mark_sent', reminder_id });
          }
          break;
        case 'delete':
          if (reminder_id) {
            await this.remindersService.remove(reminder_id, req.user.uid);
            results.push({ success: true, type: 'delete', reminder_id });
          }
          break;
        case 'update':
          if (reminder_id && data) {
            // M-8: Validar data contra UpdateReminderDto antes de pasar al service
            const validatedData = plainToInstance(UpdateReminderDto, data);
            await this.remindersService.update(
              reminder_id,
              req.user.uid,
              validatedData,
              getClientIp(req),
            );
            results.push({ success: true, type: 'update', reminder_id });
          }
          break;
        case 'mark_complete':
          if (reminder_id) {
            await this.remindersService.markAsSent(reminder_id, req.user.uid);
            results.push({ success: true, type: 'mark_complete', reminder_id });
          }
          break;
        case 'reactivate':
          if (reminder_id) {
            await this.remindersService.update(
              reminder_id,
              req.user.uid,
              {
                is_sent: false,
                repeat_count_completed: 0,
              },
              getClientIp(req),
            );
            results.push({ success: true, type: 'reactivate', reminder_id });
          }
          break;
      }
    }

    return { processed: results.length, results };
  }

  /** GET /api/v1/reminders/preferences — obtener preferencias de notificación */
  @Get('user-preferences')
  @ApiOperation({
    summary: 'Obtener preferencias de notificación',
    description: 'Retorna las preferencias de notificación del usuario',
  })
  @ApiResponse({ status: 200, description: 'Preferencias de notificación' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getPreferences(@Req() req: AuthenticatedRequest) {
    // Implementar lógica para obtener preferencias del usuario
    return {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      notification_sound: 'default',
      notification_advance_minutes: 30,
    };
  }

  /** PATCH /api/v1/reminders/preferences — actualizar preferencias */
  @Patch('preferences')
  @ApiOperation({
    summary: 'Actualizar preferencias de notificación',
    description: 'Actualiza las preferencias de notificación del usuario',
  })
  @ApiResponse({ status: 200, description: 'Preferencias actualizadas' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async updatePreferences(
    @Body() dto: NotificationPreferencesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.remindersService.updatePreferences(req.user.uid, dto);
    return { message: 'Preferences updated successfully' };
  }

  /** GET /api/v1/reminders/stats — estadísticas de recordatorios */
  @Get('user-stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de recordatorios',
    description: 'Retorna métricas sobre los recordatorios del usuario',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas de recordatorios' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getStats(@Req() req: AuthenticatedRequest) {
    // Implementar lógica para obtener estadísticas
    const stats = await this.remindersService.getStats(req.user.uid);

    return {
      total: stats.total,
      pending: stats.pending,
      sent: stats.sent,
      expired: stats.expired,
      completion_rate: stats.completion_rate,
      popular_repeat_types: stats.popular_repeat_types,
      average_advance_notice: stats.average_advance_notice,
    };
  }
}
