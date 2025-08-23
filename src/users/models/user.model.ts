import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID) id: string;
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) name?: string;
  @Field({ nullable: true }) avatarUrl?: string;
  @Field({ nullable: true }) timeZone?: string;   
  @Field({ nullable: true }) locale?: string;
  @Field() createdAt: string;
  @Field() updatedAt: string;
}
