// src/orchestrator/orchestrator.resolver.ts
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OrchestratorService } from './orchestrator.service';
import { PlansService } from '../plans/plans.service';
import { TasksService } from '../tasks/tasks.service';
import { GoalsService } from '../goals/goals.service';
import { Plan } from '../plans/models/plan.model';
import { Task } from '../tasks/models/task.model';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@Resolver()
export class OrchestratorResolver {
  constructor(
    private readonly goals: GoalsService,
    private readonly orch: OrchestratorService,
    private readonly plans: PlansService,
    private readonly tasks: TasksService,
  ) {}

  @Mutation(() => Plan)
  async generatePlan(
    @Args('goalId', { type: () => ID }) goalId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Plan> {
    // 1) Verifica que el goal sea del usuario
    const goal = await this.goals.findByIdForUser(goalId, user.id);

    // 2) Genera plan + tasks con ownership
    const planWithTasks = await this.orch.generatePlanForGoal(
      user.id,
      goal.id,
      goal.title,
      goal.domain,
      goal.target ?? null,
    );

    // 3) Devuelve el plan (si tu type Plan no expone tasks, el cast es inofensivo)
    return planWithTasks as any;
  }

  @Query(() => [Task])
  async tasksByGoal(
    @Args('goalId', { type: () => ID }) goalId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Task[]> {
    // Valida ownership dentro del service
    return this.tasks.byGoalForUser(goalId, user.id);
  }

  @Mutation(() => Plan)
  async replan(
    @Args('goalId', { type: () => ID }) goalId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Plan> {
    // Orchestrator valida que goal/plan pertenezcan al user
    const plan = await this.orch.replan(user.id, goalId);
    return plan as any;
  }
}
