import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { TasksService } from './tasks.service';
import { Task } from './models/task.model';

@Resolver(() => Task)
export class TasksResolver {
  constructor(private readonly tasks: TasksService) {}

  @Mutation(() => Task)
  async completeTask(@Args('taskId', { type: () => ID }) taskId: string): Promise<Task> {
    return this.tasks.complete(taskId);
  }
}
