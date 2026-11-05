import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import validator from 'validator';
import { UserAuthEntity } from '../user-auth/user-auth.entity';

@Injectable()
export class ValidatorService {
  constructor(
    @InjectRepository(UserAuthEntity)
    private readonly usersRepository: Repository<UserAuthEntity>,
  ) {}

  async validateEmail(email: string) {
    if (!validator.isEmail(email)) {
      throw new BadRequestException('Invalid email');
    }

    const user = await this.usersRepository.findOneBy({ email });

    if (user) {
      throw new BadRequestException(
        'User with this email already exists. Please login',
      );
    }
  }

  async validatePassword(password: string) {
    if (password.length < 3) {
      throw new BadRequestException(
        'Password must be at least 3 characters long',
      );
    }

    // if (!validator.isStrongPassword(password)) {
    //   throw new BadRequestException(
    //     'Password must contain at least one uppercase letter, one lowercase letter, one number and one symbol',
    //   );
    // }
  }
}
