import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ChatService } from './chat.service';
import { ChatMessage } from './models/chat-message.model';

@Resolver(() => ChatMessage)
export class ChatResolver {
  constructor(private readonly chat: ChatService) {}

  // MVP: userId fijo; luego lo tomamos del contexto/JWT
  private userId() { return 'demo-user'; }

  @Mutation(() => ChatMessage)
  async sendChat(@Args('text') text: string): Promise<ChatMessage> {
    return this.chat.process(text, this.userId());
  }

  @Query(() => [ChatMessage])
  async chatHistory(
    @Args('goalId', { type: () => ID, nullable: true }) goalId?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<ChatMessage[]> {
    return this.chat.history(this.userId(), goalId, limit ?? 30);
  }
}
