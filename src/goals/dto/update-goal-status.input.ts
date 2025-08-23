import { Field, InputType, ID } from '@nestjs/graphql';
import { GoalStatus } from '../models/goal.model';
import { IsEnum, IsString } from 'class-validator';

@InputType()
export class UpdateGoalStatusInput {
  @Field(() => ID)
  @IsString()
  goalId: string;

  @Field(() => GoalStatus)
  @IsEnum(GoalStatus)
  status: GoalStatus;
}
