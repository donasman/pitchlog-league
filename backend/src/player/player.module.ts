import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module.js';
import { PlayerController } from './player.controller.js';
import { PlayerService } from './player.service.js';

@Module({ imports: [TeamModule], controllers: [PlayerController], providers: [PlayerService], exports: [PlayerService] })
export class PlayerModule {}
