import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorResolver } from './orchestrator.resolver';
import { PlansModule } from '../plans/plans.module';
import { TasksModule } from '../tasks/tasks.module';
import { GoalsModule } from '../goals/goals.module';
import { LlmModule } from '../llm/llm.module';
import { PlansService } from 'src/plans/plans.service';
import { TasksService } from 'src/tasks/tasks.service';

@Module({
  imports: [PlansModule, TasksModule, GoalsModule, LlmModule], 
  providers: [OrchestratorService, OrchestratorResolver, PlansService, TasksService],
})
export class OrchestratorModule {}
