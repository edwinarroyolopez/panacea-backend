import { Args, ID, Int, Mutation, Query, Resolver, Context } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { ChatMessage } from './models/chat-message.model';

@Resolver(() => ChatMessage)
export class ChatResolver {
  constructor(private readonly chat: ChatService) { }

  @Mutation(() => ChatMessage)
  async sendChat(
    @Args('text') text: string,
    @Context('userId') userId: string,      // <-- llega desde GraphQLModule.context
  ): Promise<ChatMessage> {
    return this.chat.process(text, userId);
  }

  @Query(() => [ChatMessage])
  async chatHistory(
    @Args('goalId', { type: () => ID, nullable: true }) goalId?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    @Context('userId') userId?: string,
  ): Promise<ChatMessage[]> {
    return this.chat.history(userId ?? 'demo-user', goalId, limit ?? 30);
  }
}
