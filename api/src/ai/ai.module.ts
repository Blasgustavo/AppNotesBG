import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { SummarizerService } from './summarizer.service';
import { TagSuggesterService } from './tag-suggester.service';
import { TipTapModule } from '../core/tiptap';

@Module({
  imports: [TipTapModule],
  controllers: [AIController],
  providers: [SummarizerService, TagSuggesterService],
  exports: [SummarizerService, TagSuggesterService],
})
export class AIModule {}
