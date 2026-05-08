import { Module } from '@nestjs/common';
import { CredentialsWorker } from './credentials.worker';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CredentialsWorker],
  exports: [CredentialsWorker],
})
export class ComplianceModule {}
