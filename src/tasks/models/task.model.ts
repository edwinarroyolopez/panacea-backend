import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum TaskStatus { PENDING='pending', DONE='done', SKIPPED='skipped', IN_PROGRESS='in-progress' }
registerEnumType(TaskStatus, { name: 'TaskStatus' });

@ObjectType()
export class Task {
  @Field(() => ID) id: string;
  @Field(() => ID) userId: string;
  @Field() planId: string;
  @Field() title: string;
  @Field() dueAt: string; // ISO
  @Field(() => TaskStatus) status: TaskStatus;
  @Field() scoreWeight: number; // 1..5
  @Field({ nullable: true }) createdAt?: string;
  @Field({ nullable: true }) updatedAt?: string;
  @Field({ nullable: true }) postponedCount?: number;
  
}
