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
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { ThemesService } from './themes.service';
import {
  CreateThemeDto,
  UpdateThemeDto,
  QueryThemesDto,
  ApplyThemeDto,
  ThemePreviewDto,
  CloneThemeDto,
  ThemeExportDto,
  ThemeImportDto,
  ThemeShareDto,
} from './dto/theme.dto';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('themes')
@ApiBearerAuth()
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  private ip(req: AuthenticatedRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown'
    );
  }

  /** GET /api/v1/themes — lista de temas del usuario */
  @Get()
  @ApiOperation({
    summary: 'Listar temas personalizados',
    description: 'Obtiene todos los temas del usuario con filtros y paginación',
  })
  @ApiQuery({
    name: 'display_mode',
    required: false,
    enum: ['dark', 'light', 'auto', 'all'],
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiQuery({ name: 'is_public', required: false })
  @ApiQuery({ name: 'is_default', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiResponse({ status: 200, description: 'Lista de temas' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async findAll(
    @Query() query: QueryThemesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.themesService.findAll(req.user.uid, query);
  }

  /** GET /api/v1/themes/:id — obtener tema específico */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener información de un tema',
    description: 'Retorna los detalles completos de un tema específico',
  })
  @ApiParam({ name: 'id', description: 'ID del tema' })
  @ApiResponse({ status: 200, description: 'Detalles del tema' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.themesService.findOne(id, req.user.uid);
  }

  /** POST /api/v1/themes — crear nuevo tema */
  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo tema personalizado',
    description: 'Crea un nuevo tema con colores, fuentes, espaciado, etc.',
  })
  @ApiResponse({ status: 201, description: 'Tema creado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o límite excedido',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async create(@Body() dto: CreateThemeDto, @Req() req: AuthenticatedRequest) {
    return this.themesService.create(req.user.uid, dto, this.ip(req));
  }

  /** PATCH /api/v1/themes/:id — actualizar tema */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un tema existente',
    description: 'Modifica propiedades de un tema existente',
  })
  @ApiParam({ name: 'id', description: 'ID del tema' })
  @ApiResponse({ status: 200, description: 'Tema actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateThemeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.themesService.update(id, req.user.uid, dto, this.ip(req));
  }

  /** POST /api/v1/themes/apply — aplicar tema */
  @Post('apply')
  @ApiOperation({
    summary: 'Aplicar un tema',
    description: 'Aplica un tema a una nota, libreta o globalmente',
  })
  @ApiResponse({ status: 200, description: 'Tema aplicado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async applyTheme(
    @Body() dto: ApplyThemeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.themesService.applyTheme(req.user.uid, dto, this.ip(req));
    return { message: 'Theme applied successfully' };
  }

  /** GET /api/v1/themes/:id/preview — generar preview */
  @Get(':id/preview')
  @ApiOperation({
    summary: 'Generar preview de un tema',
    description: 'Genera una vista previa del tema en formato CSS o JSON',
  })
  @ApiParam({ name: 'id', description: 'ID del tema' })
  @ApiQuery({
    name: 'format',
    enum: ['css', 'json'],
    description: 'Formato del preview',
  })
  @ApiQuery({
    name: 'note_id',
    required: false,
    description: 'ID de nota para preview específico',
  })
  @ApiResponse({ status: 200, description: 'Preview generado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async getPreview(
    @Param('id') id: string,
    @Query() dto: ThemePreviewDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.themesService.getPreview(id, req.user.uid, dto);
  }

  /** POST /api/v1/themes/clone — clonar tema */
  @Post('clone')
  @ApiOperation({
    summary: 'Clonar un tema existente',
    description: 'Crea una copia de un tema existente para personalizar',
  })
  @ApiResponse({ status: 201, description: 'Tema clonado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tema original no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado al tema' })
  @ApiResponse({ status: 400, description: 'Límite de temas excedido' })
  async cloneTheme(
    @Body() dto: CloneThemeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.themesService.cloneTheme(req.user.uid, dto, this.ip(req));
  }

  /** DELETE /api/v1/themes/:id — eliminar tema */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un tema personalizado',
    description: 'Elimina permanentemente un tema personalizado',
  })
  @ApiParam({ name: 'id', description: 'ID del tema' })
  @ApiResponse({ status: 204, description: 'Tema eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado' })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  @ApiResponse({
    status: 400,
    description: 'No se pueden eliminar temas por defecto',
  })
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return this.themesService.remove(id, req.user.uid);
  }

  /** GET /api/v1/themes/default — temas por defecto */
  @Get('default')
  @ApiOperation({
    summary: 'Obtener temas por defecto',
    description: 'Retorna los temas predefinidos del sistema',
  })
  @ApiResponse({ status: 200, description: 'Temas por defecto del sistema' })
  async getDefaultThemes() {
    // Aquí se implementaría la lógica para retornar temas predefinidos
    // Por ahora retornamos un placeholder
    return {
      themes: [
        {
          id: 'default-light',
          name: 'Default Light',
          description: 'Claro tema claro del sistema',
          is_default: true,
          is_public: true,
          category: 'system',
          display_mode: 'light',
        },
        {
          id: 'default-dark',
          name: 'Default Dark',
          description: 'Tema oscuro del sistema',
          is_default: true,
          is_public: true,
          category: 'system',
          display_mode: 'dark',
        },
      ],
    };
  }

  /** GET /api/v1/themes/export — exportar temas */
  @Get('export')
  @ApiOperation({
    summary: 'Exportar temas',
    description: 'Exporta temas en formato JSON o CSS',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'css'],
    description: 'Formato de exportación',
  })
  @ApiQuery({
    name: 'theme_ids',
    required: false,
    description: 'IDs de temas específicos a exportar',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Categoría de temas a exportar',
  })
  @ApiResponse({ status: 200, description: 'Temas exportados exitosamente' })
  async exportThemes(
    @Query() dto: ThemeExportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Implementar lógica de exportación de temas
    const themes = await this.themesService.findAll(req.user.uid, {
      category: dto.category,
    });

    const exportData = {
      format: dto.format,
      themes: themes,
      exported_at: new Date().toISOString(),
      exported_by: req.user.uid,
    };

    return exportData;
  }

  /** POST /api/v1/themes/import — importar tema */
  @Post('import')
  @ApiOperation({
    summary: 'Importar un tema',
    description: 'Importa un tema desde formato JSON o CSS',
  })
  @ApiResponse({ status: 201, description: 'Tema importado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Formato inválido o tema duplicado',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async importTheme(
    @Body() dto: ThemeImportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Lógica de importación de tema - pendiente de implementar
    return {
      message: 'Theme import functionality is pending implementation',
      theme_id: 'pending',
      format: dto.format,
    };
  }

  /** POST /api/v1/themes/share — compartir tema */
  @Post('share')
  @ApiOperation({
    summary: 'Compartir un tema',
    description: 'Genera un enlace para compartir un tema público',
  })
  @ApiResponse({ status: 201, description: 'Tema compartido exitosamente' })
  @ApiResponse({ status: 404, description: 'Tema no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'No se puede compartir tema privado',
  })
  async shareTheme(
    @Body() dto: ThemeShareDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Lógica de compartir tema - pendiente de implementar
    return {
      message: 'Theme sharing functionality is pending implementation',
      theme_id: dto.theme_id,
      share_url: `https://appnotesbg.app/themes/${dto.theme_id}`,
    };
  }
}
