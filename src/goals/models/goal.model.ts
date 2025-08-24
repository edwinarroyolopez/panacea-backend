import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum GoalDomain {
  SLEEP = 'sleep',
  WEIGHT = 'weight',
  STRESS = 'stress',
}

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  DELETED = 'DELETED',
}

registerEnumType(GoalDomain, { name: 'GoalDomain' });
registerEnumType(GoalStatus, { name: 'GoalStatus' });

@ObjectType()
export class Goal {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  title: string;

  @Field(() => GoalDomain)
  domain: GoalDomain;

  @Field({ nullable: true })
  target?: string;

  @Field(() => GoalStatus)
  status: GoalStatus;

  @Field()
  createdAt: string;

  @Field({ nullable: true })
  updatedAt?: string;
}
