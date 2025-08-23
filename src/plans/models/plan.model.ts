import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PlannedItem {
  @Field() day: string;     
  @Field() action: string;  
}

@ObjectType()
export class Plan {
  @Field(() => ID) id: string;
  @Field() goalId: string;
  @Field() summary: string;
  @Field(() => [String]) recommendations: string[];
  @Field(() => [PlannedItem]) weeklySchedule: PlannedItem[];

  
  @Field(() => [Task], { nullable: true }) tasks?: Task[];
}


import { Task } from 'src/tasks/models/task.model';
