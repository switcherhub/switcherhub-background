import { BadRequestException, Injectable } from '@nestjs/common';
import { MailService } from 'src/mail/mail.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserService } from 'src/users/services/user.service';
import { UserAuthService } from '../user-auth/user-auth.service';
import { AuthService } from '../services/authorization.service';

interface ChallengeState {
  lastSentAt: number;
  attempts: number;
}

/**
 * Passwordless email login (spec FR-009, contracts/auth-passwordless.md).
 * Additive: the existing email+password login is untouched. A single verified
 * channel (email) with a 6-digit code, no password. Responses are generic and do
 * not reveal whether an account exists.
 *
 * NOTE: rate-limit state is in-memory for this slice; production with multiple
 * instances should back it with Redis (REDIS_* already configured).
 */
@Injectable()
export class PasswordlessAuthService {
  private readonly challenges = new Map<string, ChallengeState>();
  private readonly resendCooldownMs = 60_000; // >=60s between sends
  private readonly maxAttempts = 5;

  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  private normalize(email: string): string {
    return (email ?? '').replace(/\s+/g, '').toLowerCase();
  }

  private sixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /** Issue (or re-issue after cooldown) a 6-digit code. Always generic. */
  async challenge(rawEmail: string): Promise<{ resendAfter: string }> {
    const email = this.normalize(rawEmail);
    const now = Date.now();
    const genericResend = (ts: number) => ({
      resendAfter: new Date(ts + this.resendCooldownMs).toISOString(),
    });

    const state = this.challenges.get(email);
    if (state && now - state.lastSentAt < this.resendCooldownMs) {
      // Too soon — do not resend, but respond generically.
      return genericResend(state.lastSentAt);
    }

    let userAuth = await this.userAuthService.findOneByEmail(email);
    let user: UserEntity;

    if (!userAuth) {
      user = new UserEntity();
      user.email = email;
      user.firstName = '';
      user.lastName = '';
      user.phone = '';
      user.avatarUrl = 'img/31010f10d3e166b4ef.png';
      await user.save();
      userAuth = await this.userAuthService.create({
        email,
        password: '',
        isVerified: false,
        user,
      });
    } else {
      user = userAuth.user;
      if (user?.isDeleted) {
        // Do not reveal a deleted account; respond generically without sending.
        this.challenges.set(email, { lastSentAt: now, attempts: 0 });
        return genericResend(now);
      }
    }

    const code = this.sixDigitCode();
    user.codeAuthorization = code;
    await this.userService.update(user);
    this.mailService.sendVerificationCode(email, code);
    this.challenges.set(email, { lastSentAt: now, attempts: 0 });
    return genericResend(now);
  }

  /** Verify the code and return session tokens (reuses confirmEmail → login). */
  async verify(rawEmail: string, code: string) {
    const email = this.normalize(rawEmail);
    const state = this.challenges.get(email);
    if (state && state.attempts >= this.maxAttempts) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }
    try {
      const result = await this.authService.confirmEmail(email, code);
      this.challenges.delete(email);
      return result;
    } catch (_) {
      if (state) {
        state.attempts += 1;
      } else {
        this.challenges.set(email, { lastSentAt: Date.now(), attempts: 1 });
      }
      throw new BadRequestException('Invalid or expired code');
    }
  }
}
