import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CredentialsEntity } from '../entities/credentials.entity';
import { Repository } from 'typeorm';
import { OperatorEntity } from 'src/operator/entities/operator.entity';

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy, 'jwt-auth') {
  constructor(
    @InjectRepository(CredentialsEntity)
    private credentialsRepository: Repository<CredentialsEntity>,
    @InjectRepository(OperatorEntity)
    private operatorRepository: Repository<OperatorEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    const credentials = await this.credentialsRepository.findOne({
      where: { accessToken: token },
    });

    if (!credentials) {
      throw new UnauthorizedException('Token is invalid or expired');
    }

    const operator = await this.operatorRepository.findOne({
      where: {
        credentials: {
          id: credentials.id,
        },
      },
    });

    if (operator.deleted) {
      throw new ForbiddenException('Forbidden');
    }

    return { ...operator };
  }
}
