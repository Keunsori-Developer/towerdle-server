import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { User } from 'src/entity/user.entity';

export const Jwt = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

export interface JwtUserPayload extends User {}
