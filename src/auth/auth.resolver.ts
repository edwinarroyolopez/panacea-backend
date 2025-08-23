import { Args, Mutation, ObjectType, Field, Resolver, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { User } from 'src/users/models/user.model';

@ObjectType()
class AuthPayload {
    @Field() accessToken: string;
    @Field(() => User) user: User;
}

@Resolver()
export class AuthResolver {
    constructor(private auth: AuthService) { }

    @Public()
    @Mutation(() => AuthPayload)
    async register(
        @Args('email') email: string,
        @Args('password') password: string,
        @Args('name', { nullable: true }) name?: string,
    ) {
        return this.auth.register(email, password, name);
    }

    @Public()
    @Mutation(() => AuthPayload)
    async login(
        @Args('email') email: string,
        @Args('password') password: string,
    ) {
        return this.auth.login(email, password);
    }

    @Query(() => User)
    async me(@CurrentUser() user: any) {
        return { id: user.id, email: user.email, name: user.name };
    }
}
