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
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import {
  CreateAttachmentDto,
  UpdateAttachmentDto,
} from './dto/create-attachment.dto';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  private ip(req: AuthenticatedRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown'
    );
  }

  /** POST /api/v1/attachments — subir archivo */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir un archivo adjunto',
    description:
      'Sube un archivo a Firebase Storage y crea el registro en Firestore',
  })
  @ApiResponse({ status: 201, description: 'Archivo subido exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido o cuota excedida',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 413, description: 'Archivo demasiado grande' })
  async uploadAttachment(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType:
              /(jpeg|jpg|png|gif|webp|pdf|mp3|mpeg|wav|mp4|webm|txt|json)$/,
          }),
        ],
      }),
    )
    file: any,
    @Body() dto: CreateAttachmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.attachmentsService.uploadAttachment(
      req.user.uid,
      dto.note_id,
      file,
      dto,
      this.ip(req),
    );
  }

  /** GET /api/v1/attachments/:id — obtener attachment */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener información de un archivo adjunto',
    description: 'Retorna metadata del archivo, no el contenido',
  })
  @ApiParam({ name: 'id', description: 'ID del attachment' })
  @ApiResponse({ status: 200, description: 'Metadata del attachment' })
  @ApiResponse({ status: 404, description: 'Attachment no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async getAttachment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.attachmentsService.getAttachment(id, req.user.uid);
  }

  /** GET /api/v1/attachments/:id/download — URL de descarga */
  @Get(':id/download')
  @ApiOperation({
    summary: 'Obtener URL de descarga firmada',
    description: 'Genera una URL temporal para descargar el archivo',
  })
  @ApiParam({ name: 'id', description: 'ID del attachment' })
  @ApiResponse({ status: 200, description: 'URL de descarga temporal' })
  @ApiResponse({ status: 404, description: 'Attachment no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async getDownloadUrl(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.attachmentsService.getDownloadUrl(id, req.user.uid);
  }

  /** GET /api/v1/attachments/note/:noteId — listar attachments de una nota */
  @Get('note/:noteId')
  @ApiOperation({
    summary: 'Listar adjuntos de una nota',
    description:
      'Retorna todos los attachments pertenecientes a una nota específica',
  })
  @ApiParam({ name: 'noteId', description: 'ID de la nota' })
  @ApiResponse({ status: 200, description: 'Lista de attachments' })
  @ApiResponse({ status: 404, description: 'Nota no encontrada' })
  @ApiResponse({ status: 403, description: 'Acceso denegado a la nota' })
  async listNoteAttachments(
    @Param('noteId') noteId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.attachmentsService.listNoteAttachments(noteId, req.user.uid);
  }

  /** PATCH /api/v1/attachments/:id — actualizar metadata */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar metadata de un attachment',
    description: 'Actualiza nombre, alt text, virus scan status, etc.',
  })
  @ApiParam({ name: 'id', description: 'ID del attachment' })
  @ApiResponse({ status: 200, description: 'Attachment actualizado' })
  @ApiResponse({ status: 404, description: 'Attachment no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async updateAttachment(
    @Param('id') id: string,
    @Body() dto: UpdateAttachmentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.attachmentsService.updateAttachment(
      id,
      req.user.uid,
      dto,
      this.ip(req),
    );
  }

  /** DELETE /api/v1/attachments/:id — eliminar attachment */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un archivo adjunto',
    description: 'Elimina el archivo de Storage y el registro de Firestore',
  })
  @ApiParam({ name: 'id', description: 'ID del attachment' })
  @ApiResponse({
    status: 204,
    description: 'Attachment eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Attachment no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async deleteAttachment(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.attachmentsService.deleteAttachment(id, req.user.uid);
  }
}
