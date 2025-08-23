import { Module } from '@nestjs/common';
import { GoalsResolver } from './goals.resolver';
import { GoalsService } from './goals.service';
import { FirestoreService } from 'src/firestore/firestore.service';

@Module({
  providers: [GoalsResolver, GoalsService, FirestoreService],
  exports: [GoalsService],
})
export class GoalsModule {}
