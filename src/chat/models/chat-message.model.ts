import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum ChatRole { USER = 'user', ASSISTANT = 'assistant' }
registerEnumType(ChatRole, { name: 'ChatRole' });

@ObjectType()
export class ChatMessage {
  @Field(() => ID) id: string;
  @Field() userId: string;
  @Field(() => ChatRole) role: ChatRole;
  @Field() text: string;
  @Field({ nullable: true }) goalId?: string;
  @Field({ nullable: true }) planId?: string;
  @Field() createdAt: string;
}
