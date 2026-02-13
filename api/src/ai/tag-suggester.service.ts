import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TipTapService } from '../core/tiptap';
import type { TipTapDocument } from '../../../shared/types/tiptap.types';

@Injectable()
export class TagSuggesterService {
  private readonly logger = new Logger(TagSuggesterService.name);
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly model: any = null;
  private readonly maxTags = 10;
  private readonly enabled: boolean = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly tipTap: TipTapService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
        });
        this.enabled = true;
        this.logger.log('Gemini tag suggester initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize Gemini:', error);
      }
    } else {
      this.logger.warn('GEMINI_API_KEY not set, AI features disabled');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async suggestTags(
    content: TipTapDocument,
    existingTags: string[] = [],
  ): Promise<{
    suggestedTags: Array<{ tag: string; confidence: number; reason: string }>;
    generatedAt: string;
  }> {
    if (!this.enabled || !this.model) {
      throw new HttpException(
        'AI tag suggestions are not available. Please configure GEMINI_API_KEY.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const plainText = this.tipTap.extractPlainText(content);

    if (!plainText || plainText.trim().length < 30) {
      throw new HttpException(
        'Content too short to suggest tags (minimum 30 characters)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingTagsStr =
      existingTags.length > 0
        ? `Existing tags to avoid duplicating: ${existingTags.join(', ')}`
        : '';

    const prompt = `
You are an AI assistant that suggests relevant tags for notes in the AppNotesBG application.

Analyze the content and suggest up to ${this.maxTags} relevant tags.
Consider:
- Main topics and themes
- Categories that would help organize the note
- Keywords that describe the content
- Avoid duplicating existing tags

${existingTagsStr}

Content to analyze:
${plainText.substring(0, 8000)}

Respond in JSON format:
{
  "tags": [
    { "tag": "tagname", "confidence": 0.95, "reason": "brief explanation" }
  ]
}
`.trim();

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const suggestedTags = (parsed.tags || [])
        .filter((t: any) => t.tag && !existingTags.includes(t.tag))
        .slice(0, this.maxTags)
        .map((t: any) => ({
          tag: t.tag.toLowerCase().replace(/\s+/g, '-'),
          confidence: Math.min(Math.max(t.confidence || 0.5, 0), 1),
          reason: t.reason || '',
        }));

      return {
        suggestedTags,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to suggest tags:', error);
      throw new HttpException(
        'Failed to suggest tags. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
