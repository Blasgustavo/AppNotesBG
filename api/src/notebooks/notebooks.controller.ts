import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
} from '@nestjs/swagger';
import { NotebooksService } from './notebooks.service';
import { CreateNotebookDto, UpdateNotebookDto } from './dto/notebook.dto';
import { getClientIp } from '../core/request.utils';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('notebooks')
@ApiBearerAuth()
@Controller('notebooks')
export class NotebooksController {
  constructor(private readonly notebooksService: NotebooksService) {}

  /** GET /api/v1/notebooks — lista libretas del usuario autenticado */
  @Get()
  @ApiOperation({ summary: 'Listar todas las libretas del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de libretas' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.notebooksService.findAll(req.user.uid);
  }

  /** GET /api/v1/notebooks/:id — obtiene una libreta por ID */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una libreta por ID' })
  @ApiParam({ name: 'id', description: 'ID de la libreta' })
  @ApiResponse({ status: 200, description: 'Libreta encontrada' })
  @ApiResponse({ status: 404, description: 'Libreta no encontrada' })
  @ApiResponse({ status: 403, description: 'Sin acceso' })
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notebooksService.findOne(id, req.user.uid);
  }

  /** POST /api/v1/notebooks — crea una nueva libreta */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva libreta' })
  @ApiResponse({ status: 201, description: 'Libreta creada' })
  create(@Body() dto: CreateNotebookDto, @Req() req: AuthenticatedRequest) {
    return this.notebooksService.create(req.user.uid, dto, getClientIp(req));
  }

  /** PATCH /api/v1/notebooks/:id — actualiza una libreta */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar nombre, icono, color o favorito' })
  @ApiParam({ name: 'id', description: 'ID de la libreta' })
  @ApiResponse({ status: 200, description: 'Libreta actualizada' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNotebookDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.notebooksService.update(id, req.user.uid, dto, getClientIp(req));
  }

  /** DELETE /api/v1/notebooks/:id — elimina una libreta vacía */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una libreta vacía (sin notas)' })
  @ApiParam({ name: 'id', description: 'ID de la libreta' })
  @ApiResponse({ status: 204, description: 'Libreta eliminada' })
  @ApiResponse({ status: 400, description: 'Libreta por defecto o con notas' })
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notebooksService.remove(id, req.user.uid);
  }
}
