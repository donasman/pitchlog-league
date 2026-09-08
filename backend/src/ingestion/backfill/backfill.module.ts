import { Module } from '@nestjs/common';
import { BackfillJobService } from './backfill-job.service.js';

/** PrismaModule 은 @Global 이라 여기서 import 하지 않는다 */
@Module({
  providers: [BackfillJobService],
  exports: [BackfillJobService],
})
export class BackfillModule {}
