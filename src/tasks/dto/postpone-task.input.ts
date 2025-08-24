// src/tasks/dto/postpone-task.input.ts
import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType()
export class PostponeTaskInput {
  @Field(() => ID) taskId: string;
  @Field(() => Int, { defaultValue: 1 }) days?: number; // normalmente 1
}
