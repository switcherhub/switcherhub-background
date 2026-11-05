import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialsEntity } from '../entities/credentials.entity';
import { RegisterDto } from '../dto/register.dto';
import { generateRecoveryCode } from '../utils/generateRecoveryCode';
import { MailService } from 'src/mail/mail.service';
import { ResetValidation } from '../dto/reset.validation';

@Injectable()
export class AuthService {
  constructor(
    private readonly mailService: MailService,
    private jwtService: JwtService,
    @InjectRepository(CredentialsEntity)
    private readonly credentialRepository: Repository<CredentialsEntity>,
  ) {}

  async resetPassword(resetDto: ResetValidation): Promise<{
    message: string;
  }> {
    const credentials = await this.findByEmailOrFail(resetDto.email);

    if (credentials.recoveryCode !== resetDto.recoveryCode) {
      throw new BadRequestException('Invalid recovery code');
    }

    if (credentials.recoveryCodeExpires < new Date()) {
      throw new BadRequestException('Recovery code expired');
    }

    await this.updatePassword(credentials.id, resetDto.password);

    return {
      message: 'Password updated',
    };
  }

  async recovery(email: string): Promise<{
    message: string;
  }> {
    const credentials = await this.findByEmailOrFail(email);

    if (!credentials.password) {
      throw new BadRequestException(`Operator not registered`);
    }

    const recoveryCode = generateRecoveryCode();

    credentials.recoveryCode = recoveryCode;
    credentials.recoveryCodeExpires = new Date(
      Date.now() + 1000 * 60 * Number(process.env.RECOVERY_CODE_EXPIRES_IN),
    );

    await this.credentialRepository.save(credentials);

    this.mailService.sendChangePasswordCode(email, recoveryCode);

    return {
      message: `Recovery code: ${recoveryCode}`,
    };
  }

  async validateOperator(email: string, password: string): Promise<any> {
    const credentials = await this.credentialRepository.findOne({
      where: { email },
    });

    if (!credentials) {
      return null;
    }

    if (!credentials.password) {
      return null;
    }

    if (
      email === credentials.email &&
      (await bcrypt.compare(password, credentials.password))
    ) {
      const { password, ...result } = credentials;

      return result;
    }
    return null;
  }

  async login(operator: any) {
    const credentials = await this.credentialRepository.findOne({
      where: { email: operator.email },
    });

    const payload = { email: credentials.email, id: credentials.id };
    const accessToken = this.jwtService.sign(payload);

    credentials.accessToken = accessToken;

    this.credentialRepository.save(credentials);

    return {
      accessToken,
    };
  }

  async registerWithoutPassword(email: string) {
    const credentials = this.credentialRepository.create({
      email,
    });

    credentials.recoveryCode = generateRecoveryCode();
    credentials.recoveryCodeExpires = new Date(
      Date.now() +
        1000 * 60 * 60 * 24 * Number(process.env.REGISTER_CODE_EXPIRES_IN),
    );

    this.mailService.sendRegistrationCode(email, credentials.recoveryCode);

    await this.credentialRepository.save(credentials);
    return credentials;
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const credentials = this.credentialRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      registeredAt: new Date(),
    });

    await this.credentialRepository.save(credentials);
    return credentials;
  }

  async findByEmail(email: string): Promise<CredentialsEntity> {
    return this.credentialRepository.findOneBy({ email });
  }

  async findByEmailOrFail(email: string): Promise<CredentialsEntity> {
    const credentials = await this.credentialRepository.findOne({
      where: { email },
    });

    if (!credentials) {
      throw new BadRequestException('Credentials not found');
    }

    return credentials;
  }

  async findByIdOrFail(id: string): Promise<CredentialsEntity> {
    const credentials = await this.credentialRepository.findOneBy({ id });

    if (!credentials) {
      throw new BadRequestException('Credentials not found');
    }

    return credentials;
  }

  async updatePassword(id: string, password: string) {
    const credentials = await this.findByIdOrFail(id);

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.credentialRepository.update(id, {
      password: hashedPassword,
      recoveryCode: null,
      registeredAt: credentials.password
        ? credentials.registeredAt
        : new Date(),
    });
  }

  async updateEmail(id: number, email: string) {
    return this.credentialRepository.update(id, { email });
  }
}
