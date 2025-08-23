import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { PlansService } from './plans.service';
import { Plan } from './models/plan.model';

@Resolver(() => Plan)
export class PlansResolver {
  constructor(private readonly plans: PlansService) {}

  @Query(() => Plan, { nullable: true })
  async planByGoal(@Args('goalId', { type: () => ID }) goalId: string): Promise<Plan | null> {
    return this.plans.findByGoal(goalId);
  }
}
