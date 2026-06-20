import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { REFRESH_COOKIE } from '../cookies/cookie.util';

const refreshExtractor = (req: Request): string | null =>
  (req?.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null;

export interface RefreshRequestUser {
  sub: string;
  refreshToken: string | null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([refreshExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: { sub: string }): RefreshRequestUser {
    return { sub: payload.sub, refreshToken: refreshExtractor(req) };
  }
}
