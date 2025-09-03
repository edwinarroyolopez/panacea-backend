import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { GoalsModule } from '../goals/goals.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { LlmModule } from '../llm/llm.module';
import { PlansModule } from 'src/plans/plans.module';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [GoalsModule, OrchestratorModule, LlmModule, PlansModule, TasksModule],
  providers: [ChatService, ChatResolver],
})
export class ChatModule {}
