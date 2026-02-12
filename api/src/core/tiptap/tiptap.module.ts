import { Module } from '@nestjs/common';
import { TipTapService } from './tiptap.service';

@Module({
  providers: [TipTapService],
  exports: [TipTapService],
})
export class TipTapModule {}
