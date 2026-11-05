import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthService } from 'src/user-auth/services/authorization.service';
import { ValidatorService } from 'src/user-auth/login-validate/validator.service';
import { UserAuthInterface } from 'src/user-auth/user-auth/user-auth.interface';
import { UserCreateValidation } from 'src/users/dto/user-create.validation';
import { UserService } from 'src/users/services/user.service';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { RegisterDto } from './register.dto';
import { WorkspaceService } from 'src/workspace/services/workspace.service';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly validatorService: ValidatorService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async register(register: RegisterDto): Promise<UserAuthInterface> {
    const user = await this.authService.findOneByEmail(register.email);
    if (user?.user) {
      throw new BadRequestException('User already exists');
    }

    await this.validatorService.validateEmail(register.email);
    await this.validatorService.validatePassword(register.password);

    try {
      register.email = register.email.replace(/\s+/g, '').toLowerCase();

      const createDto: UserCreateValidation = {
        firstName: register.firstName,
        lastName: register.lastName,
        email: register.email,
        phone: register.phone,
        activeRole: register.activeRole ?? UserRoleEnum.SWITCHER,
      };

      const newUser = await this.userService.create(createDto);

      return this.authService.register(
        register.email,
        register.password,
        newUser,
      );
    } catch (e) {
      throw new BadRequestException(e);
    }
  }
}
