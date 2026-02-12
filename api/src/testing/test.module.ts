import { Module } from '@nestjs/common';
import { TestingModule } from '../core/testing';
import { TestingController } from './testing.controller';

@Module({
  imports: [TestingModule],
  controllers: [TestingController],
})
export class TestModule {}