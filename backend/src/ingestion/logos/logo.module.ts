import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { LogoService } from './logo.service.js';

@Module({
  imports: [PrismaModule],
  providers: [LogoService],
  exports: [LogoService],
})
export class LogoModule {}
