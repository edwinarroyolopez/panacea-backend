// src/tasks/dto/add-tasks.input.ts
import { Field, ID, InputType } from '@nestjs/graphql';
import { NewTaskInput } from './new-task.input';

@InputType()
export class AddTasksInput {
  @Field(() => ID) planId: string;
  @Field(() => [NewTaskInput]) items: NewTaskInput[];
}
