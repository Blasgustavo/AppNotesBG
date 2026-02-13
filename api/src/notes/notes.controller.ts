import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { NotesService } from './notes.service';
import {
  CreateNoteDto,
  UpdateNoteDto,
  QueryNotesDto,
  RestoreVersionDto,
} from './dto/create-note.dto';
import { getClientIp, getUserAgent } from '../core/request.utils';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('notes')
@ApiBearerAuth()
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /** GET /api/v1/notes — lista notas con filtros y paginación */
  @Get()
  @ApiOperation({
    summary: 'Listar notas del usuario (con filtros y paginación)',
  })
  @ApiQuery({ name: 'notebook_id', required: false })
  @ApiQuery({ name: 'is_pinned', required: false, type: Boolean })
  @ApiQuery({ name: 'archived', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, description: 'Lista de notas' })
  findAll(@Query() query: QueryNotesDto, @Req() req: AuthenticatedRequest) {
    return this.notesService.findAll(req.user.uid, query);
  }

  /** GET /api/v1/notes/:id — obtiene una nota por ID */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una nota por ID' })
  @ApiParam({ name: 'id', description: 'ID de la nota' })
  @ApiResponse({ status: 200, description: 'Nota encontrada' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada o eliminada' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notesService.findOne(id, req.user.uid);
  }

  /** POST /api/v1/notes — crea una nota */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva nota' })
  @ApiResponse({
    status: 201,
    description: 'Nota creada con snapshot v1 en historial',
  })
  create(@Body() dto: CreateNoteDto, @Req() req: AuthenticatedRequest) {
    return this.notesService.create(
      req.user.uid,
      dto,
      getClientIp(req),
      getUserAgent(req),
    );
  }

  /** PATCH /api/v1/notes/:id — actualiza una nota */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar contenido, título, tags o estilo de una nota',
  })
  @ApiParam({ name: 'id', description: 'ID de la nota' })
  @ApiResponse({
    status: 200,
    description: 'Nota actualizada con nueva versión en historial',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notesService.update(
      id,
      req.user.uid,
      dto,
      getClientIp(req),
      getUserAgent(req),
    );
  }

  /** DELETE /api/v1/notes/:id — soft delete */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar nota (soft delete — se mueve a la papelera)',
  })
  @ApiParam({ name: 'id', description: 'ID de la nota' })
  @ApiResponse({ status: 204, description: 'Nota eliminada (soft delete)' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notesService.softDelete(
      id,
      req.user.uid,
      getClientIp(req),
      getUserAgent(req),
    );
  }

  /** PATCH /api/v1/notes/:id/archive — alterna archivado */
  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archivar o desarchivar una nota' })
  @ApiParam({ name: 'id', description: 'ID de la nota' })
  @ApiResponse({ status: 200, description: 'Estado de archivado alternado' })
  archive(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notesService.toggleArchive(id, req.user.uid);
  }

  /** GET /api/v1/notes/:id/history — historial de versiones */
  @Get(':id/history')
  @ApiOperation({ summary: 'Obtener historial de versiones de una nota' })
  @ApiParam({ name: 'id', description: 'ID de la nota' })
  @ApiResponse({
    status: 200,
    description: 'Lista de versiones (sin snapshot completo)',
  })
  getHistory(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notesService.getHistory(id, req.user.uid);
  }

  /** POST /api/v1/notes/:id/history/restore — restaura una versión */
  @Post(':id/history/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restaurar una versión anterior de la nota' })
  @ApiParam({ name: 'id', description: 'ID de la nota' })
  @ApiResponse({
    status: 200,
    description: 'Nota restaurada a la versión especificada',
  })
  restore(
    @Param('id') id: string,
    @Body() dto: RestoreVersionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notesService.restoreVersion(
      id,
      req.user.uid,
      dto.version,
      getClientIp(req),
      getUserAgent(req),
    );
  }
}
