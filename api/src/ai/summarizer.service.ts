import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TipTapService } from '../core/tiptap';
import type { TipTapDocument } from '../../../shared/types/tiptap.types';

@Injectable()
export class SummarizerService {
  private readonly logger = new Logger(SummarizerService.name);
  private readonly genAI: GoogleGenerativeAI | null = null;
  private readonly model: any = null;
  private readonly maxSummaryLength = 300;
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
        this.logger.log('Gemini summarizer initialized');
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

  async summarizeNote(
    content: TipTapDocument,
    options?: {
      maxLength?: number;
      style?: 'brief' | 'detailed' | 'bullet';
    },
  ): Promise<{
    summary: string;
    keyPoints: string[];
    wordCount: number;
    generatedAt: string;
  }> {
    if (!this.enabled || !this.model) {
      throw new HttpException(
        'AI summarization is not available. Please configure GEMINI_API_KEY.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const plainText = this.tipTap.extractPlainText(content);

    if (!plainText || plainText.trim().length < 50) {
      throw new HttpException(
        'Content too short to summarize (minimum 50 characters)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const maxLength = options?.maxLength || this.maxSummaryLength;
    const style = options?.style || 'brief';

    const styleInstructions = {
      brief: 'Provide a brief 2-3 sentence summary.',
      detailed: 'Provide a comprehensive summary with main ideas.',
      bullet: 'Provide key points as a bullet list.',
    };

    const prompt = `
You are an AI assistant that summarizes notes for the AppNotesBG application.

${styleInstructions[style]}

Content to summarize:
${plainText.substring(0, 8000)}

Respond in JSON format:
{
  "summary": "...",
  "keyPoints": ["point1", "point2", "point3"],
  "wordCount": number
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

      return {
        summary: parsed.summary?.substring(0, maxLength) || '',
        keyPoints: parsed.keyPoints || [],
        wordCount: parsed.wordCount || plainText.split(/\s+/).length,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to generate summary:', error);
      throw new HttpException(
        'Failed to generate summary. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
