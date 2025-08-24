// src/chat/chat.resolver.ts
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { ChatMessage } from './models/chat-message.model';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@Resolver(() => ChatMessage)
export class ChatResolver {
  constructor(private readonly chat: ChatService) { }

  @Mutation(() => ChatMessage)
  async sendChat(
    @Args('text', { type: () => String }) text: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.chat.process(text, user.id);
  }

  @Query(() => [ChatMessage])
  async chatHistory(
    @CurrentUser() user: AuthUser, // ← requerido primero
    @Args('goalId', { type: () => ID, nullable: true }) goalId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 30 }) limit?: number,
  ) {
    return this.chat.history(user.id, goalId, limit ?? 30);
  }
}
