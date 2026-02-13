import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SummarizerService } from './summarizer.service';
import { TagSuggesterService } from './tag-suggester.service';
import type { TipTapDocument } from '../../../shared/types/tiptap.types';

class SummarizeDto {
  @IsString()
  title!: string;

  @IsEnum(['brief', 'detailed', 'bullet'])
  @IsOptional()
  style?: 'brief' | 'detailed' | 'bullet' = 'brief';

  @IsOptional()
  @IsString()
  content_json?: string;
}

class SuggestTagsDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString({ each: true })
  existing_tags?: string[];

  @IsOptional()
  @IsString()
  content_json?: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AIController {
  constructor(
    private readonly summarizerService: SummarizerService,
    private readonly tagSuggesterService: TagSuggesterService,
  ) {}

  /**
   * POST /api/v1/ai/summarize
   * Genera un resumen de la nota usando Google Gemini
   */
  @Post('summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generar resumen de una nota con IA (Gemini)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen generado exitosamente',
  })
  @ApiResponse({ status: 503, description: 'Servicio de IA no disponible' })
  async summarize(@Body() dto: SummarizeDto) {
    if (!dto.content_json) {
      return {
        summary: 'No content provided for summarization',
        keyPoints: [],
        wordCount: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    const content = JSON.parse(dto.content_json) as TipTapDocument;

    return this.summarizerService.summarizeNote(content, {
      style: dto.style,
    });
  }

  /**
   * POST /api/v1/ai/suggest-tags
   * Sugiere etiquetas relevantes para la nota usando Google Gemini
   */
  @Post('suggest-tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sugerir etiquetas para una nota con IA (Gemini)',
  })
  @ApiResponse({
    status: 200,
    description: 'Etiquetas sugeridas generadas exitosamente',
  })
  @ApiResponse({ status: 503, description: 'Servicio de IA no disponible' })
  async suggestTags(@Body() dto: SuggestTagsDto) {
    if (!dto.content_json) {
      return {
        suggestedTags: [],
        generatedAt: new Date().toISOString(),
      };
    }

    const content = JSON.parse(dto.content_json) as TipTapDocument;

    return this.tagSuggesterService.suggestTags(
      content,
      dto.existing_tags || [],
    );
  }
}
