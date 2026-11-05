import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { BenefitInterface } from '../types/benefit.interface';

export class BenefitUpdateDto extends ParameterUpdateDto implements BenefitInterface {}
