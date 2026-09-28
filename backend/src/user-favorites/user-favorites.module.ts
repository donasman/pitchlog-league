import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UserFavoritesController } from './user-favorites.controller.js';
import { UserFavoritesService } from './user-favorites.service.js';

@Module({
  imports: [AuthModule],
  controllers: [UserFavoritesController],
  providers: [UserFavoritesService],
  exports: [UserFavoritesService],
})
export class UserFavoritesModule {}
