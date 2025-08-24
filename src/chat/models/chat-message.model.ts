import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AssistantEffect } from './assistant-effect.model';

export enum ChatRole { USER = 'USER', ASSISTANT = 'ASSISTANT' }
registerEnumType(ChatRole, { name: 'ChatRole' });

@ObjectType()
export class ChatMessage {
  @Field(() => ID) id: string;
  @Field() userId: string;
  @Field(() => ChatRole) role: ChatRole;
  @Field() text: string;
  @Field(() => ID, { nullable: true })
  goalId?: string | null;

  @Field(() => ID, { nullable: true })
  planId?: string | null;

  @Field() createdAt: string;

  @Field(() => [AssistantEffect], { nullable: true })
  effects?: AssistantEffect[] | null;
}



