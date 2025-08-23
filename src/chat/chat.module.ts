import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatResolver } from './chat.resolver';
import { GoalsModule } from '../goals/goals.module';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [GoalsModule, OrchestratorModule, LlmModule],
  providers: [ChatService, ChatResolver],
})
export class ChatModule {}
