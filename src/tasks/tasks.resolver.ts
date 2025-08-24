// src/tasks/tasks.resolver.ts
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { TasksService } from './tasks.service';
import { Task } from './models/task.model';
import { CurrentUser, type AuthUser } from 'src/auth/current-user.decorator';

@Resolver(() => Task)
export class TasksResolver {
  constructor(private readonly tasks: TasksService) {}

  @Mutation(() => Task)
  async completeTask(
    @Args('taskId', { type: () => ID }) taskId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Task> {
    return this.tasks.completeForUser(taskId, user.id);
  }
}
