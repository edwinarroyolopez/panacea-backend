import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { OrchestratorService } from './orchestrator.service';
import { PlansService } from '../plans/plans.service';
import { TasksService } from '../tasks/tasks.service';
import { Plan } from '../plans/models/plan.model';
import { Task } from '../tasks/models/task.model';
import { GoalsService } from '../goals/goals.service';

@Resolver()
export class OrchestratorResolver {
  constructor(
    private readonly goals: GoalsService,
    private readonly orch: OrchestratorService,
    private readonly plans: PlansService,
    private readonly tasks: TasksService,
  ) { }

  @Mutation(() => Plan)
  async generatePlan(@Args('goalId', { type: () => ID }) goalId: string): Promise<Plan> {
    const goal = await this.goals.findById(goalId);
    const planWithTasks = await this.orch.generatePlanForGoal(goal.id, goal.title, goal.domain, goal.target);
    return planWithTasks as any; // devuelve Plan con tasks “hidratadas”
  }

  @Query(() => [Task])
  async tasksByGoal(@Args('goalId', { type: () => ID }) goalId: string): Promise<Task[]> {
    return this.tasks.byGoal(goalId);
  }

  @Mutation(() => Plan)
  async replan(@Args('goalId', { type: () => ID }) goalId: string): Promise<Plan> {
    const plan = await this.orch.replan(goalId);
    return plan as any;
  }
}
