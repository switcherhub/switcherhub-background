import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OperatorEntity } from '../entities/operator.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperatorCreateByAdminValidation } from '../validation/operator-create-by-admin.validation';
import { AuthService } from 'src/auth/services/auth.service';
import { OperatorUpdateValidation } from '../validation/operator-update.validation';
import { OperatorRoleEnum } from '../types/operator-role.enum';
import { OperatorCreateValidation } from '../validation/operator-create.validation';
import { isUUID } from 'class-validator';

@Injectable()
export class OperatorService {
  constructor(
    @InjectRepository(OperatorEntity)
    private operatorRepository: Repository<OperatorEntity>,
    @Inject()
    private readonly authService: AuthService,
  ) {}

  async create(operator: OperatorCreateValidation): Promise<OperatorEntity> {
    const existedOperator = await this.findByEmail(operator.email);
    const existedAuth = await this.authService.findByEmail(operator.email);

    if (existedOperator || existedAuth) {
      throw new BadRequestException(
        `Operator with email ${operator.email} already exists`,
      );
    }

    const newAuth = await this.authService.registerWithoutPassword(
      operator.email,
    );

    operator.credentials = newAuth;

    const createdOperator: OperatorEntity =
      await this.operatorRepository.save(operator);

    return this.findByIdOrFail(createdOperator.id);
  }

  async createByAdmin(
    operator: OperatorCreateByAdminValidation,
  ): Promise<OperatorEntity> {
    const existedOperator = await this.findByEmail(operator.email);
    const existedAuth = await this.authService.findByEmail(operator.email);

    if (existedOperator || existedAuth) {
      throw new BadRequestException(
        `Operator with email ${operator.email} already exists`,
      );
    }

    const newAuth = await this.authService.register({
      email: operator.email,
      password: operator.password,
    });

    operator.credentials = newAuth;

    const createdOperator: OperatorEntity =
      await this.operatorRepository.save(operator);

    return this.findByIdOrFail(createdOperator.id);
  }

  async update(
    id: string,
    operator: OperatorUpdateValidation,
  ): Promise<OperatorEntity> {
    await this.findByIdOrFail(id);
    await this.operatorRepository.update(id, operator);
    return this.findByIdOrFail(id);
  }

  async find(): Promise<OperatorEntity[]> {
    return await this.operatorRepository.find({
      order: { deleted: 'ASC', createdAt: 'DESC' },
    });
  }

  async findByIdOrFail(id: string): Promise<OperatorEntity> {
    if (!isUUID(id)) {
      throw new BadRequestException('id must be a valid UUID');
    }

    const operator = await this.operatorRepository.findOne({ where: { id } });

    if (!operator) {
      throw new NotFoundException(`Operator with id ${id} not found`);
    }

    return operator;
  }

  async findByEmail(email: string): Promise<OperatorEntity> {
    return await this.operatorRepository.findOneBy({ email });
  }

  async findByEmailOrFail(email: string): Promise<OperatorEntity> {
    const operator = await this.operatorRepository.findOneBy({ email });

    if (!operator) {
      throw new NotFoundException(`Operator with email ${email} not found`);
    }

    return operator;
  }

  async delete(id: string, safe: boolean = true): Promise<OperatorEntity> {
    const operator = await this.findByIdOrFail(id);

    if (operator.role === OperatorRoleEnum.ADMIN && safe) {
      throw new BadRequestException('Cannot delete admin');
    }

    operator.deleted = true;

    await this.operatorRepository.save(operator);

    return this.findByIdOrFail(operator.id);
  }

  async restore(id: string): Promise<OperatorEntity> {
    const operator = await this.findByIdOrFail(id);

    operator.deleted = false;

    await this.operatorRepository.save(operator);

    return this.findByIdOrFail(operator.id);
  }
}
