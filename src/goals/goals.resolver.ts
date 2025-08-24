// src/goals/goals.resolver.ts
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GoalsService } from './goals.service';
import { Goal } from './models/goal.model';
import { CreateGoalInput } from './dto/create-goal.input';
import { UpdateGoalStatusInput } from './dto/update-goal-status.input';
import { CurrentUser, type AuthUser } from 'src/auth/current-user.decorator';

@Resolver(() => Goal)
export class GoalsResolver {
  constructor(private readonly goalsService: GoalsService) { }
  @Query(() => [Goal])
  goals(@CurrentUser() user: AuthUser) {
    return this.goalsService.findByUser(user.id);
  }

  @Query(() => Goal)
  goal(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: AuthUser) {
    return this.goalsService.findByIdForUser(id, user.id);
  }

  @Mutation(() => Goal)
  upsertGoal(@Args('input') input: CreateGoalInput, @CurrentUser() user: AuthUser) {
    return this.goalsService.upsert(user.id, input);
  }

  @Mutation(() => Goal)
  updateGoalStatus(@Args('input') input: UpdateGoalStatusInput, @CurrentUser() user: AuthUser) {
    return this.goalsService.updateStatusForUser(user.id, input);
  }

  @Mutation(() => Boolean)
  deleteGoal(@Args('goalId', { type: () => ID }) goalId: string, @CurrentUser() user: AuthUser) {
    return this.goalsService.softDeleteForUser(goalId, user.id);
  }

}
