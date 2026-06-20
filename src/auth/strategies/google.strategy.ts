import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

/** Normalised provider profile passed from a strategy to oauthFindOrCreate. */
export interface OAuthProfile {
  provider: string;
  providerAccountId: string;
  email: string;
  fullName: string | null;
  givenName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('google.clientId')!,
      clientSecret: config.get<string>('google.clientSecret')!,
      callbackURL: config.get<string>('google.callbackUrl')!,
      scope: ['openid', 'email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const givenName = profile.name?.givenName ?? null;
    const fullName =
      [profile.name?.givenName, profile.name?.familyName]
        .filter(Boolean)
        .join(' ') ||
      profile.displayName ||
      null;
    const user: OAuthProfile = {
      provider: 'google',
      providerAccountId: profile.id,
      email: profile.emails?.[0]?.value ?? '',
      fullName,
      givenName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
    done(null, user);
  }
}
