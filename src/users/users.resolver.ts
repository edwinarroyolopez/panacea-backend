// src/users/users.resolver.ts
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './models/user.model';
import { UpsertUserInput } from './dto/upsert-user.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly users: UsersService) {}

  @Query(() => User, { nullable: true })
  async me(@Context('userId') userId: string) {
    return this.users.findById(userId);
  }

  @Mutation(() => User)
  async upsertMyProfile(
    @Context('userId') userId: string,
    @Args('input') input: UpsertUserInput,
  ) {
    return this.users.upsert(userId, input);
  }
}
