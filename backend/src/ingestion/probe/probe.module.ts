import { Module } from '@nestjs/common';
import { ApiFootballModule } from '../api-football/api-football.module.js';
import { ProbeService } from './probe.service.js';

/** PrismaModule 은 @Global 이라 여기서 import 하지 않는다 */
@Module({
  imports: [ApiFootballModule],
  providers: [ProbeService],
  exports: [ProbeService],
})
export class ProbeModule {}
