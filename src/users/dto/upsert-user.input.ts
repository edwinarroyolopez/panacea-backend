import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpsertUserInput {
  @Field({ nullable: true }) email?: string;
  @Field({ nullable: true }) name?: string;
  @Field({ nullable: true }) avatarUrl?: string;
  @Field({ nullable: true }) timeZone?: string;
  @Field({ nullable: true }) locale?: string;
}
