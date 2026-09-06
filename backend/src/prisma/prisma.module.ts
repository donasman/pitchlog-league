import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { IntegrityService } from './integrity.service.js';

@Global()
@Module({
  providers: [PrismaService, IntegrityService],
  exports: [PrismaService, IntegrityService],
})
export class PrismaModule {}
