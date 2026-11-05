import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendMail(
    email: string,
    subject: string,
    message: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: subject,
        html: message,
      });

      console.log(`Email sent to ${email} with subject: ${subject}`);
    } catch (e) {
      console.error(e);
      // throw new BadRequestException('Email is not valid');
    }
  }

  async sendRegistrationCode(
    email: string,
    verificationCode: string,
  ): Promise<void> {
    const message = `Please complete your registration by clicking on the link below:\n${process.env.MAIL_REGISTRATION_LINK}${verificationCode}\n\nThis link will expire in ${process.env.REGISTER_CODE_EXPIRES_IN} days`;
    await this.sendMail(
      email,
      '🔐 Registration for SwitcherHub Admin!',
      message,
    );
  }

  async sendChangePasswordCode(
    to: string,
    verificationCode: string,
  ): Promise<string> {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const message = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset Your Password</title></head>
<body style="margin:0;padding:32px 16px;background:#E5E7EB;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">
        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6B7280;">${dateStr}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:28px 28px 8px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Reset your password</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 12px;">We received a request to reset your password for your SwitcherHub account. Use the code below to complete the process:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;margin:20px 0;">
              <tr>
                <td style="padding:18px 20px;text-align:center;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;margin:0 0 6px;">Your verification code</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#111111;letter-spacing:2px;line-height:1;margin:0;">${verificationCode}</p>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.6;margin:0 0 12px;">If you didn't request a password reset, ignore this email or contact <a href="mailto:support@switcherhub.com" style="color:#10B981;text-decoration:none;">support@switcherhub.com</a>.</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;margin:0 0 20px;"><strong>Note:</strong> This code expires in 30 minutes.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><a href="https://switcherhub.com" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">switcherhub.com</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    await this.sendMail(to, '🔐 Reset Your SwitcherHub Password', message);
    return verificationCode;
  }

  async sendChangeEmailCode(
    to: string,
    verificationCode: string,
  ): Promise<string> {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const message = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Verify Your New Email Address</title></head>
<body style="margin:0;padding:32px 16px;background:#E5E7EB;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">
        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6B7280;">${dateStr}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:28px 28px 8px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Confirm your new email address</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 12px;">We received a request to change the email address for your SwitcherHub account. Enter the code below to confirm:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;margin:20px 0;">
              <tr>
                <td style="padding:18px 20px;text-align:center;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;margin:0 0 6px;">Your verification code</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#111111;letter-spacing:2px;line-height:1;margin:0;">${verificationCode}</p>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.6;margin:0 0 12px;">If you did not request this change, ignore this message or contact <a href="mailto:support@switcherhub.com" style="color:#10B981;text-decoration:none;">support@switcherhub.com</a>.</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;margin:0 0 20px;"><strong>Note:</strong> This code expires in 30 minutes.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><a href="https://switcherhub.com" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">switcherhub.com</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    await this.sendMail(to, '✉️ Confirm Your New Email Address', message);
    return verificationCode;
  }

  async sendVerificationCode(
    to: string,
    verificationCode: string,
  ): Promise<string> {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const message = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Verify Your Email</title></head>
<body style="margin:0;padding:32px 16px;background:#E5E7EB;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">
        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6B7280;">${dateStr}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:28px 28px 8px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Verify your email</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 12px;">Thanks for signing up for <strong style="color:#111111;">SwitcherHub</strong>! To complete your registration, enter the verification code below:</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;margin:20px 0;">
              <tr>
                <td style="padding:18px 20px;text-align:center;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;margin:0 0 6px;">Your verification code</p>
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#111111;letter-spacing:2px;line-height:1;margin:0;">${verificationCode}</p>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.6;margin:0 0 12px;">If you didn't sign up for SwitcherHub, you can ignore this email.</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.6;margin:0 0 20px;">Need help? Contact us at <a href="mailto:support@switcherhub.com" style="color:#10B981;text-decoration:none;">support@switcherhub.com</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><a href="https://switcherhub.com" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">switcherhub.com</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    await this.sendMail(to, '🔐 Confirm Your Email for SwitcherHub!', message);
    return verificationCode;
  }

  async sendMessageTemporarily(to: string, days: number): Promise<void> {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const htmlMessage = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Account Temporarily Suspended</title></head>
<body style="margin:0;padding:32px 16px;background:#E5E7EB;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">
        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6B7280;">${dateStr}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:28px 28px 8px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Your account has been temporarily suspended</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 12px;">We have reviewed reports about your account and found a violation of SwitcherHub's platform rules. Your account has been temporarily suspended for <strong style="color:#111111;">${days} days</strong>.</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FFFBEB;border:1.5px solid #FDE68A;border-radius:10px;margin:20px 0;">
              <tr>
                <td style="padding:12px 14px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#92400E;line-height:1.5;margin:0;">During this period you will not be able to access your account. Further violations may result in a permanent ban.</p>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.6;margin:0 0 20px;">If you believe this was a mistake or need assistance, contact <a href="mailto:support@switcherhub.com" style="color:#10B981;text-decoration:none;">support@switcherhub.com</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><a href="https://switcherhub.com" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">switcherhub.com</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    await this.sendMail(
      to,
      'Important: Your Account Has Been Temporarily Suspended',
      htmlMessage,
    );
  }

  /**
   * Email for the other HR manager when partner company has paid — "Partner already paid. Complete your payment to finalize."
   */
  async sendHrPartnerPaidEmail(
    to: string,
    requestDisplayId: string,
    swapRequestId: string,
  ): Promise<void> {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const hrBase = 'https://hr.switcherhub.com';
    const swapRequestLink = `${hrBase}/swap-request/${swapRequestId}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:32px 16px;background:#E5E7EB;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">
        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-size:17px;font-weight:bold;color:#fff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><span style="font-size:11px;color:#6B7280;">${dateStr}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:28px 28px 8px;">
            <p style="font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Partner already paid.<br/>Complete your payment to finalize.</p>
            <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 20px;">The partner company confirmed and paid their part for request <strong style="color:#111;">${requestDisplayId}</strong>. One payment left — yours.</p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
              <tr>
                <td style="background-color:#F0FDF4;border-left:3px solid #10B981;border-radius:0 8px 8px 0;padding:12px 14px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="font-size:13px;color:#374151;line-height:1.6;">
                        <span style="color:#10B981;font-weight:bold;">&#10003;</span> Partner company — paid<br/>
                        <span style="color:#F59E0B;font-weight:bold;">&#9679;</span> Your company — pending
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#9CA3AF;margin:0 0 10px;">After your payment</p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                    <tr>
                      <td width="14" valign="top" style="padding-top:3px;"><div style="width:6px;height:6px;border-radius:50%;background-color:#10B981;"></div></td>
                      <td style="font-size:13px;font-weight:bold;color:#111111;padding-left:8px;">Full employee profiles unlock instantly</td>
                    </tr>
                  </table>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                    <tr>
                      <td width="14" valign="top" style="padding-top:3px;"><div style="width:6px;height:6px;border-radius:50%;background-color:#10B981;"></div></td>
                      <td style="font-size:13px;font-weight:bold;color:#111111;padding-left:8px;">Partner HR contact is revealed</td>
                    </tr>
                  </table>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="14" valign="top" style="padding-top:3px;"><div style="width:6px;height:6px;border-radius:50%;background-color:#10B981;"></div></td>
                      <td style="font-size:13px;font-weight:bold;color:#111111;padding-left:8px;">Swap is officially activated</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
              <tr>
                <td align="center">
                  <a href="${swapRequestLink}" style="display:block;background-color:#10B981;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;text-align:center;padding:16px 28px;border-radius:12px;">Finalize the Swap &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:0 0 20px;">$149 &middot; No hidden fees</p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
              <tr>
                <td width="20" valign="top" style="padding-top:1px;"><span style="font-size:14px;color:#9CA3AF;">&#128274;</span></td>
                <td style="font-size:12px;color:#9CA3AF;line-height:1.5;padding-left:6px;">Employee identities are revealed only after both companies approve and pay.</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><a href="${hrBase}" style="font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">hr.switcherhub.com</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    await this.sendMail(
      to,
      'Partner already paid — Complete your payment to finalize',
      html,
    );
  }

  /**
   * Email for both HR managers when swap is fully paid and activated — "Swap activated. Profiles and contacts unlocked."
   */
  async sendHrSwapActivatedEmail(
    to: string,
    requestDisplayId: string,
    swapRequestId: string,
  ): Promise<void> {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const hrBase = 'https://hr.switcherhub.com';
    const swapRequestLink = `${hrBase}/swap-request/${swapRequestId}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:32px 16px;background:#E5E7EB;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">
        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-size:17px;font-weight:bold;color:#fff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><span style="font-size:11px;color:#6B7280;">${dateStr}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:28px 28px 8px;">
            <p style="font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Swap activated.<br/>Profiles and contacts unlocked.</p>
            <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 20px;">Both companies confirmed and paid. Request <strong style="color:#111;">${requestDisplayId}</strong> is officially activated. You can now begin the official transfer process.</p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0FDF4;border:1.5px solid #D1FAE5;border-radius:12px;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;color:#10B981;margin:0 0 10px;">What's unlocked</p>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                    <tr>
                      <td width="24" valign="top">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="width:20px;height:20px;background-color:#10B981;border-radius:50%;text-align:center;vertical-align:middle;"><span style="font-size:12px;font-weight:bold;color:#fff;line-height:20px;">&#10003;</span></td></tr></table>
                      </td>
                      <td style="font-size:13px;color:#374151;line-height:1.5;padding-left:10px;">Full employee profiles — names, contacts, role details</td>
                    </tr>
                  </table>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
                    <tr>
                      <td width="24" valign="top">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="width:20px;height:20px;background-color:#10B981;border-radius:50%;text-align:center;vertical-align:middle;"><span style="font-size:12px;font-weight:bold;color:#fff;line-height:20px;">&#10003;</span></td></tr></table>
                      </td>
                      <td style="font-size:13px;color:#374151;line-height:1.5;padding-left:10px;">Partner HR contact — coordinate the transfer directly</td>
                    </tr>
                  </table>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="24" valign="top">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="width:20px;height:20px;background-color:#10B981;border-radius:50%;text-align:center;vertical-align:middle;"><span style="font-size:12px;font-weight:bold;color:#fff;line-height:20px;">&#10003;</span></td></tr></table>
                      </td>
                      <td style="font-size:13px;color:#374151;line-height:1.5;padding-left:10px;">All legal and operational details — yours to coordinate</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:10px;">
              <tr>
                <td align="center">
                  <a href="${swapRequestLink}" style="display:block;background-color:#10B981;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;text-align:center;padding:16px 28px;border-radius:12px;">View Swap Details &rarr;</a>
                </td>
              </tr>
            </table>
            <p style="font-size:12px;color:#9CA3AF;text-align:center;margin:0 0 20px;">hr.switcherhub.com &middot; Request ${requestDisplayId}</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><a href="${hrBase}" style="font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">hr.switcherhub.com</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    await this.sendMail(
      to,
      'Swap activated — Profiles and contacts unlocked',
      html,
    );
  }

  async sendMessagePermanently(to: string): Promise<void> {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const htmlMessage = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Account Permanently Banned</title></head>
<body style="margin:0;padding:32px 16px;background:#E5E7EB;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F0F2F5;">
  <tr>
    <td align="center" style="padding:32px 16px 48px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;">
        <tr>
          <td style="background-color:#111111;border-radius:16px 16px 0 0;padding:22px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><span style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#6B7280;">${dateStr}</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#ffffff;padding:28px 28px 8px;">
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#111111;line-height:1.3;margin:0 0 10px;">Your account has been permanently banned</p>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B7280;line-height:1.6;margin:0 0 12px;">Due to repeated violations of SwitcherHub's platform rules, your account has been permanently banned.</p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;margin:20px 0;">
              <tr>
                <td style="padding:12px 14px;">
                  <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#991B1B;line-height:1.5;margin:0;">You will no longer be able to access your account or use our services. This decision is final and cannot be reversed.</p>
                </td>
              </tr>
            </table>
            <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;line-height:1.6;margin:0 0 20px;">If you have questions, contact <a href="mailto:support@switcherhub.com" style="color:#10B981;text-decoration:none;">support@switcherhub.com</a>.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F9FAFB;border-top:1px solid #E5E7EB;border-radius:0 0 16px 16px;padding:16px 28px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td><span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;color:#9CA3AF;">Switcher<span style="color:#10B981;">Hub</span></span></td>
                <td align="right"><a href="https://switcherhub.com" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#9CA3AF;text-decoration:none;">switcherhub.com</a></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

    await this.sendMail(
      to,
      'Important: Your Account Has Been Permanently Banned',
      htmlMessage,
    );
  }
}

// export async function generateSixDigitCode(): Promise<string> {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }
