import { Module } from '@nestjs/common';
import { CredentialsWorker } from './credentials.worker';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ComplianceController],
  providers: [CredentialsWorker, ComplianceService],
  exports: [CredentialsWorker, ComplianceService],
})
export class ComplianceModule {}
