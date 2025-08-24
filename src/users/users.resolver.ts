// src/users/users.resolver.ts
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './models/user.model';
import { UpsertUserInput } from './dto/upsert-user.input';
import { CurrentUser, type AuthUser } from 'src/auth/current-user.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly users: UsersService) {}

  @Query(() => User, { nullable: true })
  async me(@CurrentUser() user: AuthUser) {
    return this.users.findById(user.id);
  }

  @Mutation(() => User)
  async upsertMyProfile(
    @CurrentUser() user: AuthUser,
    @Args('input') input: UpsertUserInput,
  ) {
    return this.users.upsert(user.id, input);
  }
}
