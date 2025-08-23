import { Field, InputType } from '@nestjs/graphql';
import { GoalDomain } from '../models/goal.model';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateGoalInput {
  @Field()
  @IsString()
  @MinLength(3)
  title: string;

  @Field(() => GoalDomain)
  @IsEnum(GoalDomain)
  domain: GoalDomain;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  target?: string;
}
