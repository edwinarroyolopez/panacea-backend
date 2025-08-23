import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GoalsService } from './goals.service';
import { Goal } from './models/goal.model';
import { CreateGoalInput } from './dto/create-goal.input';
import { UpdateGoalStatusInput } from './dto/update-goal-status.input';

@Resolver(() => Goal)
export class GoalsResolver {
  constructor(private readonly goalsService: GoalsService) {}

  // MVP: userId fijo; luego lo tomaremos del contexto (JWT)
  private userId() {
    return 'demo-user';
  }

  @Query(() => [Goal])
  async goals(): Promise<Goal[]> {
    return this.goalsService.findByUser(this.userId());
  }

  @Query(() => Goal)
  async goal(@Args('id', { type: () => ID }) id: string): Promise<Goal> {
    return this.goalsService.findById(id);
  }

  @Mutation(() => Goal)
  async upsertGoal(@Args('input') input: CreateGoalInput): Promise<Goal> {
    return this.goalsService.upsert(this.userId(), input);
  }

  @Mutation(() => Goal)
  async updateGoalStatus(
    @Args('input') input: UpdateGoalStatusInput,
  ): Promise<Goal> {
    return this.goalsService.updateStatus(input);
  }

  @Mutation(() => Boolean)
  async deleteGoal(
    @Args('goalId', { type: () => ID }) goalId: string,
  ): Promise<boolean> {
    return this.goalsService.softDelete(goalId);
  }
}
