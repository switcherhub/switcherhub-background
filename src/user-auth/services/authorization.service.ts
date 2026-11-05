import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import appleSignin from 'apple-signin-auth';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksLocalClient from 'jwks-rsa';
import { MailService } from 'src/mail/mail.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { UserService } from 'src/users/services/user.service';
import { UserAuthCreateDto } from '../user-auth/user-auth.dto';
import { UserAuthEntity } from '../user-auth/user-auth.entity';
import { UserAuthInterface } from '../user-auth/user-auth.interface';
import { UserAuthService } from '../user-auth/user-auth.service';
import { NotificationService } from 'src/notification/services/notification.service';
import { NotificationTypeEnum } from 'src/notification/types/notification-type.enum';
import { WorkspaceService } from 'src/workspace/services/workspace.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly userAuthService: UserAuthService,
    private readonly emailService: MailService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userAuthService.findOneByEmail(email);

    if (!user?.user) {
      if (await this.userService.wasAccountDeletedForEmail(email)) {
        throw new BadRequestException('акаунт був видалений');
      }
      throw new BadRequestException(
        'User not found. Please register to continue',
      );
    }

    if (user.user.isDeleted) {
      throw new BadRequestException('Account has been deleted');
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Incorrect password. Please try again');
    }

    const { ...result } = user;
    return result;
  }

  async login(email: string) {
    const user = await this.userAuthService.findOneByEmail(email);

    if (!user?.user) {
      throw new BadRequestException('User not found');
    }

    if (user.user.isDeleted) {
      throw new BadRequestException('Account has been deleted');
    }

    if (user.isVerified === false) {
      throw new BadRequestException('User not found');
    }
    const refreshToken = this.generateRefreshToken();
    user.refreshToken = refreshToken;
    await this.userAuthService.update(user);
    const payload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      id: user.id,
      email: user.email,
    };
  }

  async register(
    email: string,
    password: string,
    user: UserEntity,
  ): Promise<UserAuthInterface> {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const createDto: UserAuthCreateDto = {
      email,
      password: hashedPassword,
      user: user,
    };
    const newUser = await this.userAuthService.create(createDto);

    const code = await this.generateAuthCode();

    this.emailService.sendVerificationCode(user.email, code);
    user.codeAuthorization = code;
    await this.userService.update(user);

    delete newUser.password;
    delete newUser.refreshToken;
    return newUser;
  }

  async getUserByRefreshToken(refreshToken: string): Promise<UserAuthEntity> {
    const auth = await this.userAuthService.findOneByRefreshToken(refreshToken);
    if (!auth?.user) {
      throw new UnauthorizedException('User not found');
    }
    if (auth.user.isDeleted) {
      throw new UnauthorizedException('Account has been deleted');
    }
    return auth;
  }

  async confirmEmail(email: string, code: string) {
    try {
      const user = await this.userService.findOneByEmail(email);
      if (user.codeAuthorization === code) {
        const userAuth = await this.userAuthService.findOneByEmail(email);

        userAuth.isVerified = true;
        await this.userAuthService.update(userAuth);

        return await this.login(email);
      } else {
        throw new BadRequestException('Invalid code');
      }
    } catch (e) {
      throw new BadRequestException('Invalid code');
    }
  }

  async revokeRefreshTokenForUser(userId: string) {
    const user = await this.userAuthService.findOne(userId);
    if (user) {
      user.refreshToken = null;
      await this.userAuthService.update(user);
    }
  }

  async sendNewCode(email: string) {
    const user = await this.userService.findOneByEmail(email);
    const userAuth = await this.userAuthService.findOneByEmail(email);
    userAuth.isVerified = false;
    await this.userAuthService.update(userAuth);
    if (user) {
      const code = await this.generateAuthCode();
      this.emailService.sendVerificationCode(email, code);
      user.codeAuthorization = code;
      await this.userService.update(user);
      return { message: 'Code send success' };
    }
  }

  async sendRecoveryCode(email: string) {
    const user = await this.userService.findOneByEmail(email);
    const userAuth = await this.userAuthService.findOneByEmail(email);
    userAuth.isVerified = false;
    await this.userAuthService.update(userAuth);
    if (user) {
      const code = await this.generateAuthCode();
      this.emailService.sendChangePasswordCode(email, code);
      user.codeAuthorization = code;
      await this.userService.update(user);
      return { message: 'Code send success' };
    }
  }

  async changePassword(email: string, newPassword: string): Promise<void> {
    const user = await this.userAuthService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    user.password = hashedPassword;
    await this.userAuthService.update(user);
  }

  private generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  private generateReferralCode(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array(6)
      .fill(null)
      .map(() => possible[Math.floor(Math.random() * possible.length)])
      .join('');
  }

  async findOrCreateGoogleUser(payload: any): Promise<any> {
    const {
      email,
      sub: googleId,
      given_name: firstName,
      family_name: lastName,
    } = payload;

    let userAuth = await this.userAuthService.findOneByEmail(email);

    if (!userAuth) {
      const newUserEntity = new UserEntity();
      newUserEntity.email = email;
      newUserEntity.firstName = firstName;
      newUserEntity.lastName = lastName;
      newUserEntity.googleId = googleId;
      newUserEntity.phone = '';
      newUserEntity.avatarUrl = 'img/31010f10d3e166b4ef.png';

      await newUserEntity.save();

      userAuth = await this.userAuthService.create({
        email,
        password: '',
        isVerified: true,
        user: newUserEntity,
      });
    } else {
      if (userAuth.user.isDeleted) {
        throw new BadRequestException('Account has been deleted');
      }
      userAuth.user.googleId = googleId;
      userAuth.isVerified = true;

      await this.userService.update(userAuth.user);
      await this.userAuthService.update(userAuth);
    }

    return userAuth.user;
  }

  async findOrCreateAppleUser(identityToken: string): Promise<UserEntity> {
    const appleUser = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: true,
    });

    const { email, sub: appleId } = appleUser;

    let userAuth = await this.userAuthService.findOneByEmail(email);

    if (!userAuth) {
      const newUserEntity = new UserEntity();
      newUserEntity.email = email || 'safeemail@gmail.com';
      newUserEntity.firstName = 'Guest';
      newUserEntity.lastName = 'User';
      newUserEntity.appleId = appleId;
      newUserEntity.phone = '';
      newUserEntity.avatarUrl = 'img/31010f10d3e166b4ef.png';

      await newUserEntity.save();

      userAuth = await this.userAuthService.create({
        email,
        password: '',
        isVerified: true,
        user: newUserEntity,
      });
    }
    if (userAuth.user.isDeleted) {
      throw new BadRequestException('Account has been deleted');
    }
    userAuth.isVerified = true;
    await this.userAuthService.update(userAuth);
    return userAuth.user;
  }

  async generateAuthCode(): Promise<string> {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async findOrCreateFacebookUser(accessToken: string): Promise<UserEntity> {
    // const response = await axios.get(
    //   `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,email,first_name,last_name`,
    // );
    const facebookUser = await this.getLimitedFacebookUser(accessToken);
    // const {
    //   id: facebookId,
    //   email,
    //   first_name: firstName,
    //   last_name: lastName,
    // } = response.data;

    let userAuth = await this.userAuthService.findOneByEmail(
      facebookUser.facebookUserEmail,
    );

    if (!userAuth) {
      const newUserEntity = new UserEntity();
      newUserEntity.email =
        facebookUser.facebookUserEmail ||
        `user_${facebookUser.facebookUserId}@facebook.com`;

      newUserEntity.firstName = facebookUser.facebookUserName.split(' ')[0];
      newUserEntity.lastName =
        facebookUser.facebookUserName.split(' ')[1] || '';
      newUserEntity.facebookId = facebookUser.facebookUserId;
      newUserEntity.phone = '';
      newUserEntity.avatarUrl = 'img/31010f10d3e166b4ef.png';

      await newUserEntity.save();

      userAuth = await this.userAuthService.create({
        email: newUserEntity.email,
        password: '',
        isVerified: true,
        user: newUserEntity,
      });
    }
    if (userAuth.user.isDeleted) {
      throw new BadRequestException('Account has been deleted');
    }
    userAuth.isVerified = true;
    await this.userAuthService.update(userAuth);
    return userAuth.user;
  }

  async findOneByEmail(email: string): Promise<UserAuthEntity> {
    return this.userAuthService.findOneByEmail(email);
  }

  FACEBOOK_JWKS_URI = 'https://www.facebook.com/.well-known/oauth/openid/jwks';
  FACEBOOK_ISSUER = 'https://www.facebook.com';

  async getLimitedFacebookUser(token: string): Promise<FacebookUser> {
    const appId = '1589749558639590';
    const client = jwksLocalClient({
      jwksUri: this.FACEBOOK_JWKS_URI,
    });

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        async (header, callback) => {
          try {
            const key = await client.getSigningKey(header.kid);
            callback(null, key.getPublicKey());
          } catch (error) {
            callback(error as Error, undefined);
          }
        },
        {
          algorithms: ['RS256'],
          audience: appId,
          issuer: this.FACEBOOK_ISSUER,
        },
        (err, decoded) => {
          if (err) {
            reject(new Error(`JWT verification failed: ${err.message}`));
          } else {
            const { sub, name, email } = decoded as JwtPayload;

            if (!sub || !name) {
              reject(new Error('Invalid token (missing sub or name)'));
            } else {
              resolve({
                facebookUserId: sub,
                facebookUserName: name,
                facebookUserEmail: email,
              });
            }
          }
        },
      );
    });
  }
}

interface FacebookUser {
  facebookUserId: string;
  facebookUserName: string;
  facebookUserEmail: string;
}
