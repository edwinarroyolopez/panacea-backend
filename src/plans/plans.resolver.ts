// src/plans/plans.resolver.ts
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { PlansService } from './plans.service';
import { Plan } from './models/plan.model';
import { CurrentUser, type AuthUser } from 'src/auth/current-user.decorator';

@Resolver(() => Plan)
export class PlansResolver {
  constructor(private readonly plans: PlansService) { }

  @Query(() => Plan, { nullable: true })
  async planByGoal(
    @Args('goalId', { type: () => ID }) goalId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Plan | null> {
    return this.plans.findByGoal(goalId, user.id);
  }
}
