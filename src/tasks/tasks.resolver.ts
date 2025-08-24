// src/tasks/tasks.resolver.ts
import { Args, ID, Mutation, Resolver, Query } from '@nestjs/graphql';
import { TasksService } from './tasks.service';
import { Task } from './models/task.model';
import { CurrentUser, type AuthUser } from 'src/auth/current-user.decorator';
import { AddTasksInput } from './dto/add-tasks.input';
import { PostponeTaskInput } from './dto/postpone-task.input';

@Resolver(() => Task)
export class TasksResolver {
  constructor(private readonly tasks: TasksService) { }

  @Mutation(() => [Task])
  async addTasks(
    @Args('input') input: AddTasksInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Task[]> {
    return this.tasks.bulkCreateForUser(user.id, input.planId, input.items);
  }

  @Mutation(() => Task)
  async completeTask(
    @Args('taskId', { type: () => ID }) taskId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Task> {
    return this.tasks.completeForUser(taskId, user.id);
  }

  @Mutation(() => Task)
  async postponeTask(
    @Args('input') input: PostponeTaskInput,
    @CurrentUser() user: AuthUser,
  ): Promise<Task> {
    return this.tasks.postponeForUser(input.taskId, user.id, input.days ?? 1);
  }

  @Query(() => [Task])
  async tasksToday(@CurrentUser() user: AuthUser): Promise<Task[]> {
    return this.tasks.today(user.id);
  }

}
