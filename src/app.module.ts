import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { FirestoreService } from './firestore/firestore.service';
import { GoalsResolver } from './goals/goals.resolver';
import { GoalsModule } from './goals/goals.module';
import { LlmService } from './llm/llm.service';
import { PlansModule } from './plans/plans.module';
import { TasksModule } from './tasks/tasks.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { LlmModule } from './llm/llm.module';
import { FirestoreModule } from './firestore/firestore.module';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'src/.env'),
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '../.env'),
      ],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
    }),
    GoalsModule,
    PlansModule,
    TasksModule,
    OrchestratorModule,
    LlmModule,
    FirestoreModule,
  ],
  providers: [FirestoreService, GoalsResolver, LlmService],
  exports: [FirestoreService],
})
export class AppModule { }
