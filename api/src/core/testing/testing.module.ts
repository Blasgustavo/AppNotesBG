import { Module } from '@nestjs/common';
import { FirestoreModule } from '../firestore';
import { PerformanceTestingService } from './performance-testing.service';

@Module({
  imports: [FirestoreModule],
  controllers: [],
  providers: [PerformanceTestingService],
  exports: [PerformanceTestingService],
})
export class TestingModule {}