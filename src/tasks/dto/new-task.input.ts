// src/tasks/dto/new-task.input.ts
import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class NewTaskInput {
  @Field() title: string;
  @Field() dueAt: string;           // ISO
  @Field(() => Int) scoreWeight: number;
}

