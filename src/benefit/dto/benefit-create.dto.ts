import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { BenefitInterface } from '../types/benefit.interface';

export class BenefitCreateDto extends ParameterCreateDto implements BenefitInterface {}
