import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetOperator = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const operator = request.user;

    return data ? operator?.[data] : operator;
  },
);
