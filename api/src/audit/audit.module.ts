import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { FirestoreModule } from '../core/firestore';

@Module({
  imports: [FirestoreModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
