import { APP_GUARD, Reflector } from '@nestjs/core';
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
import { ChatModule } from './chat/chat.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import * as path from 'path';

import { JwtAuthGuard } from './auth/jwt-auth.guard';

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
      context: ({ req, res }) => ({ req, res }),
    }),
    GoalsModule,
    PlansModule,
    TasksModule,
    OrchestratorModule,
    LlmModule,
    FirestoreModule,
    ChatModule,
    UsersModule,
    AuthModule,
  ],
  providers: [FirestoreService, GoalsResolver, LlmService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [FirestoreService],
})
export class AppModule { }
