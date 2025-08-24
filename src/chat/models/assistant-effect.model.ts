import { Field, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class AssistantEffect {
    @Field() type: string;             // p.ej. 'SET_CURRENT_GOAL' | 'PLAN_CREATED' | 'ADD_TASKS'
    @Field(() => GraphQLJSON, { nullable: true }) payload?: any;
}
