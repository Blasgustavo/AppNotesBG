import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TipTapModule } from '../core/tiptap';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [ConfigModule, TipTapModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
