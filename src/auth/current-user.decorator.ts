import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export type AuthUser = { id: string; email?: string; name?: string };

export const CurrentUser = createParamDecorator((_data, ctx: ExecutionContext) => {
  const gql = GqlExecutionContext.create(ctx);
  return gql.getContext().req?.user as AuthUser;
});
