import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansResolver } from './plans.resolver';

@Module({
  providers: [PlansService, PlansResolver]
})
export class PlansModule {}
