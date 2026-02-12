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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService, SearchOptions, SearchResult } from './search.service';
import type { AuthenticatedRequest } from '../core/firebase';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  private ip(req: AuthenticatedRequest): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown'
    );
  }

  /** GET /api/v1/search — búsqueda full-text de notas */
  @Get()
  @ApiOperation({
    summary: 'Buscar notas con texto completo y filtros',
    description:
      'Busca notas usando Algolia con filtros por tags, libreta, etc.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Término de búsqueda' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de resultados (default: 20)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Offset para paginación',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    description: 'Filtrar por tags (separados por coma)',
  })
  @ApiQuery({
    name: 'notebook',
    required: false,
    description: 'Filtrar por nombre de libreta',
  })
  @ApiQuery({
    name: 'pinned',
    required: false,
    type: Boolean,
    description: 'Filtrar por notas fijadas',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultados de búsqueda con highlighting',
  })
  @ApiResponse({ status: 400, description: 'Parámetros inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async search(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('tags') tags?: string,
    @Query('notebook') notebook?: string,
    @Query('pinned') pinned?: string,
  ) {
    const searchOptions: SearchOptions = {
      query: query.trim(),
      userId: req.user.uid,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      tags: tags
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t)
        : undefined,
      notebookId: notebook?.trim() || undefined,
      isPinned: pinned !== undefined ? pinned === 'true' : undefined,
    };

    return this.searchService.searchNotes(searchOptions);
  }

  /** GET /api/v1/search/suggestions — autocompletar para búsqueda */
  @Get('suggestions')
  @ApiOperation({
    summary: 'Obtener sugerencias de autocompletar',
    description: 'Sugerencias basadas en títulos de notas existentes',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Query para sugerencias (mínimo 2 caracteres)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Límite de sugerencias (default: 5)',
  })
  @ApiResponse({ status: 200, description: 'Array de sugerencias' })
  @ApiResponse({ status: 400, description: 'Query demasiado corto' })
  async getSuggestions(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<{ suggestions: string[] }> {
    const suggestions = await this.searchService.getSearchSuggestions(
      req.user.uid,
      query.trim(),
      limit ? parseInt(limit, 10) : undefined,
    );

    return { suggestions };
  }

  /** GET /api/v1/search/stats — estadísticas del índice (admin) */
  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas del índice de búsqueda',
    description: 'Información sobre tamaño y uso del índice Algolia',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas del índice' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getStats(): Promise<any> {
    return this.searchService.getIndexStats();
  }
}
